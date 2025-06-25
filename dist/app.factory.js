
// Auto-generated factory for App
import { App } from './app.js';

export const AppFactory = {
  selector: '#app',
  template: `
    <div style="background: indianred; padding: 15px; display: flex; flex-direction: column; gap: 15px">
        <h1>Microng test v2{{appSignal.get()}}</h1>
        <button (click)="appSignalIncrement()">appSignal increment</button>
        <counter-component appSignalInput="appSignal"></counter-component>
        <counter-component></counter-component>
        <div>Rendered on: {{ new Date().toISOString() }}</div>
    </div>
    </div>
  `,
  inputs: [],
  constructorParams: [],
  className: App,
  create: function() {
    const deps = this.constructorParams.map(dep => {
      return globalThis.resolveDependency(dep);
    });
    return new this.className(...deps);
  }
};
