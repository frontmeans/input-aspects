import { InConverter } from '../converter';
import { InElement } from '../element.control';
import { AbstractInElement } from './abstract-element.control';

/**
 * Checkbox input control.
 *
 * @category Control
 * @typeParam TValue - Input value type.
 */
export type InCheckbox<TValue = boolean | undefined> =
    InElement<TValue, HTMLInputElement & { intermediate?: boolean | undefined }>;

/**
 * @category Control
 */
export namespace InCheckbox {

  /**
   * Possible checkbox control values corresponding to different checkbox states.
   *
   * @typeParam TValue - Checkbox input value type.
   */
  export interface Values<TValue> {

    /**
     * Control value of checked checkbox.
     */
    readonly checked: TValue;

    /**
     * Control value of unchecked checkbox.
     */
    readonly unchecked: TValue;

    /**
     * Control value of checkbox in intermediate state..
     */
    readonly intermediate: TValue;

    /**
     * Input aspects applied by default.
     *
     * These are aspect converters to constructed control from the {@link inValueOf same-valued one}.
     */
    readonly aspects?: InConverter.Aspect<TValue> | readonly InConverter.Aspect<TValue>[] | undefined;

  }

}

/**
 * Creates an input control for the given checkbox element.
 *
 * The value of checkbox control is:
 * - `true` when checkbox is checked,
 * - `false` when it's not, or
 * - `undefined` when it is in intermediate state.
 *
 * @category Control
 * @param element - Target checkbox element.
 *
 * @return New input element control instance.
 */
export function inCheckbox(element: HTMLInputElement): InCheckbox;

/**
 * Creates an input control for the given checkbox element with default aspects.
 *
 * The value of checkbox control is:
 * - `true` when checkbox is checked,
 * - `false` when it's not, or
 * - `undefined` when it is in intermediate state.
 *
 * @param element - Target checkbox element.
 * @param aspects - Input aspects applied by default. These are aspect converters to constructed control
 * from the {@link inValueOf same-valued one}.
 *
 * @return New input element control instance.
 */
export function inCheckbox(
    element: HTMLInputElement,
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    {
      aspects,
    }: {
      readonly aspects?: InConverter.Aspect<boolean> | readonly InConverter.Aspect<boolean>[] | undefined;
    },
): InCheckbox;

/**
 * Creates an input control for the given checkbox element with custom control values.
 *
 * @typeParam TValue - Input value type.
 * @param element - Target checkbox element.
 * @param values - All possible values of checkbox control.
 *
 * @return New radio input control instance.
 */
export function inCheckbox<TValue>(
    element: HTMLInputElement,
    values: InCheckbox.Values<TValue>,
): InCheckbox<TValue>;

/**
 * Creates an input control for the given checkbox element with custom checked and unchecked control values.
 *
 * An intermediate checkbox state is represented by `undefined` control value.
 *
 * @typeParam TValue - Input value type.
 * @param element - Target checkbox element.
 * @param checked - Control value of checked checkbox.
 * @param unchecked - Control value of unchecked checkbox.
 * @param aspects - Input aspects applied by default. These are aspect converters to constructed control
 * from the {@link inValueOf same-valued one}.
 *
 * @return New input element control instance.
 */
export function inCheckbox<TValue>(
    element: HTMLInputElement,
    {
      checked,
      unchecked,
      aspects,
    }: Omit<InCheckbox.Values<TValue>, 'intermediate'>,
): InCheckbox<TValue | undefined>;

export function inCheckbox<TValue>(
    element: HTMLInputElement,
    {
      checked = true as unknown as TValue,
      unchecked = false as unknown as TValue,
      intermediate = undefined as unknown as TValue,
      aspects,
    }: Partial<InCheckbox.Values<TValue>> = {},
): InCheckbox<TValue> {
  return new AbstractInElement<TValue, HTMLInputElement & { intermediate?: boolean }>(
      element,
      {
        get() {
          return this.element.intermediate
              ? intermediate
              : this.element.checked ? checked : unchecked;
        },
        set(value) {
          this.element.checked = value === checked;
          this.element.intermediate = value !== checked && value !== unchecked;
        },
        aspects,
      },
  );
}
