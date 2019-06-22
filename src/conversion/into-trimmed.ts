import { InControl } from '../control';

/**
 * Creates input control converter that trims input values.
 *
 * Removes leading and trailing white space of input values using `Spring.prototype.trim()` method.
 *
 * Can be applied to input controls with string values only.
 */
export function intoTrimmed(): InControl.Converter<string, string>;

/**
 * Input control converter that trims input values.
 *
 * Removes leading and trailing white space of input values using `Spring.prototype.trim()` method.
 *
 * Can be applied to input controls with string values only.
 */
export function intoTrimmed(from: InControl<string>, to: InControl<string>): InControl.Converters<string, string>;

export function intoTrimmed(
    from?: InControl<string>,
    to?: InControl<string>,
): InControl.Converter<string, string> | InControl.Converters<string, string> {
  if (!to) {
    return intoTrimmed;
  }
  return [value => value.trim(), value => to.it = value.trim()];
}
