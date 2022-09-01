import { afterSupplied, EventEmitter } from '@proc7ts/fun-events';
import { valueProvider } from '@proc7ts/primitives';
import { InControl } from '../control';
import { InConverter } from '../converter';
import { InValidation } from '../validation';

/**
 * Input text parser.
 *
 * In addition to conversion from text to value and backward, it also able to report parse errors as validation
 * messages.
 *
 * To convert input parser to control converter use `InParser.converter()` function.
 *
 * @category Converter
 * @typeParam TValue - Parsed value type.
 */
export type InParser<TValue> =
  /**
   * @param from - Text input control.
   * @param to - Parsed value control.
   *
   * @returns A tuple containing text parser and text formatter functions. A standard to string conversion
   * will be used if the latter is missing.
   */
  (
    this: void,
    from: InControl<string>,
    to: InControl<TValue>,
  ) => [
    (this: void, value: string, errors: InParser.Errors) => TValue,
    ((this: void, value: TValue) => string)?,
  ];

/**
 * @category Converter
 */
export namespace InParser {
  /**
   * Parse errors.
   *
   * An instance of this interface is passed to text parser function. It can be used to report parse errors.
   */
  export interface Errors {
    /**
     * Appends parse errors.
     *
     * @param errors - Validation messages representing errors to report.
     */
    report(...errors: InValidation.Message[]): void;
  }
}

/**
 * @category Converter
 */
export const InParser = {
  /**
   * Creates input control converter out of input text parser.
   *
   * @typeParam TValue - Parsed input value type.
   * @param parser - A parser to convert.
   *
   * @returns An input control converter that parses and formats text input.
   */
  converter<TValue>(parser: InParser<TValue>): InConverter<string, TValue> {
    return (from: InControl<string>, to: InControl<TValue>) => {
      const [parse, format = String] = parser(from, to);
      const parseValidator = new EventEmitter<InValidation.Message[]>();

      to.aspect(InValidation).by(afterSupplied(parseValidator, () => []));

      return {
        set(text) {
          const errorList: InValidation.Message[] = [];
          const parserErrors: InParser.Errors = {
            report(...errors: InValidation.Message[]) {
              errorList.push(...errors);
            },
          };

          const result = parse(text, parserErrors);

          parseValidator.send(...errorList);

          return result;
        },
        get(value) {
          const text = String(format(value));

          parseValidator.send();

          return text;
        },
      };
    };
  },
};

/**
 * Creates text input control converter that parses and formats input text with the given functions.
 *
 * @category Converter
 * @typeParam TValue - Parsed input value type.
 * @param parse - Text parser function. Accepts input text and parse errors as its parameters and returns parsed value.
 * @param format - Text formatter. Accepts value is its only parameter and returns formatted text. Standard to string
 * conversion is used if omitted.
 *
 * @returns New input converter.
 */
export function intoParsedBy<TValue>(
  parse: (this: void, text: string, errors: InParser.Errors) => TValue,
  format?: (this: void, value: TValue) => string,
): InConverter<string, TValue> {
  return InParser.converter(valueProvider([parse, format]));
}
