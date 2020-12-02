/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import {
  EventReceiver,
  EventSupply,
  EventSupply__symbol,
  eventSupplyOf,
  OnEvent,
  trackValue,
  ValueTracker,
} from '@proc7ts/fun-events';
import { InControl } from '../control';
import { InConverter } from '../converter';
import { AbstractInControl } from './abstract.control';

class InValueControl<Value> extends AbstractInControl<Value> {

  private readonly _it: ValueTracker<Value>;

  constructor(
      initial: Value,
      opts: {
        readonly aspects?: InConverter.Aspect<Value> | readonly InConverter.Aspect<Value>[];
      },
  ) {
    super(opts);
    this._it = trackValue(initial);
  }

  get [EventSupply__symbol](): EventSupply {
    return eventSupplyOf(this._it);
  }

  get it(): Value {
    return this._it.it;
  }

  set it(value: Value) {
    this._it.it = value;
  }

  on(): OnEvent<[Value, Value]>;
  on(receiver: EventReceiver<[Value, Value]>): EventSupply;
  on(receiver?: EventReceiver<[Value, Value]>): OnEvent<[Value, Value]> | EventSupply {
    return (this.on = this._it.on().F)(receiver);
  }

}
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
  return new InValueControl(initial, { aspects });
}
