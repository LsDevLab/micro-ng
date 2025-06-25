// src/app.ts
import { Component } from './framework.js';
import {signal} from "./reactivity";

@Component({
    selector: '#app',
    template: `
    <div style="background: indianred; padding: 15px; display: flex; flex-direction: column; gap: 15px">
        <h1>Microng test v4 {{appSignal.get()}}</h1>
        <button (click)="appSignalIncrement()">appSignal increment</button>
        <counter-component appSignalInput="appSignal"></counter-component>
        <counter-component></counter-component>
        <div>Rendered on: {{ new Date().toISOString() }}</div>
    </div>
    </div>
  `,
})
export class App {
    appSignal = signal(178)

    appSignalIncrement(){
        this.appSignal.set(this.appSignal.getUntracked()+2)
    }
}
