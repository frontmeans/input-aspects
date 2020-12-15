/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import { isPresent, noop, valueProvider } from '@proc7ts/primitives';
import { filterArray, itsReduction, overElementsOf } from '@proc7ts/push-iterator';
import { InAspect } from './aspect';
import { InControl } from './control';

/**
 * Input control converter. Either aspect-only, or value one.
 *
 * Either a {@link InConverter.Conversion control conversion}, or a {@link InConverter.Factory conversion factory}.
 *
 * @category Converter
 * @typeParam TFrom - Original input value type.
 * @typeParam TTo - Converted input value type.
 */
export type InConverter<TFrom, TTo> =
    | InConverter.Conversion<TFrom, TTo>
    | InConverter.Factory<TFrom, TTo>;

export namespace InConverter {

  /**
   * Input control conversion factory signature. Either aspect-only, or value one.
   *
   * @typeParam TFrom - Original input value type.
   * @typeParam TTo - Converted input value type.
   */
  export type Factory<TFrom, TTo> = (
      this: void,
      from: InControl<TFrom>,
      to: InControl<TTo>,
  ) => Conversion<TFrom, TTo>;

  /**
   * Input control conversion. Either aspect-only, or full one.
   *
   * @typeParam TFrom - Original input value type.
   * @typeParam TTo - Converted input value type.
   */
  export type Conversion<TFrom, TTo> =
      | InConverter.Value.Conversion<TFrom, TTo>
      | InConverter.Aspect.Conversion<TTo>;

  /**
   * Input control value converter.
   *
   * Either a {@link InConverter.Value.Conversion control value conversion}, or a {@link InConverter.Value.Factory
   * value conversion factory}.
   *
   * @typeParam TFrom - Original input value type.
   * @typeParam TTo - Converted input value type.
   */
  export type Value<TFrom, TTo> =
      | InConverter.Value.Factory<TFrom, TTo>
      | InConverter.Value.Conversion<TFrom, TTo>;

  /**
   * Input control aspect converter.
   *
   * Either an {@link InConverter.Aspect.Conversion control aspect conversion}, or {@link InConverter.Aspect.Factory
   * aspect conversion factory}.
   *
   * @typeParam TFrom - Original input value type.
   * @typeParam TTo - Converted input value type.
   */
  export type Aspect<TFrom, TTo = TFrom> =
      | InConverter.Aspect.Conversion<TTo>
      | InConverter.Aspect.Factory<TFrom, TTo>;

}

export namespace InConverter.Value {

  /**
   * Input control value conversion factory signature.
   *
   * Called by {@link InControl.convert} to construct a {@link Conversion control conversion}.
   *
   * Should not access converted control value as the one does not exist at calling time.
   *
   * @typeParam TFrom - Original input value type.
   * @typeParam TTo - Converted input value type.
   */
  export type Factory<TFrom, TTo> =
  /**
   * @param from - Original input control.
   * @param to - Converted input control.
   *
   * @returns Control conversion.
   */
      (
          this: void,
          from: InControl<TFrom>,
          to: InControl<TTo>,
      ) => Conversion<TFrom, TTo>;

  /**
   * Input control value conversion.
   *
   * @typeParam TFrom - Original input value type.
   * @typeParam TTo - Converted input value type.
   */
  export interface Conversion<TFrom, TTo> {

    /**
     * Applies the given aspect to converted control in a custom way.
     *
     * @typeParam TInstance - Aspect instance type.
     * @typeParam TKind - Aspect application kind.
     * @param aspect - An aspect to apply.
     *
     * @returns Either applied aspect instance or `undefined` to apply the aspect in standard way (i.e. by converting
     * it from corresponding aspect of original control).
     */
    applyAspect?<TInstance, TKind extends InAspect.Application.Kind>(
        aspect: InAspect<TInstance, TKind>,
    ): InAspect.Application.Result<TInstance, TTo, TKind> | undefined;

    /**
     * Converts original value.
     *
     * @param value - Original value to convert.
     *
     * @returns New value of converted control.
     */
    set(value: TFrom): TTo;

    /**
     * Restores original control value by converted one.
     *
     * @param value - A converted value to restore the original one by.
     *
     * @returns New value of original control.
     */
    get(value: TTo): TFrom;

  }

}

export namespace InConverter.Aspect {

  /**
   * Input control aspect conversion factory signature.
   *
   * Called by {@link InControl.convert} to construct an {@link Conversion control aspect conversion}.
   *
   * Should not access converted control value as the one does not exist at calling time.
   *
   * @typeParam TFrom - Original input value type.
   * @typeParam TTo - Converted input value type.
   */
  export type Factory<TFrom, TTo = TFrom> = (
      this: void,
      from: InControl<TFrom>,
      to: InControl<TTo>,
  ) => Conversion<TTo>;

