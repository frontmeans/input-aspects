import { InElement } from './element';
import { InElementControl } from './element.impl';

class InCheckbox extends InElementControl<HTMLInputElement & { intermediate?: boolean }, boolean | null> {

  protected _get(): boolean | null {
    return this.element.intermediate ? null : this.element.checked;
  }

  protected _set(value: boolean | null): boolean | null {
    this.element.checked = !!value;
    this.element.intermediate = value == null;
    return this._get();
  }

}

/**
 * Creates control for the given checkbox input element.
 *
 * The value of checkbox control is:
 * - `true` when checkbox is checked,
 * - `false` when its not, or
 * - `null` when the value is intermediate.
 *
 * @param element Target checkbox element.
 *
 * @return New input element control instance.
 */
export function inCheckbox(element: HTMLInputElement): InElement<boolean | null> {
  return new InCheckbox(element);
}
