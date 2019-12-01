/**
 * @module input-aspects
 */
import { valueProvider, valuesProvider } from 'call-thru';
import { afterSupplied, EventEmitter } from 'fun-events';
import { InControl } from '../control';
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
 * @typeparam Value  Parsed value type.
 */
export type InParser<Value> =
/**
 * @param from  Text input control.
 * @param to  Parsed value control.
 *
 * @returns A tuple containing text parser and text formatter functions. A standard to string conversion
 * will be used if the latter is missing.
 */
    (
        this: void,
        from: InControl<string>,
        to: InControl<Value>,
    ) => [
      (this: void, value: string, errors: InParser.Errors) => Value,
      ((this: void, value: Value) => string)?
    ];

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
     * @param errors  Validation messages representing errors to report.
     */
    report(...errors: InValidation.Message[]): void;

  }

}

export const InParser = {

  /**
   * Creates input control converter out of input text parser.
   *
   * @param parser  A parser to convert.
   *
   * @returns An input control converter that parses and formats text input.
   */
  converter<Value>(parser: InParser<Value>): InControl.Converter<string, Value> {
    return (from: InControl<string>, to: InControl<Value>) => {

      const [parse, format = String] = parser(from, to);
      const parseValidator = new EventEmitter<InValidation.Message[]>();

      to.aspect(InValidation).by(afterSupplied(parseValidator, valuesProvider()));

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
 * @param parse  Text parser function. Accepts input text and parse errors as its parameters and returns parsed value.
 * @param format  Text formatter. Accepts value is its only parameter and returns formatted text. Standard to string
 * conversion is used if omitted.
 *
 * @returns New input converter.
 */
export function intoParsedBy<Value>(
    parse: (this: void, text: string, errors: InParser.Errors) => Value,
    format?: (this: void, value: Value) => string,
): InControl.Converter<string, Value> {
  return InParser.converter(valueProvider([parse, format]));
}