  /**
   * Input control aspect conversion.
   *
   * @typeParam Value - Input value type.
   */
  export interface Conversion<Value> {

    /**
     * Applies the given aspect to converted control in a custom way.
     *
     * @typeParam Instance - Aspect instance type.
     * @typeParam Kind - Aspect application kind.
     * @param aspect - An aspect to apply.
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
 * @typeParam Value - Input value type.
 * @param converters - Input control aspect converters.
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
 * @typeParam TFrom - Original input value type.
 * @typeParam TTo - Converted input value type.
 * @param converter - Input control converter.
 * @param converters - Additional input control aspect converters.
 *
 * @returns Input control value conversion factory.
 */
export function intoConvertedBy<TFrom, TTo>(
    converter: InConverter.Value<TFrom, TTo>,
    ...converters: InConverter.Aspect<TFrom, TTo>[]
): InConverter.Value.Factory<TFrom, TTo>;

/**
 * Creates converter that combines any input control converter with aspect converters.
 *
 * @category Converter
 * @typeParam TFrom - Original input value type.
 * @typeParam TTo - Converted input value type.
 * @param converter - Input control converter.
 * @param converters - Additional input control aspect converters.
 *
 * @returns Input control conversion factory.
 */
export function intoConvertedBy<TFrom, TTo>(
    converter?: InConverter<TFrom, TTo>,
    ...converters: InConverter.Aspect<TFrom, TTo>[]
): InConverter.Factory<TFrom, TTo>;

export function intoConvertedBy<TFrom, TTo>(
    valueOrAspectConverter?: InConverter<TFrom, TTo> | InConverter.Aspect<TFrom, TTo>,
    ...converters: InConverter.Aspect<TFrom, TTo>[]
): InConverter.Factory<TFrom, TTo> {

  type AspectApplicator = <Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>,
  ) => InAspect.Application.Result<Instance, TTo, Kind> | undefined;

  if (!valueOrAspectConverter) {
    return noopInConverter;
  }

  const converter = inConverter(valueOrAspectConverter);

  if (!converters.length) {
    return converter;
  }

  const aspectConverters = converters.map<InConverter.Aspect.Factory<TFrom, TTo>>(inConverter);

  return (
      from,
      to,
  ): InConverter.Conversion<TFrom, TTo> => {

    const conversion = converter(from, to);
    const conversions = overElementsOf<InConverter.Conversion<TFrom, TTo>>(
        [conversion],
        filterArray<InConverter.Aspect.Conversion<TTo> | undefined, InConverter.Aspect.Conversion<TTo>>(
            aspectConverters.map(acf => acf(from, to)),
            isPresent,
        ),
    );

    const applyAspect: AspectApplicator = itsReduction(
        conversions,
        (prev: AspectApplicator, cv: InConverter.Conversion<TFrom, TTo>) => cv.applyAspect
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
 * @typeParam Value - Input value type.
 * @param aspects - Input aspect converter(s) to combine.
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
 * @param conversion - Input control conversion to check.
 *
 * @returns `false` if the given conversion has a {@link InConverter.Value.Conversion.set set} method,
 * or `true` if there is no one.
 */
export function isInAspectConversion<TFrom, TTo>(
    conversion: InConverter.Conversion<TFrom, TTo>,
): conversion is InConverter.Aspect.Conversion<TTo> {
  return !(conversion as Partial<InConverter.Value.Conversion<TFrom, TTo>>).set;
}

/**
 * @internal
 */
function inConverter<TFrom, TTo>(
    converter: InConverter.Value<TFrom, TTo>,
): InConverter.Value.Factory<TFrom, TTo>;

/**
 * @internal
 */
function inConverter<TFrom, TTo>(
    converter: InConverter.Aspect<TFrom, TTo>,
): InConverter.Aspect.Factory<TFrom, TTo>;

/**
 * @internal
 */
function inConverter<TFrom, TTo>(
    converter: InConverter<TFrom, TTo>,
): InConverter.Factory<TFrom, TTo>;

function inConverter<TFrom, TTo>(
    converter: InConverter<TFrom, TTo> | InConverter.Aspect<TFrom, TTo>,
): InConverter.Factory<TFrom, TTo> | InConverter.Aspect.Factory<TFrom, TTo> {
  return typeof converter === 'function' ? converter : valueProvider<any>(converter);
}
