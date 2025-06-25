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
      <div>ciao{{varInput}}</div>
    </div>
  `,
})
export class Counter {
    varInput = 1;

    constructor(private counterService: CounterService) {}

    ngOnInit() {
        console.log('CounterComponent initialized');
    }

    getCount() {
        return this.counterService.getCount();
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
