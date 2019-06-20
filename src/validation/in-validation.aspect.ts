import { NextArgs, nextArgs, noop } from 'call-thru';
import {
  AfterEvent,
  AfterEvent__symbol,
  afterEventBy,
  afterEventFrom,
  EventEmitter,
  eventInterest,
  EventInterest,
  EventKeeper,
  isEventKeeper,
} from 'fun-events';
import { InAspect, InAspect__symbol } from '../in-aspect';
import { InControl } from '../in-control';
import { InValidator } from './in-validator';

const InValidation__aspect: Aspect = {
  applyTo<Value>(control: InControl<Value>): Applied<Value> {

    const instance = new InControlValidation(control);

    return {
      instance,
      convertTo<To>(target: InControl<To>) {
        return convert(instance, target);
      },
    };

    function convert<To>(
        from: InControlValidation<any>,
        to: InControl<To>,
    ): Applied<To> {

      const converted = new InControlValidation<To>(to);

      converted.by(from._messages);

      return {
        instance: converted,
        convertTo<CC>(target: InControl<CC>) {
          return convert<CC>(converted, target);
        },
      };
    }
  },
};

/**
 * Input validation aspect.
 */
interface Aspect extends InAspect<'validation', InValidation<any>> {

  applyTo<Value>(control: InControl<Value>): Applied<Value>;

}

/**
 * An input validation aspect applied to control.
 */
interface Applied<Value> extends InAspect.Applied<InValidation<Value>, Value, InValidation<any>> {

  convertTo<To>(target: InControl<To>): Applied<To>;

}

/**
 * Input validation aspect instance.
 *
 * Reports validation messages sent by registered validators. To register validator call a `InValidation.by()` method.
 *
 * Implements event keeper interface by sending validation result whenever validation messages reported.
 *
 * A validation aspect of converted control reports all messages from original control in addition to the ones sent
 * by validators registered in converted validation aspect explicitly.
 *
 * @typeparam Value Input value type.
 */
export abstract class InValidation<Value> implements EventKeeper<[InValidation.Result]> {

  /**
   * Input validation aspect.
   */
  static get [InAspect__symbol](): InAspect<'validation', InValidation<any>> {
    return InValidation__aspect;
  }

  get [AfterEvent__symbol](): AfterEvent<[InValidation.Result]> {
    return this.read;
  }

  /**
   * An `AfterEvent` registrar of validation result receivers.
   *
   * An `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[InValidation.Result]>;

  /**
   * Validates the input using the given validator.
   *
   * Messages sent by each registered validator are handled independently. This means that every time the event received
   * from validator, it replaces the list of validation messages reported previously by the same validator. But it never
   * affects messages received from other validators.
   *
   * @param validator Input validator to use.
   *
   * @returns An event interest instance. Once this interest is lost, the validator is unregistered, while its messages
   * removed.
   */
  abstract by(validator: InValidator<Value>): EventInterest;

}

export namespace InValidation {

  /**
   * Input validation messages.
   *
   * This is a map of key/value pairs, where the key is a message code, while the value is arbitrary. Message codes
   * are ignored when their values are falsy (i.e. `!message[code] === true`).
   */
  export interface Message {
    [code: string]: any;
  }

  /**
   * Input validation result.
   *
   * Combines messages sent by all registered validators.
   *
   * Implements `Iterable` interface by iterating over all validation messages.
   */
  export interface Result extends Iterable<Message> {

    /**
     * Whether validation succeed.
     *
     * This is `true` when there is no validation messages, or `false` otherwise.
     */
    readonly ok: boolean;

    /**
     * Returns messages with the given code.
     *
     * @param code Target code. All messages reported when absent.
     *
     * @returns An array of matching messages. Possibly empty.
     */
    messages(code?: string): readonly Message[];

    /**
     * Checks whether there are errors with the given code.
     *
     * @param code Target code. Any message matches when absent.
     *
     * @returns `true` if there is at least one message with the given code, or `false` otherwise.
     */
    has(code?: string): boolean;

    [Symbol.iterator](): IterableIterator<Message>;

  }

}

class InValidationMessages<Value> implements EventKeeper<InValidation.Message[]> {

  readonly [AfterEvent__symbol]: AfterEvent<InValidation.Message[]>;
  readonly from: (this: void, validator: InValidator<Value>) => EventInterest;

