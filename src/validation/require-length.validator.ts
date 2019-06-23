import { InControl } from '../control';
import { InValidator } from './validator';

/**
 * Creates input validator that applies requirements on input text length.
 *
 * Ignores empty input. Reports too short values with `incomplete` and `tooShort` message codes. Reports too long values
 * with `invalid` and `tooLong` message codes.
 *
 * @param min Required minimum length. Not checked if omitted.
 * @param max Required maximum length. Not checked if omitted.
 *
 * @returns Element validator applicable to text input control.
 */
export function requireLength(min: number | undefined, max?: number): InValidator<string> {
  return {
    validate({ it: { length } }: InControl<string>) {
      if (length) {
        if (min && length < min) {
          return { incomplete: 'tooShort', tooShort: min };
        }
        if (max != null && length > max) {
          return { invalid: 'tooLong', tooLong: max };
        }
      }
      return;
    },
  };
}
