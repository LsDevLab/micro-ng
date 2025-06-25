// main.ts
import { registerFactory, bootstrap } from './dist/runtime.js';
import { AppFactory } from './dist/app.factory.js';
import { CounterFactory } from './dist/counter.factory.js';
import { CounterServiceFactory } from './dist/counter-service.factory.js';

// Import actual classes into globalThis for DI lookup
import { CounterService } from './dist/counter-service.js';
import { Counter } from './dist/counter.js';
import { App } from './dist/app.js';

globalThis.CounterService = CounterService;
globalThis.Counter = Counter;
globalThis.App = App;

registerFactory(AppFactory);
registerFactory(CounterFactory);
registerFactory(CounterServiceFactory);

document.addEventListener('DOMContentLoaded', () => {
    bootstrap(AppFactory);
});
