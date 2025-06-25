// mngc/compiler.ts
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.resolve('./src');
const outDir = path.resolve('./src-gen');

// Recursively find all .ts files in src/
function findAllTSFiles(dir: string): string[] {
    let results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(findAllTSFiles(fullPath));
        } else if (entry.isFile() && fullPath.endsWith('.ts')) {
            results.push(fullPath);
        }
    }

    return results;
}

// Ensure dist/ exists
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const srcFiles = findAllTSFiles(srcDir);

srcFiles.forEach(file => {
    processFile(file);
    transpileToJS(file);
});

// -----------------------------------
// Factory generation logic
// -----------------------------------

function processFile(filePath: string) {
    const source = ts.createSourceFile(
        filePath,
        fs.readFileSync(filePath, 'utf-8'),
        ts.ScriptTarget.ESNext,
        true
    );

    source.forEachChild(node => {
        if (ts.isClassDeclaration(node)) {
            const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
            if (!decorators) return;

            decorators.forEach(decorator => {
                const expr = decorator.expression;
                if (ts.isCallExpression(expr)) {
                    const name = expr.expression.getText();
                    if (name === 'Component') {
                        processComponent(node, expr.arguments[0], filePath);
                    }
                    if (name === 'Injectable') {
                        processInjectable(node, filePath);
                    }
                } else if (ts.isIdentifier(expr)) {
                    const name = expr.getText();
                    if (name === 'Injectable') {
                        processInjectable(node, filePath);
                    }
                }
            });
        }
    });
}

function processComponent(
    node: ts.ClassDeclaration,
    arg: ts.Expression,
    filePath: string
) {
    if (!ts.isObjectLiteralExpression(arg)) return;

    const selector = getLiteralValue(arg, 'selector');
    const template = getLiteralValue(arg, 'template');
    const inputs = getStringArrayValue(arg, 'inputs');
    const className = node.name?.getText() || 'Unknown';

    const constructorParams = getConstructorParams(node);
    const basename = path.basename(filePath, '.ts');

    const factoryCode = `
// Auto-generated factory for ${className}
import { ${className} } from './${basename}.js';

export const ${className}Factory = {
  selector: '${selector}',
  template: \`${template}\`,
  inputs: [${inputs.map(i => `'${i}'`).join(', ')}],
  constructorParams: [${constructorParams.map(p => `'${p}'`).join(', ')}],
  className: ${className},
  create: function() {
    const deps = this.constructorParams.map(dep => {
      return globalThis.resolveDependency(dep);
    });
    return new this.className(...deps);
  }
};
`;

    fs.writeFileSync(path.join(outDir, `${basename}.factory.js`), factoryCode);
}

function processInjectable(node: ts.ClassDeclaration, filePath: string) {
    const className = node.name?.getText() || 'Unknown';
    const basename = path.basename(filePath, '.ts');

    const factoryCode = `
// Auto-generated factory for ${className}
import { ${className} } from './${basename}.js';

export const ${className}Factory = {
  create: () => new ${className}()
};
`;

    fs.writeFileSync(path.join(outDir, `${basename}.factory.js`), factoryCode);
}

function getLiteralValue(obj: ts.ObjectLiteralExpression, key: string): string {
    const prop = obj.properties.find(
        p => ts.isPropertyAssignment(p) && p.name?.getText() === key
    );
    if (!prop || !ts.isPropertyAssignment(prop)) return '';

    const init = prop.initializer;
    if (ts.isStringLiteral(init)) {
        return init.text;
    }
    if (ts.isNoSubstitutionTemplateLiteral(init)) {
        return init.text;
    }
    if (ts.isTemplateExpression(init)) {
        // Optional: Warn or handle more complex interpolated templates
        return init.getText();
    }

    return '';
}

function getStringArrayValue(obj: ts.ObjectLiteralExpression, key: string): string[] {
    const prop = obj.properties.find(
        p => ts.isPropertyAssignment(p) && p.name?.getText() === key
    );
    if (!prop || !ts.isPropertyAssignment(prop)) return [];

    const init = prop.initializer;
    if (ts.isArrayLiteralExpression(init)) {
        return init.elements
            .filter(ts.isStringLiteral)
            .map(el => el.text);
    }

    return [];
}

function getConstructorParams(node: ts.ClassDeclaration): string[] {
    const ctor = node.members.find(ts.isConstructorDeclaration) as
        | ts.ConstructorDeclaration
        | undefined;
    if (!ctor || !ctor.parameters) return [];
    return ctor.parameters.map(p => p.type ? p.type.getText() : 'any');
}

// Transpile TS → JS
function transpileToJS(filePath: string) {
    const tsCode = fs.readFileSync(filePath, 'utf-8');
    const transpiled = ts.transpileModule(tsCode, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            esModuleInterop: true,
        },
        fileName: filePath,
    });

    const outputPath = path.join(
        outDir,
        path.basename(filePath).replace(/\.ts$/, '.js')
    );

    fs.writeFileSync(outputPath, transpiled.outputText);
}
