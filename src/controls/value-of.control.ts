import { OnEvent } from '@proc7ts/fun-events';
import { Supply } from '@proc7ts/primitives';
import { InControl } from '../control';

/**
 * @internal
 */
class InSameValueControl<TValue> extends InControl<TValue> {

  private _supply?: Supply;

  constructor(private readonly _control: InControl<TValue>) {
    super();
  }

  get supply(): Supply {
    return this._supply || (this._supply = new Supply().needs(this._control));
  }

  get it(): TValue {
    return this._control.it;
  }

  set it(value: TValue) {
    this._control.it = value;
  }

  get on(): OnEvent<[TValue, TValue]> {
    return this._control.on;
  }

}

/**
 * Constructs input control with the same value as another one.
 *
 * The constructed control does not inherit any aspects from original one.
 *
 * @category Control
 * @typeParam TValue - Input value type.
 * @param control - Original control containing the value.
 *
 * @returns New input control that accesses the value of original `control`.
 */
export function inValueOf<TValue>(control: InControl<TValue>): InControl<TValue> {
  return new InSameValueControl(control);
}
