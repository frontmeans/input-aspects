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
   * Input control conversion factory.
   *
   * It is a function called by `InControl.convert()` method to construct a
   * {@link InConverter.Conversion control conversion}.
   *
   * This function should not access converted control value as the one does not exist at calling time.
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

}
