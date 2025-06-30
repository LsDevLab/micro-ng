import { effect } from './reactivity';

const injectableInstances = new Map();
const componentFactories = new Map();

export function resolveDependency(depName) {
    if (injectableInstances.has(depName)) {
        return injectableInstances.get(depName);
    }
    const DepClass = globalThis[depName];
    if (!DepClass) {
        throw new Error(`Dependency '${depName}' not found in globalThis`);
    }
    const instance = new DepClass();
    injectableInstances.set(depName, instance);
    return instance;
}

export function registerFactory(factory) {
    componentFactories.set(factory.selector, factory);
}

// -----------------------------------------------
// 🔁 Control Flow Template Rewrite
// -----------------------------------------------
function rewriteControlFlow(template: string): string {
    // STEP 1: Protect interpolation blocks (e.g., {{ ... }})
    const excludedBlocks: string[] = [];
    const placeholder = '__INTERPOLATION_BLOCK__';

    template = template.replace(/\{\{[\s\S]*?\}\}/g, match => {
        excludedBlocks.push(match);
        return `${placeholder}${excludedBlocks.length - 1}__`;
    });

    // STEP 2: Parse template into control-flow aware structure
    const rewritten = parseControlFlow(template);

    // STEP 3: Restore interpolations
    return rewritten.replace(new RegExp(`${placeholder}(\\d+)__`, 'g'), (_, i) => excludedBlocks[+i]);
}

function parseControlFlow(template: string): string {
    const tokens = tokenize(template);
    const [output] = parseTokens(tokens);
    return output;
}

function tokenize(input: string): string[] {
    let tokens: string[] = [];
    const regex = /(@if\s*\[[^\]]*\]|@for\s*\[[^\]]*\]|@else|@empty|\{|\})/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(input)) !== null) {
        if (match.index > lastIndex) {
            tokens.push(input.slice(lastIndex, match.index));
        }
        tokens.push(match[0]);
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < input.length) {
        tokens.push(input.slice(lastIndex));
    }

    tokens = tokens.filter(t => t.trim() !== ''); // Remove empty tokens

    return tokens;
}


function parseTokens(tokens: string[], pos = 0): [string, number] {
    let output = '';
    while (pos < tokens.length) {
        const token = tokens[pos];

        if (token.startsWith('@if')) {
            // Extract condition inside [ ]
            const condMatch = token.match(/@if\s*\[(.*?)\]/);
            if (!condMatch) throw new Error(`Invalid @if syntax at token ${pos}`);
            const cond = condMatch[1].trim();

            pos += 1; // move past @if token
            if (tokens[pos] !== '{') throw new Error(`Expected '{' after @if at token ${pos}`);
            pos += 1; // skip '{'

            const [truthy, nextPos] = parseTokens(tokens, pos);
            pos = nextPos;

            let falsy = '';
            if (tokens[pos] === '@else') {
                pos += 1; // skip '@else'
                if (tokens[pos] !== '{') throw new Error(`Expected '{' after @else at token ${pos}`);
                pos += 1; // skip '{'

                const [falsyBlock, nextElsePos] = parseTokens(tokens, pos);
                falsy = `<ng-else>${falsyBlock}</ng-else>`;
                pos = nextElsePos;
            }

            output += `<ng-if condition="${cond}">${truthy}\n</ng-if>${falsy}`;
        }

        else if (token.startsWith('@for')) {
            const forMatch = token.match(/@for\s*\[\s*(\w+)\s+of\s+(.*?)\s*\]/);
            if (!forMatch) throw new Error(`Invalid @for syntax at token ${pos}`);
            const [, item, list] = forMatch;

            pos += 1; // skip @for
            if (tokens[pos] !== '{') throw new Error(`Expected '{' after @for at token ${pos}`);
            pos += 1; // skip '{'

            const [block, nextPos] = parseTokens(tokens, pos);
            pos = nextPos;

            let empty = '';
            if (tokens[pos] === '@empty') {
                pos += 1; // skip '@empty'
                if (tokens[pos] !== '{') throw new Error(`Expected '{' after @empty at token ${pos}`);
                pos += 1; // skip '{'

                const [emptyBlock, nextEmptyPos] = parseTokens(tokens, pos);
                empty = `<ng-empty>${emptyBlock}</ng-empty>`;
                pos = nextEmptyPos;
            }

            output += `<ng-for item="${item}" items="${list}">${block}</ng-for>${empty}`;
        }

        else if (token === '}') {
            // End of current block, return output and position after '}'
            return [output, pos + 1];
        }

        else {
            // Plain token: append and move on
            output += token;
            pos++;
        }
    }

    return [output, pos];
}



