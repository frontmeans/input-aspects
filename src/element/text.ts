import { InElement } from './element';
import { InElementControl } from './element.impl';

class InText extends InElementControl<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, string> {

  protected _get(): string {
    return this.element.value;
  }

  protected _set(value: string): string {
    this.element.value = value;
    return this.element.value;
  }

}

/**
 * Creates control for the given textual input element.
 *
 * Note that this won't work for files, checkboxes, or radio buttons.
 *
 * @param element Target text input element. Either `<input>`, `<textarea>`, or `<select>`.
 *
 * @return New input element control instance.
 */
export function inText(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): InElement {
  return new InText(element);
}
