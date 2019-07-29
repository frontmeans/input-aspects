import { nextArgs, NextArgs, valueProvider } from 'call-thru';
import { AfterEvent, afterEventFrom, EventKeeper, isEventKeeper } from 'fun-events';
import { InControl } from '../control';
import { InValidation } from './validation.aspect';

/**
 * Input validator.
 *
 * Validator can be added to input validation aspect using `InValidation.by()` method. After that all validation
 * messages it sends are reported by validation aspect. Multiple messages could be sent at a time. These messages
 * replace the previously sent ones. To report the absence of error just send an empty event without messages.
 *
 * This can be one either a validation messages event keeper, a function returning one and accepting input control
 * as its only parameter, or simple validator instance.
 *
 * @typeparam Value Input value type.
 */
export type InValidator<Value> =
    | EventKeeper<InValidation.Message[]>
    | ((this: void, control: InControl<Value>) => EventKeeper<InValidation.Message[]>)
    | InValidator.Simple<Value>;

export namespace InValidator {

  /**
   * Simple input validator.
   */
  export interface Simple<Value> {

    /**
     * Validates the user input.
     *
     * This method is called each time input value changes. The returned messages then reported by input validation
     * aspect.
     *
     * @param control Input control to validate.
     *
     * @typeparam Value Input value type.
     *
     * @returns Either validation message, array of validation messages, or `null`/`unknown` to indicate their absence.
     */
    validate(control: InControl<Value>): InValidation.Message | InValidation.Message[] | null | undefined;

  }

}

export function inValidator<Value>(
    validator: InValidator<Value>
): (control: InControl<Value>) => AfterEvent<InValidation.Message[]> {
  if (isEventKeeper(validator)) {
    return valueProvider(afterEventFrom(validator));
  }
  if (typeof validator === 'function') {
    return control => afterEventFrom(validator(control));
  }
  return control => control.read.keep.thru(simpleValidator(control, validator));
}

function simpleValidator<Value>(
    control: InControl<Value>,
    validator: InValidator.Simple<Value>,
): <NextReturn>(value: Value) => NextArgs<InValidation.Message[], NextReturn> | InValidation.Message {
  return () => {

    const messages = validator.validate(control);

    return messages == null
        ? nextArgs()
        : Array.isArray(messages)
            ? nextArgs(...messages)
            : messages;
  };
}
