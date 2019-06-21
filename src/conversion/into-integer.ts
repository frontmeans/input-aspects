import { InParser } from './parser';

const notInteger = 'not integer';

/**
 * Input control converter that converts string values to integer ones.
 *
 * Parses the input string using `parseInt()` function. And floors numbers assigned to converted control.
 *
 * Can be applied to input controls with string values only.
 *
 * Reports invalid numbers with `invalid`, `NaN`, and `notInteger` message codes.
 */
export const intoInteger = /*#__PURE__*/ InParser.converter<number>((from, to) =>
    [
      (text, errors) => {

        const result = parseInt(text, 10);

        if (isNaN(result)) {
          errors.report({ invalid: notInteger, NaN: notInteger, notInteger });
        }

        return result;
      },
      value => String(to.it = Math.floor(value)),
    ]);
