/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import { afterAll, AfterEvent, mapAfter, OnEvent, trackValue, ValueTracker } from '@proc7ts/fun-events';
import { Supply } from '@proc7ts/primitives';
import { itsEach, itsEvery, overEntries } from '@proc7ts/push-iterator';
import { InControl } from '../control';
import { AbstractInControl } from '../controls';
import { InConverter } from '../converter';

/**
 * Input control for a group of radio buttons.
 *
 * Groups several radio buttons. The value of this control is selected accordingly to the checked radio button.
 *
 * @category Control
 * @typeParam TValue - Input value type. A `string` type that optionally accepting `undefined` values.
 */
export type InRadioGroup<TValue extends string | undefined = string | undefined> = InControl<TValue>;

/**
 * @category Control
 */
export namespace InRadioGroup {

  /**
   * Possible radio group control values corresponding to check states.
   *
   * @typeParam TValue - Radio button input value type.
   */
  export interface Values<TValue extends string | undefined> {

    /**
     * Control value of radio group to use when none of the radio buttons is checked.
     */
    readonly unchecked: TValue;

    /**
     * Input aspects applied by default.
     *
     * These are aspect converters to constructed control from the {@link inValueOf same-valued one}.
     */
    readonly aspects?: InConverter.Aspect<TValue> | readonly InConverter.Aspect<TValue>[];

  }

  /**
   * Radio buttons map.
   *
   * A key is the radio group value used when corresponding radio button is checked. The value is a radio button, or
   * an arbitrary input control that accepts at least `true` and `undefined` values. The latter means the radio button
   * is not checked. Everything else means it is checked. To check the matching radio button the group would assign
   * a `true` value to its control.
   *
   * @typeParam TValue - Radio buttons input value type.
   */
  export type Buttons<TValue extends string | undefined> = {

    readonly [value in Exclude<TValue, undefined>]?: InControl<true | undefined>;

  };

}

/**
 * @internal
 */
type RequiredInButtons<TValue extends string | undefined> = {
  readonly [value in Exclude<TValue, undefined>]: InControl<true | undefined>;
};

/**
 * @internal
 */
class InRadioGroupControl<TValue extends string | undefined> extends AbstractInControl<TValue> {

  private readonly _unchecked: TValue;
  private readonly _it: ValueTracker<TValue>;

  constructor(
      private readonly _buttons: RequiredInButtons<TValue>,
      {
        unchecked,
        aspects,
      }: Partial<InRadioGroup.Values<TValue>> = {},
  ) {
    super({ aspects });
    this._unchecked = unchecked as TValue;

    const read: AfterEvent<[TValue]> = afterAll(_buttons).do(
        mapAfter(values => checkedInValue(values, unchecked) as TValue),
    );

    this._it = trackValue(unchecked as TValue).by(read);
    this._it.on(value => {
      itsEach(
          overEntries(_buttons),
          ([key, button]) => {
            button.it = value === key || undefined;
          },
      );
    });
  }

  get supply(): Supply {
    return this._it.supply;
  }

  get it(): TValue {
    return this._it.it;
  }

  set it(value: TValue) {
    this._it.it = value != null && this._buttons[value as keyof RequiredInButtons<TValue>] ? value : this._unchecked;
  }

  get on(): OnEvent<[TValue, TValue]> {
    return this._it.on;
  }

}

/**
 * @internal
 */
function checkedInValue<TValue extends string | undefined>(
    values: { readonly [key in Exclude<TValue, undefined>]: [true | undefined] },
    unchecked: TValue,
): TValue {

  let checked: TValue = unchecked;

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
 * @typeParam TValue - Input value type.
 * @param buttons - Radio buttons map.
 *
 * @returns New radio group control instance.
 */
export function inRadioGroup<TValue extends string>(
    buttons: InRadioGroup.Buttons<TValue>,
): InRadioGroup<TValue | undefined>;

/**
 * Creates a radio group for the given radio `buttons` with default aspects.
 *
 * The created control has `undefined` value when none of the radio buttons is checked.
 *
 * @typeParam TValue - Input value type.
 * @param buttons - Radio buttons map.
 * @param aspects - Input aspects applied by default. These are aspect converters to constructed control
 * from the {@link inValueOf same-valued one}.
 *
 * @returns New radio group control instance.
 */
export function inRadioGroup<TValue extends string>(
    buttons: InRadioGroup.Buttons<TValue>,
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    {
      aspects,
    }: {
      readonly aspects?: InConverter.Aspect<TValue> | readonly InConverter.Aspect<TValue>[];
    },
): InRadioGroup<TValue | undefined>;

/**
 * Creates a radio group for the given radio `buttons` with custom control `values`.
 *
 * @typeParam TValue - Input value type.
 * @param buttons - Radio buttons map.
 * @param values - Possible values of radio group control.
 *
 * @returns New radio group control instance.
 */
export function inRadioGroup<TValue extends string | undefined>(
    buttons: InRadioGroup.Buttons<TValue>,
    values: InRadioGroup.Values<TValue>,
): InRadioGroup<TValue>;

export function inRadioGroup<TValue extends string | undefined>(
    buttons: InRadioGroup.Buttons<TValue>,
    values?: Partial<InRadioGroup.Values<TValue>>,
): InRadioGroup<TValue> {
  return new InRadioGroupControl(buttons as RequiredInButtons<TValue>, values);
}
