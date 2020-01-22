/**
 *@packageDocumentation
 *@module input-aspects
 */
import { filterIt } from 'a-iterable';
import { NextArgs, nextArgs } from 'call-thru';
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

  return (control: InControl<Value>) => validate(control).keep.thru(nextRequireNeededMessages);
}

/**
 * @internal
 */
function nextRequireNeededMessages<NextReturn>(
    ...messages: InValidation.Message[]
): NextArgs<InValidation.Message[], NextReturn> {

  const result = inValidationResult(...messages);
  let filtered: Iterable<InValidation.Message> = result;

  if (result.has('missing')) {
    filtered = filterIt(
        result,
        message => !message.incomplete && !message.invalid || message.despiteMissing,
    );
  } else if (result.has('incomplete')) {
    filtered = filterIt(
        result,
        message => !message.invalid || message.despiteIncomplete,
    );
  }

  return nextArgs<InValidation.Message[], NextReturn>(...filtered);
}
