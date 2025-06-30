// src/app.ts
import { Component } from './framework.js';
import {signal} from "./reactivity";

@Component({
    selector: '#app',
    template: `
    <div style="background: indianred; padding: 15px; display: flex; flex-direction: column; gap: 15px">
    
        <h1>Microng test v5.1 {{appSignal.get()}}</h1>
         @if[appSignal.get() > 100 && appSignal.get() < 130] {
            <div>Rendered on: {{ new Date().toISOString() }} </div>
            @if[appSignal.get() > 113 && appSignal.get() < 118] {
                <div>Rendered2 on: {{ new Date().toISOString() }} </div>
            } @else {
                <div>No component rendered 2</div>
            }
        } @else {
            <div>No component rendered</div>
        }
        <button (click)="appSignalIncrement()">appSignal increment</button>
        <counter-component appSignalInput="appSignal"></counter-component>
        <counter-green-component></counter-green-component>
        <counter-component></counter-component>
       
    </div>
  `,
})
export class App {
    appSignal = signal(98)

    appSignalIncrement(){
        this.appSignal.set(this.appSignal.getUntracked()+2)
    }
}
