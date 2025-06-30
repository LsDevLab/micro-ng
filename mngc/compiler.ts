import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.resolve('./src');
const outDir = path.resolve('./dist-dev');
const rootIndexPath = path.resolve('./index.html');
const genIndexPath = path.join(outDir, 'index.html');
const genEntrypointPath = path.join(outDir, 'entrypoint.js');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const srcFiles = findAllTSFiles(srcDir);

const discoveredFactories: {
    name: string;          // basename, eg 'app'
    factoryVarName: string; // eg 'AppFactory'
    className: string;     // eg 'App'
}[] = [];

srcFiles.forEach(file => {
    processFile(file);
    transpileToJS(file);
});

generateIndexHtml();
generateEntrypoint(discoveredFactories, 'AppFactory');



// ------------------------
// Functions
// ------------------------

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
    const basename = path.basename(filePath, '.ts');

    // Track factories for entrypoint generation
    discoveredFactories.push({
        name: basename,
        factoryVarName: `${className}Factory`,
        className: className,
    });

    const constructorParams = getConstructorParams(node);

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

    // Track factories for entrypoint generation
    discoveredFactories.push({
        name: basename,
        factoryVarName: `${className}Factory`,
        className: className,
    });

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


// ---------------------------------------------------
// New: generate dist-dev/index.html with script injection
// ---------------------------------------------------
function generateIndexHtml() {
    const html = fs.readFileSync(rootIndexPath, 'utf-8');
    const scriptTag = `<script type="module" src="./entrypoint.js"></script>`;

    // Insert before </body>
    const newHtml = html.replace(
      /<\/body>/i,
      `${scriptTag}\n</body>`
    );

    fs.writeFileSync(genIndexPath, newHtml, 'utf-8');
    console.log('[AOT] Generated dist-dev/index.html');
}

// ---------------------------------------------------
// New: generate dist-dev/entrypoint.js importing & bootstrapping factories
// ---------------------------------------------------
function generateEntrypoint(factories: typeof discoveredFactories, mainFactoryName: string) {
    const lines = [
        `import { registerFactory, bootstrap } from './runtime.js';`,
    ];

    // Imports factories and classes
    factories.forEach(({ name, factoryVarName, className }) => {
        lines.push(`import { ${factoryVarName} } from './${name}.factory.js';`);
    });
    factories.forEach(({ name, className }) => {
        lines.push(`import { ${className} } from './${name}.js';`);
    });

    // Attach classes to globalThis
    factories.forEach(({ className }) => {
        lines.push(`globalThis.${className} = ${className};`);
    });

    // Register all factories
    factories.forEach(({ factoryVarName }) => {
        lines.push(`registerFactory(${factoryVarName});`);
    });

    // Bootstrap main component
    lines.push(`bootstrap(${mainFactoryName});`);

    const content = lines.join('\n') + '\n';

    fs.writeFileSync(genEntrypointPath, content, 'utf-8');
    console.log('[AOT] Generated dist-dev/entrypoint.js');
}

