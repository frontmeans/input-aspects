import { filterIt, itsEach, mapIt, overArray, reverseIt } from 'a-iterable';
import { InElement } from '../element.control';
import { InElementControl } from './element.impl';

class InSelect extends InElementControl<HTMLSelectElement, string[]> {

  protected _get(): string[] {
    return [
      ...mapIt(
          filterIt(
              overArray(this.element.options),
              option => option.selected
          ),
          option => option.value
      ),
    ];
  }

  protected _set(value: string[]): string[] {

    const selected = new Set(value);

    itsEach(
        reverseIt(overArray(this.element.options)),
        option => option.selected = selected.has(option.value),
    );

    return this._get();
  }

}

/**
 * Creates input control for the given select element.
 *
 * The value of this control is an array of selected option values. This is particularly useful for `<select multiple>`
 * elements. Consider to use `inText()` for single-selects.
 *
 * @param element Target select element.
 *
 * @return New input element control instance.
 */
export function inSelect(element: HTMLSelectElement): InElement<string[]> {
  return new InSelect(element);
}
