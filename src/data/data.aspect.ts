import { afterAll, AfterEvent, mapAfter } from '@proc7ts/fun-events';
import { builtInAspect } from '../applied-aspect';
import { InAspect, InAspect__symbol } from '../aspect';
import { InControl } from '../control';
import { InMode } from './mode.aspect';

/**
 * A data aspect of the input.
 *
 * Represents input control data that will be submitted.
 *
 * Input data is typically the same as control value with respect to {@link InMode input mode}. I.e. when input mode is
 * `off` the data is `undefined`.
 *
 * An aspect interface is an `AfterEvent` keeper of input data.
 *
 * @category Aspect
 * @typeParam TValue - Input value type.
 */
export type InData<TValue> = AfterEvent<[InData.DataType<TValue>?]>;

/**
 * @internal
 */
const InData__aspect: Aspect = {

  applyTo<TValue>(control: InControl<TValue>): Applied<TValue> {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return builtInAspect(control, InData, <TValue>(ctrl: InControl<TValue>) => afterAll({
      value: ctrl,
      mode: ctrl.aspect(InMode),
    }).do(mapAfter(
        ({ value: [value], mode: [mode] }) => InMode.hasData(mode)
            ? value as any
            : undefined,
    )));
  },

};

/**
 * Input data aspect.
 */
interface Aspect extends InAspect<InData<any>, 'data'> {

  applyTo<TValue>(control: InControl<TValue>): Applied<TValue>;

}

/**
 * An input data aspect applied to control.
 */
interface Applied<TValue> extends InAspect.Applied<TValue, InData<TValue>, InData<any>> {

  convertTo<TTo>(target: InControl<TTo>): Applied<TTo> | undefined;

}

/**
 * @category Aspect
 */
export const InData = {

  get [InAspect__symbol](): InAspect<InData<any>, 'data'> {
    return InData__aspect;
  },

};

/**
 * @category Aspect
 */
export namespace InData {

  /**
   * Input data type.
   *
   * This is either a partial value (for the object), or the value itself (for everything else).
   *
   * @typeParam TValue - Input value type.
   */
  export type DataType<TValue> =
      | (TValue extends object ? { [K in keyof TValue]?: DataType<TValue[K]> } : TValue)
      | undefined;

}

declare module '../aspect' {

  export namespace InAspect.Application {

    export interface Map<TInstance, TValue> {

      /**
       * Input data aspect application type.
       */
      data(): InData<TValue>;

    }

  }

}
