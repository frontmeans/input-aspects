/**
 * @module input-aspects
 */
import { itsEvery, mapIt } from 'a-iterable';
import { nextArgs, noop } from 'call-thru';
import { afterAll, AfterEvent, AfterEvent__symbol, EventKeeper, trackValue } from 'fun-events';
import { InAspect, InAspect__symbol } from './aspect';
import { InControl } from './control';
import { InData } from './data';
import { InValidation, inValidationResult } from './validation';

const InSubmit__aspect: InAspect<InSubmit<any>, 'submit'> = {
  applyTo<Value>(control: InControl<Value>) {
    return {
      instance: new InControlSubmit(control),
      convertTo: noop,
    };
  }
};

/**
 * Input submit error.
 *
 * Contains submit messages as validation result.
 *
 * @category Error
 */
export class InSubmitError extends Error {

  /**
   * Input submit errors.
   */
  readonly errors: InValidation.Errors;

  /**
   * Constructs input submit error.
   *
   * @param errors  Input submit error messages. A `submit` code will be added to each of them, unless already present.
   */
  constructor(...errors: [InValidation.Message, ...InValidation.Message[]]) {
    super();
    this.errors = inValidationResult(
        ...mapIt(errors, message => message.submit ? message : { ...message, submit: true }),
    ) as InValidation.Errors;
  }

}

/**
 * Input submit rejection error.
 *
 * Raised if submit is not ready or in process already.
 *
 * @category Error
 */
export class InSubmitRejectedError extends InSubmitError {

  /**
   * Constructs input submit rejection error.
   *
   * @param reason  A reason code.
   */
  constructor(reason: string) {
    super({ submit: 'rejected', rejected: reason, [reason]: true });
  }

}

/**
 * Input submit aspect.
 *
 * Allows to submit {@link InData input data} and reports submit status.
 *
 * Implements an `EventKeeper` interface by sending submit status flags to registered receivers.
 *
 * [input data]: InData
 *
 * @category Aspect
 * @typeparam Value  Input value type.
 */
export abstract class InSubmit<Value> implements EventKeeper<[InSubmit.Flags]> {

  static get [InAspect__symbol](): InAspect<InSubmit<any>, 'submit'> {
    return InSubmit__aspect;
  }

  /**
   * An `AfterEvent` keeper of submit status flag.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[InSubmit.Flags]>;

  get [AfterEvent__symbol](): AfterEvent<[InSubmit.Flags]> {
    return this.read;
  }

  /**
   * Attempts to submit the input data.
   *
   * 1. Sets `submitted` status flag.
   * 2.1. Rejects to submit if `busy` status flag is set, or if `ready` status flag is not set with
   *      [InSubmitRejectedError].
   *      Note that the latter mey be reset after the step 1. So this check is performed asynchronously.
   * 2.2. Otherwise, sets the `busy` status flag.
   * 3. Clears submit failure messages.
   * 4. Calls `submitter` function.
   * 5. Waits for the promise returned by `submitter` to resolve.
   * 5.1. Resolves the result promise if submit were successful.
   * 5.2. Otherwise, reports submit failure messages.
   * 6. Rejects the result promise.
   *
   * @param submitter  A submitter function that performs actual submit.
   *
   * @returns Submit result promise.
   */
  abstract submit<Result>(submitter: InSubmit.Submitter<Value, Result>): Promise<Result>;

  /**
   * Resets the submit.
   *
   * Clears submit failure messages. Resets `submitted` flag.
   */
  abstract reset(): void;

}

export namespace InSubmit {

  /**
   * Input submit status flags.
   *
   * The flags of nested control are combined with parent ones.
   */
  export interface Flags {

    /**
     * Whether the input is ready to be submitted.
     *
     * The submit won't happen until this flag becomes `true`.
     *
     * This is `true` when there is a data to submit, and no validation messages (except submit failure messages with
     * `submit` code).
     */
    ready: boolean;

    /**
     * Whether the input has been submitted.
     *
     * This becomes `true` on `InSubmit.submit()` method call. And becomes `false` on `InSubmit.reset()` method call.
     */
    submitted: boolean;

    /**
     * Whether the submit is in process.
     *
     * This becomes `true` when submit is initiated by `InSubmit.submit()` method call. And becomes `false` when submit
     * is completed.
     */
    busy: boolean;

  }

  /**
   * Input submitter function interface.
   *
   * A submitter is passed to `InSubmit.submit()` method to perform the actual submit.
   *
   * A submit failure (a returned promise rejection) is reported as validation messages. This can be either a
   * [InSubmitError], or arbitrary error. Previously reported submit messages are replaced by the reported ones,
   * and cleared on a new submit.
   *
   * @typeparam Value  Input value type.
   * @typeparam Result  Submit result value type.
   */
  export type Submitter<Value, Result> =
  /**
   * @param data  Input data to submit.
   * @param control  Input control the submit is performed for.
   *
   * @returns Submit result promise.
   */
      (
          data: Value extends undefined ? never : Value,
          control: InControl<Value>,
      ) => Promise<Result>;

}

class InControlSubmit<Value> extends InSubmit<Value> {

  private readonly _flags = trackValue({ submitted: false, busy: false });
  private readonly _errors = trackValue<InValidation.Message[]>([]);
  readonly read: AfterEvent<[InSubmit.Flags]>;

  constructor(private readonly _control: InControl<Value>) {
    super();

    const validation = _control.aspect(InValidation);

    validation.by(this._errors.read.keep.thru(
        messages => nextArgs(...messages),
    ));
    this.read = afterAll({
      flags: this._flags,
      data: _control.aspect(InData),
      messages: validation,
    }).keep.thru(({ flags: [flags], data: [data], messages: [messages] }) => ({
      ready: data !== undefined && (messages.ok || itsEvery(messages, message => message.submit)),
      submitted: flags.submitted,
      busy: flags.busy,
    }));
  }

  async submit<Result>(submitter: InSubmit.Submitter<Value, Result>): Promise<Result> {
    if (this._flags.it.busy) {
      throw new InSubmitRejectedError('busy');
    }

    const submit = this;
    const control = this._control;
    let errors: InValidation.Message[] | undefined;

    this._flags.it = { ...this._flags.it, submitted: true, busy: true };
    try {
      if (this._errors.it.length) {
        this._errors.it = [];
      }
      return await submitter(await submitData(), control);
    } catch (error) {
      errors = toSubmitMessages(error);
      throw error;
    } finally {
      this._flags.it = { ...this._flags.it, busy: false };
      if (errors) {
        this._errors.it = errors;
      }
    }

    function submitData(): Promise<Value extends undefined ? never : Value> {

      return new Promise((resolve, reject) => {
        afterAll({
          data: control.aspect(InData),
          flags: submit.read,
        }).once(({ data: [d], flags: [{ ready }] }) => {
          if (!ready) {
            reject(new InSubmitRejectedError('notReady'));
          } else {
            resolve(d as any);
          }
        });
      });
    }
  }

  reset(): void {

    const flags = this._flags.it;

    if (flags.submitted) {
      this._flags.it = { ...flags, submitted: false };
    }
    if (this._errors.it.length) {
      this._errors.it = [];
    }
  }

}

function toSubmitMessages(error: any): InValidation.Message[] {
  if (error instanceof InSubmitError) {
    return [...error.errors];
  }
  return [{ submit: error }];
}

declare module './aspect' {

  export namespace InAspect.Application {

    export interface Map<OfInstance, OfValue> {

      /**
       * Input submit aspect application type.
       */
      submit(): InSubmit<OfValue>;

    }

  }

}
