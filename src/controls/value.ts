/**
 * @packageDocumentation
 * @module input-aspects
 */
import { EventSupply, EventSupply__symbol, eventSupplyOf, OnEvent, trackValue } from 'fun-events';
import { InControl } from '../control';

/**
 * Constructs simple input control.
 *
 * This control does not handle actual user input. Instead, it maintains the value set programmatically.
 *
 * @category Control
 * @typeparam Value  Input value type.
 * @param initial  Initial input value.
 *
 * @returns New input control.
 */
export function inValue<Value>(initial: Value): InControl<Value> {

  const it = trackValue(initial);

  class InValue extends InControl<Value> {

    get on(): OnEvent<[Value, Value]> {
      return it.on;
    }

    get [EventSupply__symbol](): EventSupply {
      return eventSupplyOf(it);
    }

    get it(): Value {
      return it.it;
    }

    set it(value: Value) {
      it.it = value;
    }

  }

  return new InValue();
}
