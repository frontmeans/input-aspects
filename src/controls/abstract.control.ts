/**
 * @packageDocumentation
 * @module input-aspects
 */
import { InAspect } from '../aspect';
import { InControl } from '../control';
import { InConverter, intoConvertedBy } from '../converter';
import { inValueOf } from './value-of.control';

/**
 * Abstract input control implementation.
 *
 * Allows to define default input aspects.
 */
export abstract class AbstractInControl<Value> extends InControl<Value> {

  /**
   * @internal
   */
  private readonly _aspectConversion: InConverter.Aspect.Conversion<Value>;

  /**
   * Constructs input control.
   *
   * @param aspects  Input aspects applied by default. These are aspect converters to constructed control
   * from {@link inValueOf same-valued one}.
   */
  protected constructor(
      {
        aspects,
      }: {
        aspects?: InConverter.Aspect<Value> | readonly InConverter.Aspect<Value>[];
      } = {},
  ) {
    super();

    const conversionFactory: InConverter.Aspect.Factory<Value> = aspects
        ? ((/*#__INLINE__*/ isArray(aspects)) ? intoConvertedBy(...aspects) : intoConvertedBy(aspects))
        : intoConvertedBy<Value>();

    this._aspectConversion = conversionFactory(inValueOf(this), this);
  }

  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>,
  ): InAspect.Application.Result<Instance, Value, Kind> | undefined {
    return this._aspectConversion.applyAspect(aspect) || super._applyAspect(aspect);
  }

}

function isArray<T>(value: T | readonly T[] | undefined): value is readonly T[] {
  return Array.isArray(value);
}
