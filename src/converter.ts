/**
 * @module input-aspects
 */
import { InAspect } from './aspect';
import { InControl } from './control';

/**
 * Input control converter.
 *
 * Either a {@link InConverter.Conversion control conversion}, or a {@link InConverter.Factory conversion factory}.
 *
 * @category Converter
 * @typeparam From  Original input value type.
 * @typeparam To  Converted input value type.
 */
export type InConverter<From, To> =
    | InConverter.Factory<From, To>
    | InConverter.Conversion<From, To>;

export namespace InConverter {

  /**
   * Input control conversion factory signature.
   *
   * Called by [[InControl.convert]] to construct a {@link Conversion control conversion}.
   *
   * Should not access converted control value as the one does not exist at calling time.
   *
   * @typeparam From  Original input value type.
   * @typeparam To  Converted input value type.
   */
  export type Factory<From, To> =
  /**
   * @param from  Original input control.
   * @param to  Converted input control.
   *
   * @returns Control conversion.
   */
      (
          this: void,
          from: InControl<From>,
          to: InControl<To>,
      ) => InConverter.Conversion<From, To>;

  /**
   * Input control conversion.
   *
   * @typeparam From  Original input value type.
   * @typeparam To  Converted input value type.
   */
  export interface Conversion<From, To> {

    /**
     * Applies the given aspect to converted control in a custom way.
     *
     * @typeparam Instance  Aspect instance type.
     * @typeparam Kind  Aspect application kind.
     * @param aspect  An aspect to apply.
     *
     * @returns Either applied aspect instance or `undefined` to apply the aspect in standard way (i.e. by converting
     * it from corresponding aspect of original control).
     */
    applyAspect?<Instance, Kind extends InAspect.Application.Kind>(
        aspect: InAspect<Instance, Kind>,
    ): InAspect.Application.Result<Instance, To, Kind> | undefined;

    /**
     * Converts original value.
     *
     * @param value  Original value to convert.
     *
     * @returns New value of converted control.
     */
    set(this: void, value: From): To;

    /**
     * Restores original control value by converted one.
     *
     * @param value  A converted value to restore the original one by.
     *
     * @returns New value of original control.
     */
    get(this: void, value: To): From;

  }

  /**
   * Input control aspect converter.
   *
   * Either an {@link InConverter.Aspect.Conversion control aspect conversion}, or {@link InConverter.Aspect.Factory
   * input aspect conversion factory}.
   *
   * @typeparam From  Original input value type.
   * @typeparam To  Converted input value type.
   */
  export type Aspect<From, To> =
    | InConverter.Aspect.Conversion<To>
    | InConverter.Aspect.Factory<From, To>;

}

export namespace InConverter.Aspect {

  /**
   * Input control aspect conversion factory signature.
   *
   * Called by [[InControl.convert]] to construct an {@link Conversion control aspect conversion}.
   *
   * Should not access converted control value as the one does not exist at calling time.
   *
   * @typeparam From  Original input value type.
   * @typeparam To  Converted input value type.
   */
  export type Factory<From, To> = (
      this: void,
      from: InControl<From>,
      to: InControl<To>,
  ) => Conversion<To>;

  /**
   * Input control aspect conversion.
   *
   * @typeparam Value  Input value type.
   */
  export interface Conversion<Value> {

    get?: undefined;

    set?: undefined;

    /**
     * Applies the given aspect to converted control in a custom way.
     *
     * @typeparam Instance  Aspect instance type.
     * @typeparam Kind  Aspect application kind.
     * @param aspect  An aspect to apply.
     *
     * @returns Either applied aspect instance or `undefined` to apply the aspect in standard way (i.e. by converting
     * it from corresponding aspect of original control).
     */
    applyAspect<Instance, Kind extends InAspect.Application.Kind>(
        aspect: InAspect<Instance, Kind>,
    ): InAspect.Application.Result<Instance, Value, Kind> | undefined;

  }
}
