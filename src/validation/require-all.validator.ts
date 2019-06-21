import { InControl } from '../control';
import { requireNothing } from './require-nothing.validator';
import { InValidator } from './validator';
import { InValidationMessages } from './validator.impl';

/**
 * Constructs input validator that validates using all listed validators.
 *
 * @param validators Validators to validate the input with.
 *
 * @returns Validator that requires all the given `validators`. Or just the given validator if it the only one given.
 */
export function requireAll<Value>(...validators: InValidator<Value>[]): InValidator<Value> {

  const numValidators = validators.length;

  if (numValidators === 1) {
    return validators[0];
  }
  if (!numValidators) {
    return requireNothing;
  }

  return (control: InControl<Value>) => {

    const messages = new InValidationMessages(control);

    validators.forEach(validator => messages.from(validator));

    return messages;
  };
}
