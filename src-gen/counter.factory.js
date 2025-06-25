
// Auto-generated factory for Counter
import { Counter } from './counter.js';

export const CounterFactory = {
  selector: 'counter-component',
  template: `
    <div style="background: dodgerblue; padding: 15px; ">
      <p>Count: {{getCount() * 10}}</p>
      <button (click)="increment()">Increment</button>
      <p>Count2: {{this.count2.get()}}</p>
      <button (click)="increment2()">Increment2</button>
      <div>{{appSignalInput?.get()}}</div>
      <button (click)="appSignalIncrement()">appSignalInput increment</button>
      <div>Rendered on: {{ new Date().toISOString() }}</div>
    </div>
  `,
  inputs: ['appSignalInput'],
  constructorParams: ['CounterService'],
  className: Counter,
  create: function() {
    const deps = this.constructorParams.map(dep => {
      return globalThis.resolveDependency(dep);
    });
    return new this.className(...deps);
  }
};
