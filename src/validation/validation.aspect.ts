/**
 * @packageDocumentation
 * @module @proc7ts/input-aspects
 */
import { nextArgs, NextCall } from '@proc7ts/call-thru';
import {
  afterEach,
  AfterEvent,
  AfterEvent__symbol,
  afterSupplied,
  EventKeeper,
  EventReceiver,
  EventSupply,
  nextAfterEvent,
  OnEventCallChain,
} from '@proc7ts/fun-events';
import {
  flatMapIt,
  itsEach,
  mapIt,
  overArray,
  overEntries,
  overNone,
  PushIterable,
  PushIterator,
  PushIterator__symbol,
} from '@proc7ts/push-iterator';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectSameOrBuild } from '../aspect.impl';
import { InContainer } from '../containers';
import { InControl } from '../control';
import { requireAll } from './require-all.validator';
import { InValidator } from './validator';
import { InValidationMessages } from './validator.impl';

/**
 * @internal
 */
const InValidation__aspect: InAspect<InValidation<any>, 'validation'> = {
  applyTo<Value>(control: InControl<Value>) {
    return inAspectSameOrBuild<Value, InValidation<Value>, 'validation'>(
        control,
        InValidation,
        <V>(ctrl: InControl<V>, origin?: InControl<any>): InValidation<any> => {

          const validation = new InControlValidation<V>(ctrl);

          if (origin) {

            const from = origin.aspect(InValidation);

            validation.by(from.read().keepThru(result => nextArgs(...result.messages())));
          }

          return validation;
        },
    );
  },
};

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

  /**
   * Builds an `AfterEvent` keeper of input validation result.
   *
   * An `[AfterEvent__symbol]` property is an alias of this one.
   *
   * @return `AfterEvent` keeper of validation result keeper.
   */
  abstract read(): AfterEvent<[InValidation.Result]>;

  /**
   * Starts sending validation result and updates to the given `receiver`
   *
   * @param receiver  Target validation result receiver.
   *
   * @returns Validation results supply.
   */
  abstract read(receiver: EventReceiver<[InValidation.Result]>): EventSupply;

  [AfterEvent__symbol](): AfterEvent<[InValidation.Result]> {
    return this.read();
  }

  /**
   * Validates the input using the given validators.
   *
   * Messages sent by each registered validator are handled independently. This means that every time the event received
   * from validator, it replaces the list of validation messages reported previously by the same validator. But it never
   * affects messages received from other validators.
   *
   * @param validators  Input validators to use.
   *
   * @returns Validators supply. Removes validators and their messages once cut off.
   */
  abstract by(...validators: InValidator<Value>[]): EventSupply;

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
  export type Message = {
    readonly [code in Extract<keyof GenericMessage, string>]?: any;
  };

  /**
   * Generic input validation messages.
   */
  export interface GenericMessage {

    readonly [code: string]: any;

    /**
     * Missing input.
     */
    readonly missing?: any;

    /**
     * The message with this code would be reported by `requireNeeded()` validator despite there are messages with
     * `missing` code.
     */
    readonly despiteMissing?: any;

    /**
     * Incomplete input, except missing one.
     */
    readonly incomplete?: any;

    /**
     * The message with this code would be reported by `requireNeeded()` validator despite there are messages with
     * `incomplete` code.
     */
    readonly despiteIncomplete?: any;

    /**
     * Invalid input, except missing or incomplete one.
     */
    readonly invalid?: any;

    /**
     * Submit failure.
     *
     * This is set by input submit aspect.
     */
    readonly submit?: any;

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

    /**
     * Checks whether there are errors without the given codes.
     *
     * @param codes  Excluded codes. Any message matches when empty.
     *
     * @returns `true` is there is at least one message without any of the given codes, or `false` otherwise.
     */
    hasBut(...codes: string[]): boolean;

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

/**
 * @internal
 */
const noInValidationErrors: InValidation.Result & PushIterable<InValidation.Message> = {
  get ok() {
    return true;
  },
  messages() {
    return [];
  },
  has() {
    return false;
  },
  hasBut() {
    return false;
  },
  [Symbol.iterator](): PushIterator<InValidation.Message> {
    return overNone();
  },
  [PushIterator__symbol](_accept): PushIterator<InValidation.Message> {
    return overNone();
  },
};

/**
 * @internal
 */
class InValidationErrors implements InValidation.Result, PushIterable<InValidation.Message> {

  private readonly _all: InValidation.Message[];
  private readonly _it: PushIterable<InValidation.Message>;
  private readonly _byCode = new Map<string, InValidation.Message[]>();

  constructor(messages: InValidation.Message[]) {
    this._all = [];
    this._it = overArray(this._all);
    messages.forEach(message => {

      let nonEmpty = false;

      itsEach(overEntries(message), ([code, codePresent]) => {
        if (codePresent) {
          nonEmpty = true;

          const prev = this._byCode.get(code);

          if (prev) {
            prev.push(message);
          } else {
            this._byCode.set(code, [message]);
          }
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (nonEmpty) {
        this._all.push(message);
      }
    });
  }

  get ok(): boolean {
    return !this._all.length;
  }

  messages(code?: string): InValidation.Message[] {
    return code == null ? this._all : this._byCode.get(code) || [];
  }

  has(code?: string): boolean {
    return code == null || this._byCode.has(code);
  }

  hasBut(...codes: string[]): boolean {
    return this._all.some(
        message => codes.every(code => !message[code]),
    );
  }

  [Symbol.iterator](): PushIterator<InValidation.Message> {
    return this[PushIterator__symbol]();
  }

  [PushIterator__symbol](accept?: PushIterator.Acceptor<InValidation.Message>): PushIterator<InValidation.Message> {
    return this._it[PushIterator__symbol](accept);
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
  return messages.length ? new InValidationErrors(messages) : noInValidationErrors;
}

/**
 * @internal
 */
class InControlValidation<Value> extends InValidation<Value> {

  readonly _messages: InValidationMessages<Value>;

  constructor(control: InControl<Value>) {
    super();
    this._messages = new InValidationMessages(control);

    const container = control.aspect(InContainer);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (container) {
      this._messages.from(nestedInValidationMessages(container));
    }

  }

  by(...validators: InValidator<Value>[]): EventSupply {
    return this._messages.from(requireAll(...validators));
  }

  read(): AfterEvent<[InValidation.Result]>;
  read(receiver: EventReceiver<[InValidation.Result]>): EventSupply;
  read(receiver?: EventReceiver<[InValidation.Result]>): AfterEvent<[InValidation.Result]> | EventSupply {
    return (this.read = afterSupplied(this._messages).keepThru(inValidationResult).F)(receiver);
  }

}

/**
 * @internal
 */
function nestedInValidationMessages(container: InContainer<any>): EventKeeper<InValidation.Message[]> {
  return container.controls.read().keepThru(
      nestedInValidations,
      combineInValidationResults,
  );
}

/**
 * @internal
 */
function nestedInValidations(
    controls: InContainer.Snapshot,
): NextCall<OnEventCallChain, [InValidation.Result][]> {
  return nextAfterEvent(afterEach(...mapIt(controls, control => control.aspect(InValidation))));
}

/**
 * @internal
 */
function combineInValidationResults(
    ...results: [InValidation.Result][]
): NextCall<OnEventCallChain, InValidation.Message[]> {
  return nextArgs(...flatMapIt(results, ([result]) => result));
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
