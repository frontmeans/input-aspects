import { nextArgs } from 'call-thru';
import { EventKeeper } from 'fun-events';
import { InControl } from '../control';
import { InValidation } from './validation.aspect';

/**
 * Input validator that requires value to present.
 *
 * Reports empty (falsy) values with `missing` message code.
 */
export function requirePresent(control: InControl<any>): EventKeeper<InValidation.Message[]> {
  return control.read.keep.thru(value => value ? nextArgs() : { missing: 'missing' });
}
