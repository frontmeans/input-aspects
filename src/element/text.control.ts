import { InElement } from '../element.control';
import { InElementControl } from './element.impl';

/**
 * Textual input control.
 */
export type InText = InElement<string>;

/**
 * Creates control for the given textual input element.
 *
 * Note that this won't work for files, checkboxes, or radio buttons.
 *
 * For `<select multiple>` this would only reflect the first option. Consider to use `inSelect()` for multi-selects.
 *
 * @param element Target text input element. Either `<input>`, `<textarea>`, or `<select>`.
 *
 * @return New textual input control instance.
 */
export function inText(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): InText {
  return new InElementControl(
      element,
      {
        get(): string {
          return this.element.value;
        },
        set(value) {
          this.element.value = value;
        },
      },
  );
}
