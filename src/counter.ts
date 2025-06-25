// src/counter.ts
import { Component } from './framework.js';
import { CounterService } from './counter-service.js';
import {signal} from "./reactivity";

@Component({
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
    inputs: ['appSignalInput']
})
export class Counter {
    appSignalInput;

    count2 = signal(3);

    constructor(private counterService: CounterService) {}

    ngOnInit() {
        console.log('CounterComponent initialized');
    }

    getCount() {
        return this.counterService.getCount();
    }

    appSignalIncrement(){
        this.appSignalInput?.set(this.appSignalInput?.getUntracked()+1)
    }

    increment(val) {
        this.counterService.increment();
        // rerender after increment for simplicity, in real would be reactive signal
        // We’ll handle rerender in runtime later
    }
    increment2(val) {
        this.count2.set(this.count2.getUntracked()+2);
        // rerender after increment for simplicity, in real would be reactive signal
        // We’ll handle rerender in runtime later
    }
}
