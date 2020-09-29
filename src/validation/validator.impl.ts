import {
  AfterEvent,
  AfterEvent__symbol,
  afterEventBy,
  afterSupplied,
  EventEmitter,
  EventKeeper,
  EventSupply,
  eventSupply,
} from '@proc7ts/fun-events';
import { noop, valuesProvider } from '@proc7ts/primitives';
import { flatMapIt, itsEach } from '@proc7ts/push-iterator';
import { InControl } from '../control';
import { InValidation } from './validation.aspect';
import { inValidator, InValidator } from './validator';

const dontRemove = {};

/**
 * @internal
 */
export class InValidationMessages<Value> implements EventKeeper<InValidation.Message[]> {

  readonly _messages: AfterEvent<InValidation.Message[]>;
  readonly from: (this: void, validator: InValidator<Value>) => EventSupply;

  constructor(control: InControl<Value>) {

    const emitter = new EventEmitter<InValidation.Message[]>();
    const validators = new Map<AfterEvent<InValidation.Message[]>, EventSupply>();
    const validatorMessages = new Map<InValidator<Value>, InValidation.Message[]>();
    // Sends validation messages
    let send: () => void = noop;
    // Validates using the given validator
    let validate: (validator: AfterEvent<InValidation.Message[]>, validatorSupply: EventSupply) => void = noop;

    this._messages = afterEventBy<InValidation.Message[]>(receiver => {

      // Validation messages supply
      const resultSupply = afterSupplied(emitter, valuesProvider()).to(receiver).whenOff(() => {
        send = noop; // Disable message sending
        validate = noop; // Disable validation
      });

      // Enable validation using the given validator
      validate = (validator: AfterEvent<InValidation.Message[]>, validatorSupply: EventSupply) => {

        const supply = validator.to(
            (...messages) => {
              if (messages.length) {
                // Replace messages reported by validator.
                validatorMessages.set(validator, messages);
              } else if (!validatorMessages.delete(validator)) {
                // Nothing removed. No need to send messages
                return;
              }
              send(); // Send all messages.
            },
        )
            .needs(validatorSupply)
            .whenOff(reason => {
              if (reason !== dontRemove) {
                validatorSupply.off(reason);
              }
              if (validatorMessages.delete(validator)) {
                // Send all messages only if the removed validator reported some messages earlier
                send();
              }
            });

        resultSupply.whenOff(() => supply.off(dontRemove));
      };

      // Enable each validator
      itsEach(validators.entries(), ([validator, validatorSupply]) => validate(validator, validatorSupply));

      // Enable message sending
      send = () => {
        emitter.send(...allMessages());
      };

      // Send messages if present already
      if (validatorMessages.size) {
        send();
      }
    }).share().tillOff(control);

    this.from = validator => {

      const source = inValidator(validator)(control);
      const validatorSupply = eventSupply(() => {
        validators.delete(source);
      });

      validators.set(source, validatorSupply);
      validate(source, validatorSupply); // Start validation using validator

      return validatorSupply.needs(control);
    };

    function allMessages(): Iterable<InValidation.Message> {
      return flatMapIt(validatorMessages.values());
    }
  }

  [AfterEvent__symbol](): AfterEvent<InValidation.Message[]> {
    return this._messages;
  }

}
