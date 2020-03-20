/**
 * @packageDocumentation
 * @module @proc7ts/input-aspects
 */
import { filterIt, flatMapIt, itsReduction, mapIt } from '@proc7ts/a-iterable';
import { isPresent, noop, valueProvider } from '@proc7ts/call-thru';
import { InAspect } from './aspect';
import { InControl } from './control';

/**
 * Input control converter. Either aspect-only, or value one.
 *
 * Either a {@link InConverter.Conversion control conversion}, or a {@link InConverter.Factory conversion factory}.
 *
 * @category Converter
 * @typeparam From  Original input value type.
 * @typeparam To  Converted input value type.
 */
export type InConverter<From, To> =
    | InConverter.Conversion<From, To>
    | InConverter.Factory<From, To>;

export namespace InConverter {

  /**
   * Input control conversion factory signature. Either aspect-only, or value one.
   *
   * @typeparam From  Original input value type.
   * @typeparam To  Converted input value type.
   */
  export type Factory<From, To> = (
      this: void,
      from: InControl<From>,
      to: InControl<To>,
  ) => Conversion<From, To>;

  /**
   * Input control conversion. Either aspect-only, or full one.
   *
   * @typeparam From  Original input value type.
   * @typeparam To  Converted input value type.
   */
  export type Conversion<From, To> =
      | InConverter.Value.Conversion<From, To>
      | InConverter.Aspect.Conversion<To>;

  /**
   * Input control value converter.
   *
   * Either a {@link InConverter.Value.Conversion control value conversion}, or a {@link InConverter.Value.Factory
   * value conversion factory}.
   *
   * @typeparam From  Original input value type.
   * @typeparam To  Converted input value type.
   */
  export type Value<From, To> =
      | InConverter.Value.Factory<From, To>
      | InConverter.Value.Conversion<From, To>;

  /**
   * Input control aspect converter.
   *
   * Either an {@link InConverter.Aspect.Conversion control aspect conversion}, or {@link InConverter.Aspect.Factory
   * aspect conversion factory}.
   *
   * @typeparam From  Original input value type.
   * @typeparam To  Converted input value type.
   */
  export type Aspect<From, To = From> =
      | InConverter.Aspect.Conversion<To>
      | InConverter.Aspect.Factory<From, To>;

}

export namespace InConverter.Value {

