// src/counter.ts
import { Component } from './framework.js';
import { CounterService } from './counter-service.js';

@Component({
    selector: 'counter-component',
    template: `
    <div>
      <p>Count: {{getCount() * 10}}</p>
      <button (click)="increment()">Increment</button>
      <p>Count2: {{this.counterService.getCount2()}}</p>
      <button (click)="increment2()">Increment2</button>
      <div>{{appSignalInput?.get()}}</div>
      <button (click)="appSignalIncrement()">appSignalInput increment</button>
    </div>
  `,
    inputs: ['appSignalInput']
})
export class Counter {
    appSignalInput;

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
        this.counterService.increment2();
        // rerender after increment for simplicity, in real would be reactive signal
        // We’ll handle rerender in runtime later
    }
}
