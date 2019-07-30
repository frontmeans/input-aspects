/**
 * @module input-aspects
 */
import { InElement } from '../element.control';
import { InElementControl } from './element.impl';

/**
 * Textual input control.
 *
 * @category Control
 */
export type InText = InElement<string, InText.Element>;

export namespace InText {

  /**
   * Text input element.
   *
   * Either `<input>`, `<textarea>`, or `<select>`.
   */
  export type Element = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

}

/**
 * Creates control for the given textual input element.
 *
 * Note that this won't work for files, checkboxes, or radio buttons.
 *
 * For `<select multiple>` this would only reflect the first option. Consider to use `inSelect()` for multi-selects.
 *
 * @category Control
 * @param element  Target text input element.
 *
 * @return New textual input control instance.
 */
export function inText(element: InText.Element): InText {
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
