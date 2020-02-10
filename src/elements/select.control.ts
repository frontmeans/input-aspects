/**
 * @packageDocumentation
 * @module input-aspects
 */
import { filterIt, itsEach, overArray, reverseIt } from 'a-iterable';
import { InConverter } from '../converter';
import { InElement } from '../element.control';
import { InElementControl } from './element.impl';

/**
 * Select input control.
 *
 * @category Control
 */
export type InSelect = InElement<readonly string[], HTMLSelectElement>;

/**
 * Creates input control for the given select element.
 *
 * The value of this control is an array of selected option values. This is particularly useful for `<select multiple>`
 * elements. Consider to use `inText()` for single-selects.
 *
 * @category Control
 * @param element  Target select element.
 * @param aspects  Input aspects applied by default. These are aspect converters to constructed control
 * from the {@link inValueOf same-valued one}.
 *
 * @return New select input control instance.
 */
export function inSelect(
    element: HTMLSelectElement,
    {
      aspects,
    }: {
      readonly aspects?: InConverter.Aspect<readonly string[]> | readonly InConverter.Aspect<readonly string[]>[];
    } = {},
): InSelect {
  return new InElementControl(
      element,
      {
        aspects,
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