// -----------------------------------------------
// 🧠 Template Expression Evaluation
// -----------------------------------------------
function parseTemplate(template: string, componentInstance: any): string {
    const rewritten = rewriteControlFlow(template);

    // evaluate expressions in control flow statements
    // evaluate control flow statements by level: if a condition is not true the content must non be rendered and the children must not be evaluated
    const container = document.createElement('div');
    container.innerHTML = rewritten;

    // 3. Evaluate control flow: remove/replace based on actual data
    processControlFlow(container, componentInstance);

    // Step 3: Recursively interpolate only visible nodes
    [...container.childNodes].forEach(node => {
        renderBindings(node, componentInstance);
    });

    return container.innerHTML;
}

// -----------------------------------------------
// 🔄 Binding Interpolation Recursively
// -----------------------------------------------
function renderBindings(node: Node, ctx: any): Node {
    if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = node.textContent?.replace(/\{\{(.*?)\}\}/g, (_, expr) => {
            try {
                return new Function('with(this) { return ' + expr + ' }').call(ctx);
            } catch (e) {
                return '';
            }
        }) ?? '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        [...node.childNodes].forEach(n => renderBindings(n, ctx));
    }
    return node;
}

// -----------------------------------------------
// 🔁 ng-if / ng-else / ng-for Runtime Logic
// -----------------------------------------------
function processControlFlow(el: Element | DocumentFragment, ctx: any) {
    if (!(el instanceof Element || el instanceof DocumentFragment)) return;

    const children = Array.from(el.childNodes);

    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (!(node instanceof Element)) continue;

        const tag = node.tagName.toLowerCase();

        console.log(`[processControlFlow] Processing <${tag}>`, node.getAttribute ? `condition="${node.getAttribute('condition')}"` : '');

        if (tag === 'ng-if') {
            const cond = node.getAttribute('condition')!;
            let result = false;
            try {
                result = new Function('with(this) { return ' + cond + ' }').call(ctx);
                console.log(`[ng-if] Condition evaluated: "${cond}" =>`, result);
            } catch (e) {
                console.warn('[ng-if] Condition evaluation error:', e);
            }

            const elseEl = (node.nextElementSibling && node.nextElementSibling.tagName.toLowerCase() === 'ng-else')
              ? node.nextElementSibling
              : null;

            if (result) {
                const frag = document.createDocumentFragment();
                const clone = node.cloneNode(true);
                processControlFlow(clone, ctx);
                // Optionally render bindings here if needed:
                // renderBindings(clone, ctx);
                frag.appendChild(clone);
                node.replaceWith(frag);
                if (elseEl) {
                    elseEl.remove();
                }
            } else {
                if (elseEl) {
                    const frag = document.createDocumentFragment();
                    const clone = elseEl.cloneNode(true);
                    processControlFlow(clone, ctx);
                    renderBindings(clone, ctx);
                    frag.appendChild(clone);
                    elseEl.replaceWith(frag);
                }
                node.remove();
            }

            // IMPORTANT: skip next node if it was <ng-else>
            if (elseEl) {
                // Need to skip one more index in the parent loop
                i++;
            }
        } else if (tag === 'ng-for') {
            const item = node.getAttribute('item')!;
            const listExpr = node.getAttribute('items')!;
            let items = [];
            try {
                items = new Function('with(this) { return ' + listExpr + ' }').call(ctx) || [];
                console.log(`[ng-for] Items for "${item}" from "${listExpr}":`, items);
            } catch (e) {
                console.warn('[ng-for] Items evaluation error:', e);
            }

            const emptyEl = (i + 1 < children.length && children[i + 1] instanceof Element && children[i + 1].tagName.toLowerCase() === 'ng-empty')
              ? children[i + 1]
              : null;

            if (items.length === 0 && emptyEl) {
                console.log('[ng-for] Empty items: rendering <ng-empty>');
                const frag = document.createDocumentFragment();
                emptyEl.childNodes.forEach(n => {
                    console.log('[ng-for] Cloning and rendering <ng-empty> child node:', n.nodeName);
                    const clone = n.cloneNode(true);
                    const bound = renderBindings(clone, ctx);
                    processControlFlow(bound, ctx);
                    frag.appendChild(bound);
                });
                emptyEl.replaceWith(frag);
                node.remove();
                i++; // skip emptyEl in iteration
            } else {
                console.log('[ng-for] Rendering items');
                const frag = document.createDocumentFragment();
                items.forEach(val => {
                    const scope = { ...ctx, [item]: val };
                    node.childNodes.forEach(n => {
                        console.log(`[ng-for] Cloning and rendering item child node:`, n.nodeName);
                        const clone = n.cloneNode(true);
                        const bound = renderBindings(clone, scope);
                        processControlFlow(bound, scope);
                        frag.appendChild(bound);
                    });
                });
                node.replaceWith(frag);
                if (emptyEl) {
                    console.log('[ng-for] Removing paired <ng-empty> element');
                    emptyEl.remove();
                    i++; // skip emptyEl in iteration
                }
            }

        } else {
            // Recurse into other elements
            processControlFlow(node, ctx);
        }
    }
}





