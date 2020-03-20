/**
 * @packageDocumentation
 * @module @proc7ts/input-aspects
 */
import { itsEach, itsEvery, overEntries } from '@proc7ts/a-iterable';
import { nextArg } from '@proc7ts/call-thru';
import {
  afterAll,
  AfterEvent,
  EventReceiver,
  EventSupply,
  EventSupply__symbol,
  eventSupplyOf,
  OnEvent,
  trackValue,
  ValueTracker,
} from '@proc7ts/fun-events';
import { InControl } from '../control';
import { AbstractInControl } from '../controls';
import { InConverter } from '../converter';

/**
 * Input control for a group of radio buttons.
 *
 * Groups several radio buttons. The value of this control is selected accordingly to the checked radio button.
 *
 * @category Control
 * @typeparam Value  Input value type. A `string` type that optionally accepting `undefined` values.
 */
export type InRadioGroup<Value extends string | undefined = string | undefined> = InControl<Value>;

export namespace InRadioGroup {

  /**
   * Possible radio group control values corresponding to check states.
   *
   * @typeparam Value  Radio button input value type.
   */
  export interface Values<Value extends string | undefined> {

    /**
     * Control value of radio group to use when none of the radio buttons is checked.
     */
    readonly unchecked: Value;

    /**
     * Input aspects applied by default.
     *
     * These are aspect converters to constructed control from the {@link inValueOf same-valued one}.
     */
    readonly aspects?: InConverter.Aspect<Value> | readonly InConverter.Aspect<Value>[];

  }

  /**
   * Radio buttons map.
   *
   * A key is the radio group value used when corresponding radio button is checked. The value is a radio button, or
   * an arbitrary input control that accepts at least `true` and `undefined` values. The latter means the radio button
   * is not checked. Everything else means it is checked. To check the matching radio button the group would assign
   * a `true` value to its control.
   */
  export type Buttons<Value extends string | undefined> = {

    readonly [value in Exclude<Value, undefined>]?: InControl<true | undefined>;

  };

}

/**
 * @internal
 */
type RequiredInButtons<Value extends string | undefined> = {
  readonly [value in Exclude<Value, undefined>]: InControl<true | undefined>;
};

/**
 * @internal
 */
class InRadioGroupControl<Value extends string | undefined> extends AbstractInControl<Value> {

  private readonly _unchecked: Value;
  private readonly _it: ValueTracker<Value>;

  constructor(
      private readonly _buttons: RequiredInButtons<Value>,
      {
        unchecked,
        aspects,
      }: Partial<InRadioGroup.Values<Value>> = {},
  ) {
    super({ aspects });
    this._unchecked = unchecked as Value;

    const read: AfterEvent<[Value]> = afterAll(_buttons).keepThru(
        values => nextArg(checkedInValue(values, unchecked) as Value),
    );

    this._it = trackValue(unchecked as Value).by(read);
    this._it.on(function (value) {
      itsEach(
          overEntries(_buttons),
          ([key, button]) => {
            button.it = value === key || undefined;
          },
      );
    });
  }

  get [EventSupply__symbol](): EventSupply {
    return eventSupplyOf(this._it);
  }

  get it(): Value {
    return this._it.it;
  }

  set it(value: Value) {
    this._it.it = value != null && this._buttons[value as keyof RequiredInButtons<Value>] ? value : this._unchecked;
  }

  on(): OnEvent<[Value, Value]>;
  on(receiver: EventReceiver<[Value, Value]>): EventSupply;
  on(receiver?: EventReceiver<[Value, Value]>): OnEvent<[Value, Value]> | EventSupply {
    return (this.on = this._it.on().F)(receiver);
  }

}

/**
 * @internal
 */
function checkedInValue<Value extends string | undefined>(
    values: { readonly [key in Exclude<Value, undefined>]: [true | undefined] },
    unchecked: Value,
): Value {

  let checked: Value = unchecked;

  itsEvery(
      overEntries(values),
      ([key, [value]]) => {
        if (value === undefined) {
          return true;
        }
        checked = key;
        return false;
      },
  );

  return checked;
}

/**
 * Creates a radio group for the given radio `buttons`.
 *
 * The created control has `undefined` value when none of the radio buttons is checked.
 *
 * @category Control
 * @typeparam Value  Input value type.
 * @param buttons  Radio buttons map.
 *
 * @returns New radio group control instance.
 */
export function inRadioGroup<Value extends string>(
    buttons: InRadioGroup.Buttons<Value>,
): InRadioGroup<Value | undefined>;

/**
 * Creates a radio group for the given radio `buttons` with default aspects.
 *
 * The created control has `undefined` value when none of the radio buttons is checked.
 *
 * @typeparam Value  Input value type.
 * @param buttons  Radio buttons map.
 * @param aspects  Input aspects applied by default. These are aspect converters to constructed control
 * from the {@link inValueOf same-valued one}.
 *
 * @returns New radio group control instance.
 */
export function inRadioGroup<Value extends string>(
    buttons: InRadioGroup.Buttons<Value>,
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    {
      aspects,
    }: {
      readonly aspects?: InConverter.Aspect<Value> | readonly InConverter.Aspect<Value>[];
    },
): InRadioGroup<Value | undefined>;

/**
 * Creates a radio group for the given radio `buttons` with custom control `values`.
 *
 * @typeparam Value  Input value type.
 * @param buttons  Radio buttons map.
 * @param values  Possible values of radio group control.
 *
 * @returns New radio group control instance.
 */
export function inRadioGroup<Value extends string | undefined>(
    buttons: InRadioGroup.Buttons<Value>,
    values: InRadioGroup.Values<Value>,
): InRadioGroup<Value>;

export function inRadioGroup<Value extends string | undefined>(
    buttons: InRadioGroup.Buttons<Value>,
    values?: Partial<InRadioGroup.Values<Value>>,
): InRadioGroup<Value> {
  return new InRadioGroupControl(buttons as RequiredInButtons<Value>, values);
}
