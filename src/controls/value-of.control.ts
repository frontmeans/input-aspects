/**
 * @packageDocumentation
 * @module input-aspects
 */
import { EventSupply, eventSupply, EventSupply__symbol, OnEvent } from 'fun-events';
import { InControl } from '../control';

/**
 * Constructs input control with the same value as another one.
 *
 * The constructed control does not inherit any aspects from original one.
 *
 * @param control  Original control containing the value.
 *
 * @returns New input control that accesses the value of original `control`.
 */
export function inValueOf<Value>(control: InControl<Value>): InControl<Value> {

  let supply: EventSupply | undefined;

  class InSameValue extends InControl<Value> {

    get it(): Value {
      return control.it;
    }

    set it(value: Value) {
      control.it = value;
    }

    get on(): OnEvent<[Value, Value]> {
      return control.on;
    }

    get [EventSupply__symbol](): EventSupply {
      return supply || (supply = eventSupply().needs(control));
    }

  }

  return new InSameValue();
}
