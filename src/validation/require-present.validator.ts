/**
 * @packageDocumentation
 * @module input-aspects
 */
import { nextArgs } from 'call-thru';
import { EventKeeper } from 'fun-events';
import { InControl } from '../control';
import { InValidation } from './validation.aspect';
import { InValidator } from './validator';

/**
 * Creates input validator that requires value to present.
 *
 * Reports empty (falsy) values with `missing` message code.
 *
 * @category Validation
 */
export function requirePresent(): InValidator<any>;

/**
 * Input validator that requires value to present.
 *
 * Reports empty (falsy) values with `missing` message code.
 */
export function requirePresent(control: InControl<any>): EventKeeper<InValidation.Message[]>;

export function requirePresent(
    control?: InControl<any>,
): InValidator<any> | EventKeeper<InValidation.Message[]> {
  return control
      ? control.read().keepThru(value => value ? nextArgs() : { missing: 'missing' })
      : requirePresent;
}
