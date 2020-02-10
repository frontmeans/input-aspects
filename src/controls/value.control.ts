/**
 * @packageDocumentation
 * @module input-aspects
 */
import { EventSupply, EventSupply__symbol, eventSupplyOf, OnEvent, trackValue } from 'fun-events';
import { InControl } from '../control';
import { InConverter } from '../converter';
import { AbstractInControl } from './abstract.control';

/**
 * Constructs simple input control.
 *
 * This control does not handle actual user input. Instead, it maintains the value set programmatically.
 *
 * @category Control
 * @typeparam Value  Input value type.
 * @param initial  Initial input value.
 * @param aspects  Input aspects applied by default. These are aspect converters to constructed control
 * from the {@link inValueOf same-valued one}.
 *
 * @returns New input control.
 */
export function inValue<Value>(
    initial: Value,
    {
      aspects,
    }: {
      readonly aspects?: InConverter.Aspect<Value> | readonly InConverter.Aspect<Value>[];
    } = {},
): InControl<Value> {

  const it = trackValue(initial);

  class InValue extends AbstractInControl<Value> {

    constructor() {
      super({ aspects });
    }

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
