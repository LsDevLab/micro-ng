// dist/runtime.ts
import { effect } from './reactivity';
const injectableInstances = new Map();
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
const componentFactories = new Map();
export function registerFactory(factory) {
    componentFactories.set(factory.selector, factory);
}
function parseTemplate(template, componentInstance) {
    return template.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expr) => {
        try {
            // Evaluate expr as JS with componentInstance as `this`
            const fn = new Function(`with(this) { return ${expr} }`);
            const val = fn.call(componentInstance);
            return val == null ? '' : val;
        }
        catch (e) {
            console.error('Error evaluating expression:', expr, e);
            return '';
        }
    });
}
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
                        // no explicit render call needed anymore!
                    }
                });
            }
        });
    });
}
function mountComponent(factory, el, parentInstance = null) {
    const componentInstance = factory.create();
    // Assign inputs from evaluated expressions
    if (factory.inputs) {
        factory.inputs.forEach(inputName => {
            if (el.hasAttribute(inputName)) {
                const expr = el.getAttribute(inputName);
                if (parentInstance) {
                    // Evaluate the expression in the parent's context
                    try {
                        // Use 'with' to make parentInstance properties accessible
                        const value = new Function('with(this) { return ' + expr + '}').call(parentInstance);
                        componentInstance[inputName] = value;
                    }
                    catch (e) {
                        console.error(`Failed to evaluate input expression: ${expr}`, e);
                    }
                }
                else {
                    // No parent context, fallback to string
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
                    if (placeholder)
                        placeholder.replaceWith(childEl);
                });
            });
        }
        else {
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
        if (selector === factory.selector)
            return; // skip self
        el.querySelectorAll(selector).forEach(childEl => {
            mountComponent(childFactory, childEl, componentInstance);
        });
    });
}
export function bootstrap(factory) {
    const rootEl = document.querySelector(factory.selector);
    if (!rootEl) {
        throw new Error(`Root element not found for selector ${factory.selector}`);
    }
    mountComponent(factory, rootEl);
}
globalThis.resolveDependency = resolveDependency;