  constructor(control: InControl<Value>) {

    const emitter = new EventEmitter<InValidation.Message[]>();
    const validators = new Map<AfterEvent<InValidation.Message[]>, EventInterest>();
    const validatorMessages = new Map<InValidator<Value>, InValidation.Message[]>();
    // Sends validation messages
    let send: () => void = noop;
    // Validates using the given validator
    let validate: (validator: AfterEvent<InValidation.Message[]>, validatorInterest: EventInterest) => void = noop;

    this[AfterEvent__symbol] = afterEventBy(receiver => {

      // An interest for receiving validation messages
      const resultInterest = afterEventFrom(emitter, [])(receiver).whenDone(() => {
        send = noop; // Disable message sending
        validate = noop; // Disable validation
      });

      // Enable validation using the given validator
      validate = (validator: AfterEvent<InValidation.Message[]>, validatorInterest: EventInterest) => {
        validator((...messages) => {
          if (messages.length) {
            // Replace messages reported by validator.
            validatorMessages.set(validator, messages);
          } else if (!validatorMessages.delete(validator)) {
            // Nothing removed. No need to send messages
            return;
          }
          send(); // Send all messages.
        }).needs(validatorInterest).needs(resultInterest);
      };

      // Enable each validator
      for (const [validator, validatorInterest] of validators.entries()) {
        validate(validator, validatorInterest);
      }

      // Enable message sending
      send = () => {
        emitter.send(...allMessages());
      };

      // Send messages if present already
      if (validatorMessages.size) {
        send();
      }

      return resultInterest;
    }).share();

    this.from = validator => {

      const source = controlValidator(control, validator);
      const validatorInterest = eventInterest(() => {
        // Remove the validator
        validators.delete(source);
        if (validatorMessages.delete(source)) {
          // Send all messages only if the removed validator reported some messages earlier
          send();
        }
      });

      validators.set(source, validatorInterest);
      validate(source, validatorInterest); // Start validation using validator

      return validatorInterest;
    };

    function *allMessages(): Iterable<InValidation.Message> {
      for (const messages of validatorMessages.values()) {
        yield *messages;
      }
    }
  }

}

function controlValidator<Value>(
    control: InControl<Value>,
    validator: InValidator<Value>
): AfterEvent<InValidation.Message[]> {
  if (isEventKeeper(validator)) {
    return afterEventFrom(validator);
  }
  if (typeof validator === 'function') {
    return afterEventFrom(validator(control));
  }

  return control.read.keep.thru(simpleValidator(control, validator));
}

function simpleValidator<Value>(
    control: InControl<Value>,
    validator: InValidator.Simple<Value>,
): <NextReturn>(value: Value) => NextArgs<InValidation.Message[], NextReturn> | InValidation.Message {
  return <NextReturn>() => {

    const messages = validator.validate(control);

    return messages == null
        ? nextArgs()
        : Array.isArray(messages)
            ? nextArgs(...messages)
            : messages;
  };
}

const noValidationErrors: InValidation.Result = {
  get ok() {
    return true;
  },
  messages() {
    return [];
  },
  has() {
    return false;
  },
  [Symbol.iterator]() {
    return [][Symbol.iterator]();
  },
};

class InValidationErrors implements InValidation.Result {

  private readonly _all: InValidation.Message[];
  private readonly _byCode = new Map<string, InValidation.Message[]>();

  constructor(messages: InValidation.Message[]) {
    this._all = [];
    for (const message of messages) {

      let nonEmpty = false;

      for (const code of Object.keys(message)) {
        if (message[code]) {
          nonEmpty = true;

          const prev = this._byCode.get(code);

          if (prev) {
            prev.push(message);
          } else {
            this._byCode.set(code, [message]);
          }
        }
      }

      if (nonEmpty) {
        this._all.push(message);
      }
    }
  }

  get ok() {
    return !this._all.length;
  }

  messages(code?: string) {
    return code == null ? this._all : this._byCode.get(code) || [];
  }

  has(code?: string) {
    return code == null || this._byCode.has(code);
  }

  [Symbol.iterator]() {
    return this._all[Symbol.iterator]();
  }

}

function inValidationResult(...messages: InValidation.Message[]): InValidation.Result {
  return messages.length ? new InValidationErrors(messages) : noValidationErrors;
}

class InControlValidation<Value> extends InValidation<Value> {

  readonly _messages: InValidationMessages<Value>;
  readonly read: AfterEvent<[InValidation.Result]>;

  constructor(control: InControl<Value>) {
    super();
    this._messages = new InValidationMessages<Value>(control);
    this.read = afterEventFrom(this._messages).keep.thru(inValidationResult);
  }

  get by() {
    return this._messages.from;
  }

}

declare module '../in-aspect' {

  export namespace InAspect.Application {

    export interface Map<OfInstance, OfValue> {

      /**
       * Input validation aspect application type.
       */
      validation(): InValidation<OfValue>;

    }

  }

}
