import { EventKeeper } from 'fun-events';
import { InControl } from '../in-control';
import { InValidation } from './in-validation.aspect';

/**
 * Input validator.
 *
 * Validator can be added to input validation aspect using `InValidation.by()` method. After that all validation
 * messages it sends are reported by validation aspect. Multiple messages could be sent at a time. These messages
 * replace the previously sent ones. To report the absence of error just send an empty event without messages.
 *
 * This can be one either a validation messages event keeper, or a function returning one and accepting input control
 * as its only parameter.
 */
export type InValidator<V> =
    | EventKeeper<InValidation.Message[]>
    | ((this: void, control: InControl<V>) => EventKeeper<InValidation.Message[]>);
