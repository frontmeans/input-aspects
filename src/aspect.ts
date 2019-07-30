/**
 * @module input-aspects
 */
import { InControl } from './control';

/**
 * Some aspect of the user input. Such as input focus or validity.
 *
 * An aspect is applied to input control first. This creates an aspect instance bound to that control. All
 * aspect-related operations are performed by that instance.
 *
 * @category Aspect
 * @typeparam Instance  Aspect instance type.
 * @typeparam Kind  Aspect application kind.
 */
export interface InAspect<Instance, Kind extends InAspect.Application.Kind = 'default'> {

  /**
   * Applies this aspect to the given input `control`.
   *
   * This method is called at most once per control when requested aspect is not applied to the control yet.
   *
   * @typeparam Value  Input value type.
   * @param control  Input control to apply aspect to.
   *
   * @returns An aspect applied to the given `control`.
   */
  applyTo<Value>(control: InControl<Value>): InAspect.Applied<Instance>;

}

/**
 * A symbol of aspect key property containing a reference to aspect.
 *
 * @category Aspect
 */
export const InAspect__symbol = /*#__PURE__*/ Symbol('in-aspect');

export namespace InAspect {

  /**
   * A key of the aspect of user input.
   *
   * It is passed to `InControl.aspect()` method in order to apply target aspect to that control.
   *
   * This interface is typically implemented by aspect instance class object. I.e. by its static methods.
   *
   * @typeparam Instance  Aspect instance type.
   * @typeparam Kind  Aspect application kind.
   */
  export interface Key<Instance, Kind extends Application.Kind = 'default'> {

    /**
     * A referenced aspect of user input.
     */
    [InAspect__symbol]: InAspect<Instance, Kind>;

  }

  /**
   * An input aspect applied to control.
   *
   * This is what returned from `InAspect.applyTo()` method. Contains aspect instance and its manipulation methods.
   *
   * @typeparam Instance  Aspect instance type.
   * @typeparam ConvertedInstance  A type of aspect instance applied to converted control.
   * The same as `Instance` by default.
   */
  export interface Applied<Instance, ConvertedInstance extends Instance = Instance> {

    /**
     * Input aspect instance.
     */
    readonly instance: Instance;

    /**
     * Converts an aspect to another value type.
     *
     * This method is called by input control created by `InControl.convert()` method.
     *
     * @typeparam To  Converted input value type.
     * @param target  Target input control.
     *
     * @returns The same aspect applied to `target` control, or `undefined` if aspect can not be converted.
     */
    convertTo<To>(target: InControl<To>): Applied<ConvertedInstance> | undefined;

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
     * @typeparam OfInstance  Aspect instance type.
     * @typeparam OfValue  Input value type.
     * @typeparam OfKind  Aspect application kind.
     */
    export type Result<OfInstance, OfValue, OfKind extends Kind> =
        Applied<Instance<OfInstance, OfValue, OfKind>>;

    /**
     * A type of applied aspect instance of the given application kind and input value type.
     *
     * @typeparam OfInstance  Aspect instance type.
     * @typeparam OfValue  Input value type.
     * @typeparam OfKind  Aspect application kind.
     */
    export type Instance<OfInstance, OfValue, OfKind extends Kind> =
        ReturnType<Map<OfInstance, OfValue>[OfKind]>;

    /**
     * A map implementing application result detection algorithms.
     *
     * Each method name here is a kind of aspect application, while the return value of this method is an aspect
     * instance type.
     *
     * @typeparam OfInstance  Aspect instance type.
     * @typeparam OfValue  Input value type.
     */
    export interface Map<OfInstance, OfValue> {

      /**
       * Default aspect application type. Just an aspect instance type.
       */
      default(): OfInstance;

    }

  }

}
