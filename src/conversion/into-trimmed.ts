/**
 *@packageDocumentation
 *@module input-aspects
 */
import { InControl } from '../control';
import { InConverter } from '../converter';

/**
 * Creates input control converter that trims input values.
 *
 * Removes leading and trailing white space of input values using `Spring.prototype.trim()` method.
 *
 * Can be applied to input controls with string values only.
 *
 * @category Converter
 */
export function intoTrimmed(): InConverter<string, string>;

/**
 * Input control converter that trims input values.
 *
 * Removes leading and trailing white space of input values using `Spring.prototype.trim()` method.
 *
 * Can be applied to input controls with string values only.
 */
export function intoTrimmed(from: InControl<string>, to: InControl<string>): InConverter.Conversion<string, string>;

export function intoTrimmed(
    _from?: InControl<string>,
    to?: InControl<string>,
): InConverter<string, string> | InConverter.Conversion<string, string> {
  if (!to) {
    return intoTrimmed;
  }
  return {
    set(value) {
      return value.trim();
    },
    get(value) {
      return to.it = value.trim();
    },
  };
}
