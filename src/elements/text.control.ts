/**
 * @packageDocumentation
 * @module input-aspects
 */
import { InConverter } from '../converter';
import { InElement } from '../element.control';
import { AbstractInElement } from './abstract-element.control';

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
 * @param aspects  Input aspects applied by default. These are aspect converters to constructed control
 * from the {@link inValueOf same-valued one}.
 *
 * @return New textual input control instance.
 */
export function inText(
    element: InText.Element,
    {
      aspects,
    }: {
      readonly aspects?: InConverter.Aspect<string> | readonly InConverter.Aspect<string>[];
    } = {},
): InText {
  return new AbstractInElement(
      element,
      {
        get(): string {
          return this.element.value;
        },
        set(value) {
          this.element.value = value;
        },
        aspects,
      },
  );
}
