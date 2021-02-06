import { InControl } from './control';

/**
 * Some aspect of the user input. Such as input focus or validity.
 *
 * An aspect is applied to input control first. This creates an aspect instance bound to that control. All
 * aspect-related operations are performed by that instance.
 *
 * @category Aspect
 * @typeParam TInstance - Aspect instance type.
 * @typeParam TKind - Aspect application kind.
 */
export interface InAspect<TInstance, TKind extends InAspect.Application.Kind = 'default'> {

  /**
   * Applies this aspect to the given input `control`.
   *
   * This method is called at most once per control when requested aspect is not applied to the control yet.
   *
   * @typeParam TValue - Input value type.
   * @param control - Input control to apply aspect to.
   *
   * @returns An aspect applied to the given `control`.
   */
  applyTo<TValue>(control: InControl<TValue>): InAspect.Applied<TValue, TInstance>;

}

/**
 * A symbol of aspect key property containing a reference to aspect.
 *
 * @category Aspect
 */
export const InAspect__symbol = (/*#__PURE__*/ Symbol('in-aspect'));

/**
 * @category Aspect
 */
export namespace InAspect {

  /**
   * A key of the aspect of user input.
   *
   * It is passed to `InControl.aspect()` method in order to apply target aspect to that control.
   *
   * This interface is typically implemented by aspect instance class object. I.e. by its static methods.
   *
   * @typeParam TInstance - Aspect instance type.
   * @typeParam TKind - Aspect application kind.
   */
  export interface Key<TInstance, TKind extends Application.Kind = 'default'> {

    /**
     * A referenced aspect of user input.
     */
    [InAspect__symbol]: InAspect<TInstance, TKind>;

  }

  /**
   * An input aspect applied to control.
   *
   * This is what returned from `InAspect.applyTo()` method. Contains aspect instance and its manipulation methods.
   *
   * @typeParam TValue - Input value type.
   * @typeParam TInstance - Aspect instance type.
   * @typeParam TConvertedInstance - A type of aspect instance applied to converted control.
   * The same as `Instance` by default.
   */
  export interface Applied<TValue, TInstance, TConvertedInstance extends TInstance = TInstance> {

    /**
     * Input aspect instance.
     */
    readonly instance: TInstance;

    /**
     * Converts an aspect to another value type.
     *
     * This method is called by input control created by {@link InControl.convert} method.
     *
     * @typeParam TTargetValue - Converted input value type.
     * @param target - Target input control.
     *
     * @returns The same aspect applied to `target` control, or `undefined` if aspect can not be converted.
     */
    convertTo<TTargetValue>(target: InControl<TTargetValue>): Applied<TTargetValue, TConvertedInstance> | undefined;

    /**
     * Converts an aspect to the same value type.
     *
     * When defined, this method is called instead of {@link convertTo} when converting aspect for converted control
     * with the same value. I.e. when {@link InConverter.Aspect aspect-only converters} used for conversion.
     *
     * @param target - Target input control.
     *
     * @returns The same aspect applied to `target` control, or `undefined` if aspect can not be converted.
     */
    attachTo?(target: InControl<TValue>): Applied<TValue, TInstance> | undefined;

  }

  export namespace Application {

    /**
     * A kind of input aspect application.
     *
     * This is a key of `InAspect.Application.Map` type.
     */
    export type Kind = keyof Map<unknown, unknown>;

    /**
     * A type of input aspect application result of the given application kind and input value type.
     *
     * @typeParam TInstance - Aspect instance type.
     * @typeParam TValue - Input value type.
     * @typeParam TKind - Aspect application kind.
     */
    export type Result<TInstance, TValue, TKind extends Kind> =
        Applied<TValue, Instance<TInstance, TValue, TKind>>;

    /**
     * A type of applied aspect instance of the given application kind and input value type.
     *
     * @typeParam TInstance - Aspect instance type.
     * @typeParam TValue - Input value type.
     * @typeParam TKind - Aspect application kind.
     */
    export type Instance<TInstance, TValue, TKind extends Kind> =
        ReturnType<Map<TInstance, TValue>[TKind]>;

    /**
     * A map implementing application result detection algorithms.
     *
     * Each method name here is a kind of aspect application, while the return value of this method is an aspect
     * instance type.
     *
     * @typeParam TInstance - Aspect instance type.
     * @typeParam TValue - Input value type.
     */
    export interface Map<TInstance, TValue> {

      /**
       * Default aspect application type. Just an aspect instance type.
       */
      default(): TInstance;

    }

  }

}
