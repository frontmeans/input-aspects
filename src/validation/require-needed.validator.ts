import { translateAfter } from '@proc7ts/fun-events';
import { filterIt } from '@proc7ts/push-iterator';
import { InControl } from '../control';
import { requireAll } from './require-all.validator';
import { InValidation, inValidationResult } from './validation.aspect';
import { inValidator, InValidator } from './validator';

/**
 * Constructs input validator that filters validation messages from the given `validators` according to their codes.
 *
 * The validation messages reported by `validators` are filtered according to the following rules:
 * - If at least one message with `missing` code is reported, then strip out the ones with `incomplete` and `invalid`
 *   codes, except the ones with `despiteMissing` code.
 * - Otherwise, if at least one message with `incomplete` code is reported, then strip out the ones with `invalid`
 *   code, except the ones with `despiteIncomplete` code.
 * - Otherwise report all messages.
 *
 * @category Validation
 * @typeParam TValue - Input value type.
 * @param validators - Validators to validate the input with.
 *
 * @returns Validator that requires all the given `validators` and filters their output.
 */
export function requireNeeded<TValue>(...validators: InValidator<TValue>[]): InValidator<TValue> {
  const validate = inValidator(requireAll(...validators));

  return (control: InControl<TValue>) => validate(control).do(translateAfter(nextRequireNeededMessages));
}

/**
 * @internal
 */
function nextRequireNeededMessages(
  send: (...messages: InValidation.Message[]) => void,
  ...messages: InValidation.Message[]
): void {
  const result = inValidationResult(...messages);
  let filtered: Iterable<InValidation.Message> = result;

  if (result.has('missing')) {
    filtered = filterIt(
      result,
      message => (!message.incomplete && !message.invalid) || !!message.despiteMissing,
    );
  } else if (result.has('incomplete')) {
    filtered = filterIt(result, message => !message.invalid || !!message.despiteIncomplete);
  }

  return send(...filtered);
}
