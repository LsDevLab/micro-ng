// src/counter-service.ts
import { Injectable, } from './framework.js';
import {signal} from "./reactivity.js";

@Injectable
export class CounterService {
    count = signal(0);
    count2 = signal(3);

    getCount() {
        return this.count.get();
    }
    getCount2() {
        return this.count2.get();
    }

    increment() {
        this.count.set(this.count.getUntracked()+10);
    }

    increment2() {
        this.count2.set(this.count2.getUntracked()+3);
    }
}
