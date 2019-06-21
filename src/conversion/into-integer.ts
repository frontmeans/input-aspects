import { afterEventFrom, EventEmitter } from 'fun-events';
import { InControl } from '../control';
import { InValidation } from '../validation';

const notInteger = 'not integer';

/**
 * Input control converter that converts string values to integer ones.
 *
 * Parses the input string using `parseInt()` function. And floors numbers assigned to converted control.
 *
 * Can be applied to input controls with string values only.
 */
export function intoInteger(
    from: InControl<string>,
    to: InControl<number>,
): [(this: void, value: string) => number, (this: void, value: number) => string] {

  const parseErrors = new EventEmitter<InValidation.Message[]>();

  to.aspect(InValidation).by(afterEventFrom(parseErrors, []));

  return [
    value => {

      const result = parseInt(value, 10);

      if (isNaN(result)) {
        parseErrors.send({ invalid: notInteger, NaN: notInteger, notInteger });
      } else {
        parseErrors.send();
      }

      return result;
    },
    value => {
      parseErrors.send();
      return String(to.it = Math.floor(value));
    },
  ];
}
