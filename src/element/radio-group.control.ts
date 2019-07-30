/**
 * @module input-aspects
 */
import { itsEach, itsEvery, overEntries } from 'a-iterable';
import { AfterEvent, afterEventFromAll, trackValue, ValueTracker } from 'fun-events';
import { InControl } from '../control';

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

type RequiredButtons<Value extends string | undefined> = {
  readonly [value in Exclude<Value, undefined>]: InControl<true | undefined>;
};

class InRadioGroupControl<Value extends string | undefined> extends InControl<Value> {

  private readonly _unchecked: Value;
  private readonly _it: ValueTracker<Value>;

  constructor(
      private readonly _buttons: RequiredButtons<Value>,
      {
        unchecked,
      }: Partial<InRadioGroup.Values<Value>> = {},
  ) {
    super();
    this._unchecked = unchecked as Value;

    const read: AfterEvent<[Value]> = afterEventFromAll(_buttons).keep.thru(
        values => checkedValue(values, unchecked) as Value,
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

  get on() {
    return this._it.on;
  }

  get it() {
    return this._it.it;
  }

  set it(value: Value) {
    this._it.it = value != null && this._buttons[value as keyof RequiredButtons<Value>] ? value : this._unchecked;
  }

  done(reason?: any): this {
    this._it.done(reason);
    return this;
  }

}

function checkedValue<Value extends string | undefined>(
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
      }
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
    values?: InRadioGroup.Values<Value>,
): InRadioGroup<Value> {
  return new InRadioGroupControl(buttons as RequiredButtons<Value>, values);
}
