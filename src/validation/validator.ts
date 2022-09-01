import {
  AfterEvent,
  afterSupplied,
  EventKeeper,
  isEventKeeper,
  translateAfter,
} from '@proc7ts/fun-events';
import { arrayOfElements, valueProvider } from '@proc7ts/primitives';
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
 * @category Validation
 * @typeParam TValue - Input value type.
 */
export type InValidator<TValue> =
  | EventKeeper<InValidation.Message[]>
  | ((this: void, control: InControl<TValue>) => EventKeeper<InValidation.Message[]>)
  | InValidator.Simple<TValue>;

/**
 * @category Validation
 */
export namespace InValidator {
  /**
   * Simple input validator.
   *
   * @typeParam TValue - Input value type.
   */
  export interface Simple<TValue> {
    /**
     * Validates the user input.
     *
     * This method is called each time input value changes. The returned messages then reported by input validation
     * aspect.
     *
     * @param control - Input control to validate.
     *
     * @returns Either validation message, array of validation messages, or `null`/`unknown` to indicate their absence.
     */
    validate(
      control: InControl<TValue>,
    ): InValidation.Message | InValidation.Message[] | null | undefined;
  }
}

/**
 * Converts arbitrary input validator to normalized form.
 *
 * @category Validation
 * @typeParam TValue - Input value type.
 * @param validator - Validator to convert.
 *
 * @returns A function accepting input control as its only parameter and returning an `AfterEvent` keeper of validation
 * messages.
 */
export function inValidator<TValue>(
  validator: InValidator<TValue>,
): (this: void, control: InControl<TValue>) => AfterEvent<InValidation.Message[]> {
  if (isEventKeeper(validator)) {
    return valueProvider(afterSupplied(validator));
  }
  if (typeof validator === 'function') {
    return control => afterSupplied(validator(control));
  }

  return control => control.read.do(translateAfter(send => send(...arrayOfElements(validator.validate(control)))));
}
