/**
 *@packageDocumentation
 *@module input-aspects
 */
import { InElement } from '../element.control';
import { InElementControl } from './element.impl';

/**
 * Checkbox input control.
 *
 * @category Control
 * @typeparam Value  Input value type.
 */
export type InCheckbox<Value = boolean | undefined> = InElement<Value, HTMLInputElement & { intermediate?: boolean }>;

export namespace InCheckbox {

  /**
   * Possible checkbox control values corresponding to different checkbox states.
   *
   * @typeparam Value  Checkbox input value type.
   */
  export interface Values<Value> {

    /**
     * Control value of checked checkbox.
     */
    readonly checked: Value;

    /**
     * Control value of unchecked checkbox.
     */
    readonly unchecked: Value;

    /**
     * Control value of checkbox in intermediate state..
     */
    readonly intermediate: Value;

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
 * @param element  Target checkbox element.
 *
 * @return New input element control instance.
 */
export function inCheckbox(element: HTMLInputElement): InCheckbox;

/**
 * Creates an input control for the given checkbox element with custom control values.
 *
 * @typeparam Value  Input value type.
 * @param element  Target checkbox element.
 * @param values  All possible values of checkbox control.
 *
 * @return New radio input control instance.
 */
export function inCheckbox<Value>(
    element: HTMLInputElement,
    values: InCheckbox.Values<Value>,
): InCheckbox<Value>;

/**
 * Creates an input control for the given checkbox element with custom checked and unchecked control values.
 *
 * An intermediate checkbox state is represented by `undefined` control value.
 *
 * @typeparam Value  Input value type.
 * @param element  Target checkbox element.
 * @param checked  Control value of checked checkbox.
 * @param unchecked  Control value of unchecked checkbox.
 *
 * @return New input element control instance.
 */
export function inCheckbox<Value>(
    element: HTMLInputElement,
    {
      checked,
      unchecked,
    }: Omit<InCheckbox.Values<Value>, 'intermediate'>,
): InCheckbox<Value | undefined>;

export function inCheckbox<Value>(
    element: HTMLInputElement,
    {
      checked = true as unknown as Value,
      unchecked = false as unknown as Value,
      intermediate = undefined as unknown as Value,
    }: Partial<InCheckbox.Values<Value>> = {},
): InCheckbox<Value> {
  return new InElementControl<Value, HTMLInputElement & { intermediate?: boolean }>(
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
      },
  );
}
