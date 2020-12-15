/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import { InAspect } from '../aspect';
import { InControl } from '../control';
import { InConverter, intoConvertedAspects } from '../converter';
import { inValueOf } from './value-of.control';

/**
 * Abstract input control implementation.
 *
 * Allows to define default input aspects.
 *
 * @category Control
 * @typeParam TValue - Input value type.
 */
export abstract class AbstractInControl<TValue> extends InControl<TValue> {

  /**
   * @internal
   */
  private readonly _aspectConversion: InConverter.Aspect.Conversion<TValue>;

  /**
   * Constructs input control.
   *
   * @param aspects - Input aspects applied by default. These are aspect converters to constructed control
   * from the {@link inValueOf same-valued one}.
   */
  protected constructor(
      {
        aspects,
      }: {
        readonly aspects?: InConverter.Aspect<TValue> | readonly InConverter.Aspect<TValue>[];
      },
  ) {
    super();
    this._aspectConversion = intoConvertedAspects(aspects)(inValueOf(this), this);
  }

  protected _applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
      aspect: InAspect<TInstance, TKind>,
  ): InAspect.Application.Result<TInstance, TValue, TKind> | undefined {
    return this._aspectConversion.applyAspect(aspect) || super._applyAspect(aspect);
  }

}