  /**
   * Input control value conversion factory signature.
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
      ) => Conversion<From, To>;

  /**
   * Input control value conversion.
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
    set(value: From): To;

    /**
     * Restores original control value by converted one.
     *
     * @param value  A converted value to restore the original one by.
     *
     * @returns New value of original control.
     */
    get(value: To): From;

  }

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
  export type Factory<From, To = From> = (
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

/**
 * Creates converter that combines input aspect converters.
 *
 * @typeparam Value  Input value type.
 * @param converters  Input control aspect converters.
 *
 * @returns Input control aspect conversion factory.
 */
export function intoConvertedBy<Value>(
    ...converters: InConverter.Aspect<Value, Value>[]
): InConverter.Aspect.Factory<Value, Value>;

/**
 * Creates converter that combines input value converter with aspect converters.
 *
 * @category Converter
 * @typeparam From  Original input value type.
 * @typeparam To  Converted input value type.
 * @param converter  Input control converter.
 * @param converters  Additional input control aspect converters.
 *
 * @returns Input control value conversion factory.
 */
export function intoConvertedBy<From, To>(
    converter: InConverter.Value<From, To>,
    ...converters: InConverter.Aspect<From, To>[]
): InConverter.Value.Factory<From, To>;

/**
 * Creates converter that combines any input control converter with aspect converters.
 *
 * @category Converter
 * @typeparam From  Original input value type.
 * @typeparam To  Converted input value type.
 * @param converter  Input control converter.
 * @param converters  Additional input control aspect converters.
 *
 * @returns Input control conversion factory.
 */
export function intoConvertedBy<From, To>(
    converter?: InConverter<From, To>,
    ...converters: InConverter.Aspect<From, To>[]
): InConverter.Factory<From, To>;

export function intoConvertedBy<From, To>(
    valueOrAspectConverter?: InConverter<From, To> | InConverter.Aspect<From, To>,
    ...converters: InConverter.Aspect<From, To>[]
): InConverter.Factory<From, To> {

  type AspectApplicator = <Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>,
  ) => InAspect.Application.Result<Instance, To, Kind> | undefined;

  if (!valueOrAspectConverter) {
    return noopInConverter;
  }

  const converter = inConverter(valueOrAspectConverter);

  if (!converters.length) {
    return converter;
  }

  const aspectConverters = mapIt<InConverter.Aspect<From, To>, InConverter.Aspect.Factory<From, To>>(
      converters,
      inConverter,
  );

  return (
      from,
      to,
  ): InConverter.Conversion<From, To> => {

    const conversion = converter(from, to);
    const conversions = flatMapIt<InConverter.Conversion<From, To>>([
        [conversion],
        filterIt<InConverter.Aspect.Conversion<To> | undefined, InConverter.Aspect.Conversion<To>>(
            mapIt(
                aspectConverters,
                acf => acf(from, to),
            ),
            isPresent,
        ),
    ]);


    const applyAspect: AspectApplicator = itsReduction(
        conversions,
        (prev: AspectApplicator, cv: InConverter.Conversion<From, To>) => cv.applyAspect
            ? (aspect => prev(aspect) || cv.applyAspect!(aspect))
            : prev,
        noop,
    );

    if (/*#__INLINE__*/ isInAspectConversion(conversion)) {
      return {
        applyAspect,
      };
    }

    return {
      set: conversion.set.bind(conversion),
      get: conversion.get.bind(conversion),
      applyAspect,
    };
  };
}

/**
 * Creates converter that combines input aspect converters.
 *
 * @category Converter
 * @typeparam Value  Input value type.
 * @param aspects  Input aspect converter(s) to combine.
 *
 * @returns Input aspect conversion factory.
 */
export function intoConvertedAspects<Value>(
    aspects?: InConverter.Aspect<Value> | readonly InConverter.Aspect<Value>[],
): InConverter.Aspect.Factory<Value> {
  return aspects
      ? ((/*#__INLINE__*/ isArray(aspects)) ? intoConvertedBy(...aspects) : intoConvertedBy(aspects))
      : intoConvertedBy<Value>();
}

function isArray<T>(value: T | readonly T[] | undefined): value is readonly T[] {
  return Array.isArray(value);
}

/**
 * @internal
 */
const noopInConversion: InConverter.Aspect.Conversion<any> = {
  applyAspect(): undefined {
    return;
  },
};

/**
 * @internal
 */
function noopInConverter(): InConverter.Aspect.Conversion<any> {
  return noopInConversion;
}

/**
 * Checks whether the given input control converter converts aspect only.
 *
 * @category Converter
 * @param conversion  Input control conversion to check.
 *
 * @returns `false` if the given conversion has a {@link InConverter.Value.Conversion.set set} method,
 * or `true` if there is no one.
 */
export function isInAspectConversion<From, To>(
    conversion: InConverter.Conversion<From, To>,
): conversion is InConverter.Aspect.Conversion<To> {
  return !(conversion as any).set;
}

/**
 * @internal
 */
function inConverter<From, To>(
    converter: InConverter.Value<From, To>,
): InConverter.Value.Factory<From, To>;

/**
 * @internal
 */
function inConverter<From, To>(
    converter: InConverter.Aspect<From, To>,
): InConverter.Aspect.Factory<From, To>;

/**
 * @internal
 */
function inConverter<From, To>(
    converter: InConverter<From, To>,
): InConverter.Factory<From, To>;

function inConverter<From, To>(
    converter: InConverter<From, To> | InConverter.Aspect<From, To>,
): InConverter.Factory<From, To> | InConverter.Aspect.Factory<From, To> {
  return typeof converter === 'function' ? converter : valueProvider<any>(converter);
}
