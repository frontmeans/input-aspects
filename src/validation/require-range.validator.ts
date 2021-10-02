import { InControl } from '../control';
import { InValidator } from './validator';

/**
 * Creates input validator that applies requirements to numeric value range.
 *
 * Ignores NaN input. Reports too small values with `invalid` and `tooSmall` message codes. Reports too large values
 * with `invalid` and `tooLarge` message codes.
 *
 * @category Validation
 * @param min - Minimum allowed value, inclusive. Not checked if omitted.
 * @param max - Maximum allowed value, inclusive. Not checked if omitted.
 *
 * @returns Element validator applicable to numeric input control.
 */
export function requireRange(min: number | undefined, max?: number): InValidator<number> {
  return {
    validate({ it }: InControl<number>) {
      if (!isNaN(it)) {
        if (min != null && it < min) {
          return { invalid: 'tooSmall', tooSmall: min };
        }
        if (max != null && it > max) {
          return { invalid: 'tooLarge', tooLarge: max };
        }
      }

      return;
    },
  };
}
