/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import { EventReceiver, EventSupply, eventSupply, EventSupply__symbol, OnEvent } from '@proc7ts/fun-events';
import { InControl } from '../control';

/**
 * @internal
 */
class InSameValueControl<Value> extends InControl<Value> {

  private _supply?: EventSupply;

  constructor(private readonly _control: InControl<Value>) {
    super();
  }

  get [EventSupply__symbol](): EventSupply {
    return this._supply || (this._supply = eventSupply().needs(this._control));
  }

  get it(): Value {
    return this._control.it;
  }

  set it(value: Value) {
    this._control.it = value;
  }

  on(): OnEvent<[Value, Value]>;
  on(receiver: EventReceiver<[Value, Value]>): EventSupply;
  on(receiver?: EventReceiver<[Value, Value]>): OnEvent<[Value, Value]> | EventSupply {
    return (this.on = this._control.on().F)(receiver);
  }

}

/**
 * Constructs input control with the same value as another one.
 *
 * The constructed control does not inherit any aspects from original one.
 *
 * @category Control
 * @param control  Original control containing the value.
 *
 * @returns New input control that accesses the value of original `control`.
 */
export function inValueOf<Value>(control: InControl<Value>): InControl<Value> {
  return new InSameValueControl(control);
}
