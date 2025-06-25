type Subscriber = () => void;

export function signal<T>(initialValue: T) {
    let value = initialValue;
    const subscribers = new Set<Subscriber>();

    // The signal object acts as the dependency
    const dep = {
        subscribe(effect: Subscriber) {
            subscribers.add(effect);
            effect.dependencies.add(dep);
        },
        unsubscribe(effect: Subscriber) {
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

    function set(newValue: T) {
        if (newValue !== value) {
            value = newValue;
            dep.notify();
        }
    }

    return { get, set, getUntracked };
}

// Effect system

let currentEffect: Subscriber | null = null;

export function effect(fn: Subscriber) {
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

function cleanup(effectFn: Subscriber & { dependencies: Set<any> }) {
    effectFn.dependencies.forEach(dep => {
        dep.unsubscribe(effectFn);
    });
    effectFn.dependencies.clear();
}
