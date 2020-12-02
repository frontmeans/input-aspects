/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import { CallChain, nextArgs, NextCall } from '@proc7ts/call-thru';
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
 * @param validators  Validators to validate the input with.
 *
 * @returns Validator that requires all the given `validators` and filters their output.
 */
export function requireNeeded<Value>(...validators: InValidator<Value>[]): InValidator<Value> {

  const validate = inValidator(requireAll(...validators));

  return (control: InControl<Value>) => validate(control).keepThru(nextRequireNeededMessages);
}

/**
 * @internal
 */
function nextRequireNeededMessages(
    ...messages: InValidation.Message[]
): NextCall<CallChain, InValidation.Message[]> {

  const result = inValidationResult(...messages);
  let filtered: Iterable<InValidation.Message> = result;

  if (result.has('missing')) {
    filtered = filterIt(
        result,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        message => !message.incomplete && !message.invalid || message.despiteMissing,
    );
  } else if (result.has('incomplete')) {
    filtered = filterIt(
        result,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        message => !message.invalid || message.despiteIncomplete,
    );
  }

  return nextArgs<InValidation.Message[]>(...filtered);
}