// -----------------------------------------------
// 📌 Event Binding
// -----------------------------------------------
function bindEvents(rootEl, componentInstance, rerender) {
    rootEl.querySelectorAll('*').forEach(el => {
        [...el.attributes].forEach(attr => {
            const match = attr.name.match(/^\((.+)\)$/);
            if (match) {
                const eventName = match[1];
                const methodName = attr.value.replace(/\(\)$/, '');
                el.addEventListener(eventName, e => {
                    if (typeof componentInstance[methodName] === 'function') {
                        componentInstance[methodName](e);
                    }
                });
            }
        });
    });
}

// -----------------------------------------------
// 🧱 Component Mount Logic
// -----------------------------------------------
function mountComponent(factory, el, parentInstance = null) {
    const componentInstance = factory.create();

    // Handle @Input
    if (factory.inputs) {
        factory.inputs.forEach(inputName => {
            if (el.hasAttribute(inputName)) {
                const expr = el.getAttribute(inputName);
                if (parentInstance) {
                    try {
                        const val = new Function('with(this) { return ' + expr + '}').call(parentInstance);
                        componentInstance[inputName] = val;
                    } catch {}
                } else {
                    componentInstance[inputName] = expr;
                }
            }
        });
    }

    const childSelectors = [...componentFactories.keys()].filter(s => s !== factory.selector);
    let isFirstRender = true;

    const render = () => {
        if (!isFirstRender) {
            // Save current child components before rendering parent
            const preservedChildren = {};
            childSelectors.forEach(selector => {
                preservedChildren[selector] = [];
                el.querySelectorAll(selector).forEach(childEl => {
                    preservedChildren[selector].push(childEl);
                });
            });

            // Replace child component tags with placeholders in template
            let rendered = factory.template;
            childSelectors.forEach(selector => {
                const regex = new RegExp(`<${selector}[^>]*>.*?<\\/${selector}>`, 'gs');
                rendered = rendered.replace(regex, `<div data-child="${selector}"></div>`);
            });

            rendered = parseTemplate(rendered, componentInstance);
            el.innerHTML = rendered;

            // Restore preserved child components
            Object.entries(preservedChildren).forEach(([selector, elements]) => {
                elements.forEach(childEl => {
                    const placeholder = el.querySelector(`div[data-child="${selector}"]`);
                    if (placeholder) placeholder.replaceWith(childEl);
                });
            });
        } else {
            // First render: just render template normally without placeholders
            const rendered = parseTemplate(factory.template, componentInstance);
            el.innerHTML = rendered;
            isFirstRender = false;
        }

        bindEvents(el, componentInstance, render);
    };

    // Setup reactive effect for this component only
    effect(render);

    if (typeof componentInstance.ngOnInit === 'function') {
        componentInstance.ngOnInit();
    }

    // Recursively mount nested components
    componentFactories.forEach((childFactory, selector) => {
        if (selector === factory.selector) return; // skip self
        el.querySelectorAll(selector).forEach(childEl => {
            mountComponent(childFactory, childEl, componentInstance);
        });
    });
}

// -----------------------------------------------
// 🚀 Bootstrap Root Component
// -----------------------------------------------
export function bootstrap(factory) {
    const rootEl = document.querySelector(factory.selector);
    if (!rootEl) {
        throw new Error(`Root element not found for selector ${factory.selector}`);
    }
    mountComponent(factory, rootEl);
}

// Expose DI resolver globally
globalThis.resolveDependency = resolveDependency;
