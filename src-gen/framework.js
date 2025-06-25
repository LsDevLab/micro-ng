// src/framework.ts
export function Component(metadata) {
    return function (target) {
        target.__componentMetadata = metadata;
    };
}
export function Injectable(target) {
    target.__injectable = true;
}
