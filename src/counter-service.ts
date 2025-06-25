// src/counter-service.ts
import { Injectable, } from './framework.js';
import {signal} from "./reactivity.js";

@Injectable
export class CounterService {
    count = signal(0);

    getCount() {
        return this.count.get();
    }

    increment() {
        this.count.set(this.count.getUntracked()+10);
    }


}
