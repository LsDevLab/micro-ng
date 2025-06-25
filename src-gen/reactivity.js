export function signal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();
    // The signal object acts as the dependency
    const dep = {
        subscribe(effect) {
            subscribers.add(effect);
            effect.dependencies.add(dep);
        },
        unsubscribe(effect) {
            subscribers.delete(effect);
        },
        notify() {
            // Notify subscribers safely (clone to avoid mutation during iteration)
            Array.from(subscribers).forEach(effect => effect());
        }
    };
    function getUntracked() {
        return value;
    }
    function get() {
        if (currentEffect) {
            dep.subscribe(currentEffect);
        }
        return value;
    }
    function set(newValue) {
        if (newValue !== value) {
            value = newValue;
            dep.notify();
        }
    }
    return { get, set, getUntracked };
}
// Effect system
let currentEffect = null;
export function effect(fn) {
    // Wrap the effect so we can track dependencies and cleanup
    const effectFn = () => {
        cleanup(effectFn);
        currentEffect = effectFn;
        fn();
        currentEffect = null;
    };
    // Track dependencies here: Set of dep objects (signals)
    effectFn.dependencies = new Set();
    effectFn();
    return effectFn;
}
function cleanup(effectFn) {
    effectFn.dependencies.forEach(dep => {
        dep.unsubscribe(effectFn);
    });
    effectFn.dependencies.clear();
}
