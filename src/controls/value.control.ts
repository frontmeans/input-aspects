/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import { OnEvent, trackValue, ValueTracker } from '@proc7ts/fun-events';
import { Supply } from '@proc7ts/primitives';
import { InControl } from '../control';
import { InConverter } from '../converter';
import { AbstractInControl } from './abstract.control';

/**
 * @internal
 */
class InValueControl<TValue> extends AbstractInControl<TValue> {

  private readonly _it: ValueTracker<TValue>;

  constructor(
      initial: TValue,
      opts: {
        readonly aspects?: InConverter.Aspect<TValue> | readonly InConverter.Aspect<TValue>[];
      },
  ) {
    super(opts);
    this._it = trackValue(initial);
  }

  get supply(): Supply {
    return this._it.supply;
  }

  get it(): TValue {
    return this._it.it;
  }

  set it(value: TValue) {
    this._it.it = value;
  }

  get on(): OnEvent<[TValue, TValue]> {
    return this._it.on;
  }

}
/**
 * Constructs simple input control.
 *
 * This control does not handle actual user input. Instead, it maintains the value set programmatically.
 *
 * @category Control
 * @typeParam Value - Input value type.
 * @param initial - Initial input value.
 * @param aspects - Input aspects applied by default. These are aspect converters to constructed control
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
