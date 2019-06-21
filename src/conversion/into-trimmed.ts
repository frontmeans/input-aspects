import { InControl } from '../control';

/**
 * Input control converter that trims input value.
 *
 * Removing leading and trailing white space of converted control using `Spring.prototype.trim()` method.
 *
 * Can be applied to input controls with string values only.
 */
export function intoTrimmed(
    from: InControl<string>,
    to: InControl<string>,
): [(this: void, value: string) => string, (this: void, value: string) => string] {
  return [value => value.trim(), value => to.it = value.trim()];
}
