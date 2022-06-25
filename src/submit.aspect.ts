import {
  afterAll,
  AfterEvent,
  AfterEvent__symbol,
  EventKeeper,
  mapAfter,
  supplyAfter,
  trackValue,
  translateAfter,
} from '@proc7ts/fun-events';
import { itsEvery } from '@proc7ts/push-iterator';
import { builtInAspect } from './applied-aspect';
import { InAspect, InAspect__symbol } from './aspect';
import { InControl } from './control';
import { InData } from './data';
import { InValidation, inValidationResult } from './validation';

/**
 * @internal
 */
const InSubmit__aspect: InAspect<InSubmit<any>, 'submit'> = {
  applyTo<TValue>(control: InControl<TValue>) {
    return builtInAspect(control, InSubmit, ctrl => new InControlSubmit(ctrl));
  },
};

/**
 * Input submit error.
 *
 * Contains submit messages as validation result.
 *
 * @category Aspect
 */
export class InSubmitError extends Error {

  /**
   * Input submit errors.
   */
  readonly errors: InValidation.Errors;

  /**
   * Constructs input submit error.
   *
   * @param errors - Input submit error messages. A `submit` code will be added to each of them, unless already present.
   */
  constructor(...errors: [InValidation.Message, ...InValidation.Message[]]) {
    super();
    this.errors = inValidationResult(
        ...errors.map(message => message.submit ? message : { ...message, submit: true }),
    ) as InValidation.Errors;
  }

}

/**
 * Input submit rejection error.
 *
 * Raised if submit is not ready or in process already.
 *
 * @category Aspect
 */
export class InSubmitRejectedError extends InSubmitError {

  /**
   * Constructs input submit rejection error.
   *
   * @param reason - A reason code.
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
 * @category Aspect
 * @typeParam TValue - Input value type.
 */
export abstract class InSubmit<TValue> implements EventKeeper<[InSubmit.Flags]> {

  static get [InAspect__symbol](): InAspect<InSubmit<any>, 'submit'> {
    return InSubmit__aspect;
  }

  /**
   * An `AfterEvent` keeper of submit status flags.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[InSubmit.Flags]>;

  [AfterEvent__symbol](): AfterEvent<[InSubmit.Flags]> {
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
   * @typeParam TResult - Submit result value type.
   * @param submitter - A submitter function that performs actual submit.
   *
   * @returns Submit result promise.
   */
  abstract submit<TResult>(submitter: InSubmit.Submitter<TValue, TResult>): Promise<TResult>;

  /**
   * Resets the submit.
   *
   * Clears submit failure messages. Resets `submitted` flag.
   */
  abstract reset(): void;

}

/**
 * @category Aspect
 */
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
   * @typeParam TValue - Input value type.
   * @typeParam TResult - Submit result value type.
   */
  export type Submitter<TValue, TResult> =
  /**
   * @param data - Input data to submit.
   * @param control - Input control the submit is performed for.
   *
   * @returns Submit result promise.
   */
      (
          this: void,
          data: TValue extends undefined ? never : TValue,
          control: InControl<TValue>,
      ) => Promise<TResult>;

}

class InControlSubmit<TValue> extends InSubmit<TValue> {

  readonly read: AfterEvent<[InSubmit.Flags]>;
  private readonly _flags = trackValue({ submitted: false, busy: false });
  private readonly _errors = trackValue<InValidation.Message[]>([]);

  constructor(private readonly _control: InControl<TValue>) {
    super();
    this.read = afterAll({
      flags: this._flags,
      data: this._control.aspect(InData),
      messages: this._control.aspect(InValidation),
    }).do(
        supplyAfter(this._control),
        mapAfter(({
          flags: [flags],
          data: [data],
          messages: [messages],
        }): InSubmit.Flags => ({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          ready: data !== undefined && (messages.ok || itsEvery(messages, message => !!message.submit)),
          submitted: flags.submitted,
          busy: flags.busy,
        })),
    );

    const validation = _control.aspect(InValidation);

    validation.by(this._errors.read.do(
        translateAfter((send, messages) => send(...messages)),
    ));
  }

  async submit<TResult>(submitter: InSubmit.Submitter<TValue, TResult>): Promise<TResult> {
    if (this._control.supply.isOff) {
      throw new InSubmitRejectedError('noInput');
    }
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
      errors = toInSubmitMessages(error);
      throw error;
    } finally {
      this._flags.it = { ...this._flags.it, busy: false };
      if (errors) {
        this._errors.it = errors;
      }
    }

    async function submitData(): Promise<TValue extends undefined ? never : TValue> {

      const { data: [d], flags: [{ ready }] } = await afterAll({
        data: control.aspect(InData),
        flags: submit,
      });

      return ready
          ? d as any
          : Promise.reject(new InSubmitRejectedError('notReady'));
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

/**
 * @internal
 */
function toInSubmitMessages(error: unknown): InValidation.Message[] {
  if (error instanceof InSubmitError) {
    return [...error.errors];
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  return [{ submit: error }];
}

declare module './aspect' {

  export namespace InAspect.Application {

    export interface Map<TInstance, TValue> {

      /**
       * Input submit aspect application type.
       */
      submit(): InSubmit<TValue>;

    }

  }

}
