// src/framework.ts
export function Component(metadata: { selector: string; template: string }) {
    return function (target: any) {
        target.__componentMetadata = metadata;
    };
}

export function Injectable(target: any) {
    target.__injectable = true;
}
