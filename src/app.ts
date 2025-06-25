// src/app.ts
import { Component } from './framework.js';

@Component({
    selector: '#app',
    template: `
    <h1>Mini Angular Clone (TS + DI)</h1>
    <counter-component varInput="someVar + 10"></counter-component>
  `,
})
export class App {
    someVar = 156
}
