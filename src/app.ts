// src/app.ts
import { Component } from './framework.js';
import {signal} from "./reactivity";

@Component({
    selector: '#app',
    template: `
    <h1>Mini Angular Clone (TS + DI) {{appSignal.get()}}</h1>
    <counter-component appSignalInput="appSignal"></counter-component>
  `,
})
export class App {
    appSignal = signal(178)
}
