/**
 *@packageDocumentation
 *@module input-aspects
 */
import { filterIt, itsEach, overArray, reverseIt } from 'a-iterable';
import { InElement } from '../element.control';
import { InElementControl } from './element.impl';

/**
 * Select input control.
 *
 * @category Control
 */
export type InSelect = InElement<string[], HTMLSelectElement>;

/**
 * Creates input control for the given select element.
 *
 * The value of this control is an array of selected option values. This is particularly useful for `<select multiple>`
 * elements. Consider to use `inText()` for single-selects.
 *
 * @category Control
 * @param element  Target select element.
 *
 * @return New select input control instance.
 */
export function inSelect(element: HTMLSelectElement): InSelect {
  return new InElementControl(
      element,
      {
        get(): string[] {
          return Array.from(
              filterIt(
                  overArray(this.element.options),
                  option => option.selected,
              ),
              option => option.value,
          );
        },
        set(value) {

          const selected = new Set(value);

          itsEach(
              reverseIt(overArray(this.element.options)),
              option => option.selected = selected.has(option.value),
          );
        },
      },
  );
}
