/**
 * @module input-aspects
 */
import { flatMapIt, itsEach, mapIt, overEntries } from 'a-iterable';
import { asis, nextArgs } from 'call-thru';
import {
  AfterEvent,
  AfterEvent__symbol,
  afterEventFrom,
  afterEventFromEach,
  EventInterest,
  EventKeeper,
} from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { InContainer } from '../container';
import { InControl } from '../control';
import { requireAll } from './require-all.validator';
import { InValidator } from './validator';
import { InValidationMessages } from './validator.impl';

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
interface Aspect extends InAspect<InValidation<any>, 'validation'> {

  applyTo<Value>(control: InControl<Value>): Applied<Value>;

}

/**
 * An input validation aspect applied to control.
 */
interface Applied<Value> extends InAspect.Applied<InValidation<Value>, InValidation<any>> {

  convertTo<To>(target: InControl<To>): Applied<To>;

}

/**
 * Validation aspect of the input.
 *
 * Reports validation messages sent by registered validators. To register validator call a `InValidation.by()` method.
 *
 * Implements an `EventKeeper` interface by sending validation result whenever validation messages reported.
 *
 * A validation aspect of converted control reports all messages from original control in addition to its own.
 *
 * A validation aspect of input controls container reports all messages from nested controls in addition to its own.
 *
 * @category Aspect
 * @typeparam Value  Input value type.
 */
export abstract class InValidation<Value> implements EventKeeper<[InValidation.Result]> {

  /**
   * Input validation aspect.
   */
  static get [InAspect__symbol](): InAspect<InValidation<any>, 'validation'> {
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
   * Validates the input using the given validators.
   *
   * Messages sent by each registered validator are handled independently. This means that every time the event received
   * from validator, it replaces the list of validation messages reported previously by the same validator. But it never
   * affects messages received from other validators.
   *
   * @param validators  Input validators to use.
   *
   * @returns An event interest instance. Once this interest lost, the validators are unregistered, while their messages
   * removed.
   */
  abstract by(...validators: InValidator<Value>[]): EventInterest;

}

export namespace InValidation {

  /**
   * Input validation messages.
   *
   * This is a map of key/value pairs, where the key is a message code, while the value is arbitrary. Message codes
   * are ignored when their values are falsy (i.e. `!message[code] === true`).
   *
   * Some message codes are treated specially by convenience.
   */
  export interface Message {

    [code: string]: any;

    /**
     * Missing input.
     */
    missing?: any;

    /**
     * The message with this code would be reported by `requireNeeded()` validator despite there are messages with
     * `missing` code.
     */
    despiteMissing?: any;

    /**
     * Incomplete input, except missing one.
     */
    incomplete?: any;

    /**
     * The message with this code would be reported by `requireNeeded()` validator despite there are messages with
     * `incomplete` code.
     */
    despiteIncomplete?: any;

    /**
     * Invalid input, except missing or incomplete one.
     */
    invalid?: any;

    /**
     * Submit failure.
     *
     * This is set by input submit aspect.
     */
    submit?: any;

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
     * @param code  Target code. All messages reported when absent.
     *
     * @returns An array of matching messages. Possibly empty.
     */
    messages(code?: string): readonly Message[];

    /**
     * Checks whether there are errors with the given code.
     *
     * @param code  Target code. Any message matches when absent.
     *
     * @returns `true` if there is at least one message with the given code, or `false` otherwise.
     */
    has(code?: string): boolean;

    [Symbol.iterator](): IterableIterator<Message>;

  }

  /**
   * Successful input validation result.
   */
  export interface Ok extends Result {

    readonly ok: true;

  }

  /**
   * Unsuccessful input validation result.
   */
  export interface Errors extends Result {

    readonly ok: false;

  }

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
    itsEach(
        messages,
        message => {

          let nonEmpty = false;

          itsEach(overEntries(message), ([code, codePresent]) => {
            if (codePresent) {
              nonEmpty = true;

              const prev = this._byCode.get(code as string);

              if (prev) {
                prev.push(message);
              } else {
                this._byCode.set(code as string, [message]);
              }
            }
          });

          if (nonEmpty) {
            this._all.push(message);
          }
        }
    );
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

/**
 * Returns successful input validation result.
 *
 * @category Validation
 * @returns Successful input validation result.
 */
export function inValidationResult(): InValidation.Ok;

/**
 * Creates input validation result out of validation messages.
 *
 * @param messages  Input validation messages.
 *
 * @returns New input validation result containing the given `messages`.
 */
export function inValidationResult(...messages: InValidation.Message[]): InValidation.Result;

export function inValidationResult(...messages: InValidation.Message[]): InValidation.Result {
  return messages.length ? new InValidationErrors(messages) : noValidationErrors;
}

class InControlValidation<Value> extends InValidation<Value> {

  readonly _messages: InValidationMessages<Value>;
  readonly read: AfterEvent<[InValidation.Result]>;

  constructor(control: InControl<Value>) {
    super();
    this._messages = new InValidationMessages(control);

    const container = control.aspect(InContainer);

    if (container) {
      this._messages.from(nestedMessages(container));
    }

    this.read = afterEventFrom(this._messages).keep.thru(inValidationResult);
  }

  by(...validators: InValidator<Value>[]): EventInterest {
    return this._messages.from(requireAll(...validators));
  }

}

function nestedMessages(container: InContainer<any>): EventKeeper<InValidation.Message[]> {
  return container.controls.read.keep.dig_(
      nestedValidations
  ).keep.thru(
      combineValidationResults,
  );
}

function nestedValidations(controls: InContainer.Snapshot) {
  return afterEventFromEach(...mapIt(controls, control => control.aspect(InValidation)));
}

function combineValidationResults<NextReturn>(...[messages]: [InValidation.Result][]) {

  const msg: Iterable<InValidation.Message> = flatMapIt(messages, asis);

  return nextArgs<InValidation.Message[], NextReturn>(...msg);
}

declare module '../aspect' {

  export namespace InAspect.Application {

    export interface Map<OfInstance, OfValue> {

      /**
       * Input validation aspect application type.
       */
      validation(): InValidation<OfValue>;

    }

  }

}
