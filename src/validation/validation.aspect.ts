import {
  afterEach,
  AfterEvent,
  AfterEvent__symbol,
  afterSupplied,
  digAfter_,
  EventKeeper,
  mapAfter,
  translateAfter,
} from '@proc7ts/fun-events';
import { Supply } from '@proc7ts/primitives';
import {
  flatMapArray,
  itsEach,
  mapIt,
  overArray,
  overEntries,
  overNone,
  PushIterable,
  PushIterator,
  PushIterator__symbol,
} from '@proc7ts/push-iterator';
import { builtInAspect } from '../applied-aspect';
import { InAspect, InAspect__symbol } from '../aspect';
import { InContainer } from '../containers';
import { InControl } from '../control';
import { requireAll } from './require-all.validator';
import { InValidator } from './validator';
import { InValidationMessages } from './validator.impl';

/**
 * @internal
 */
const InValidation__aspect: InAspect<InValidation<any>, 'validation'> = {
  applyTo<TValue>(control: InControl<TValue>) {
    return builtInAspect<TValue, InValidation<TValue>, 'validation'>(
        control,
        InValidation,
        <TValue>(ctrl: InControl<TValue>, origin?: InControl<any>): InValidation<any> => {

          const validation = new InControlValidation<TValue>(ctrl);

          if (origin) {
            validation.by(
                origin.aspect(InValidation).read.do(
                    translateAfter((send, result) => send(...result.messages())),
                ),
            );
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
 * @typeParam TValue - Input value type.
 */
export abstract class InValidation<TValue> implements EventKeeper<[InValidation.Result]> {

  /**
   * Input validation aspect.
   */
  static get [InAspect__symbol](): InAspect<InValidation<any>, 'validation'> {
    return InValidation__aspect;
  }

  /**
   * An `AfterEvent` keeper of input validation result.
   *
   * An `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[InValidation.Result]>;

  [AfterEvent__symbol](): AfterEvent<[InValidation.Result]> {
    return this.read;
  }

  /**
   * Validates the input using the given validators.
   *
   * Messages sent by each registered validator are handled independently. This means that every time the event received
   * from validator, it replaces the list of validation messages reported previously by the same validator. But it never
   * affects messages received from other validators.
   *
   * @param validators - Input validators to use.
   *
   * @returns Validators supply. Removes validators and their messages once cut off.
   */
  abstract by(...validators: InValidator<TValue>[]): Supply;

}

/**
 * @category Aspect
 */
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
     * @param code - Target code. All messages reported when absent.
     *
     * @returns An array of matching messages. Possibly empty.
     */
    messages(code?: string): readonly Message[];

    /**
     * Checks whether there are errors with the given code.
     *
     * @param code - Target code. Any message matches when absent.
     *
     * @returns `true` if there is at least one message with the given code, or `false` otherwise.
     */
    has(code?: string): boolean;

    /**
     * Checks whether there are errors without the given codes.
     *
     * @param codes - Excluded codes. Any message matches when empty.
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
 * @param messages - Input validation messages.
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
class InControlValidation<TValue> extends InValidation<TValue> {

  readonly _messages: InValidationMessages<TValue>;
  readonly read: AfterEvent<[InValidation.Result]>;

  constructor(control: InControl<TValue>) {
    super();
    this._messages = new InValidationMessages(control);

    this.read = afterSupplied(this._messages).do<AfterEvent<[InValidation.Result]>>(
        mapAfter(inValidationResult),
    );

    const container = control.aspect(InContainer);

    if (container) {
      this._messages.from(nestedInValidationMessages(container));
    }
  }

  by(...validators: InValidator<TValue>[]): Supply {
    return this._messages.from(requireAll(...validators));
  }

}

/**
 * @internal
 */
function nestedInValidationMessages(container: InContainer<any>): EventKeeper<InValidation.Message[]> {
  return container.controls.read.do(
      digAfter_(controls => afterEach(...mapIt(controls, control => control.aspect(InValidation)))),
      translateAfter((send, ...results) => send(...flatMapArray(results, ([result]) => result))),
  );
}

declare module '../aspect' {

  export namespace InAspect.Application {

    export interface Map<TInstance, TValue> {

      /**
       * Input validation aspect application type.
       */
      validation(): InValidation<TValue>;

    }

  }

}
