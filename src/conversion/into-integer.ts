/**
 * @module input-aspects
 */
import { InControl } from '../control';
import { InParser } from './parser';

const notInteger = 'notInteger';

/**
 * Creates an input control converter that converts string values to integer ones.
 *
 * Parses the input string using `parseInt()` function. And floors numbers assigned to converted control.
 *
 * Can be applied to input controls with string values only.
 *
 * Reports invalid numbers with `invalid`, `NaN`, and `notInteger` message codes.
 *
 * @category Converter
 * @param radix  An integer in the range 2 through 36 specifying the base to use for representing numeric values.
 * `10` by default.
 */
export function intoInteger(radix?: number): InControl.Converter<string, number>;

/**
 * Input control converter that converts string values to integer ones with radix of 10.
 *
 * Parses the input string using `parseInt()` function. And floors numbers assigned to converted control.
 *
 * Can be applied to input controls with string values only.
 *
 * Reports invalid numbers with `invalid`, `NaN`, and `notInteger` message codes.
 *
 * @category Converter
 */
export function intoInteger(from: InControl<string>, to: InControl<number>): InControl.Converters<string, number>;

export function intoInteger(radixOrFrom: number | InControl<string> = 10, optTo?: InControl<number>) {
  if (typeof radixOrFrom !== 'number') {
    return intoInteger()(radixOrFrom, optTo as InControl<number>);
  }

  return InParser.converter<number>((_from, to) => [
    (text, errors) => {

      const result = parseInt(text, radixOrFrom);

      if (isNaN(result)) {
        errors.report({ invalid: notInteger, NaN: notInteger, notInteger });
      }

      return result;
    },
    value => (to.it = Math.floor(value)).toString(radixOrFrom),
  ]);
}
