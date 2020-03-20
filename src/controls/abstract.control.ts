/**
 * @packageDocumentation
 * @module @proc7ts/input-aspects
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
   * from the {@link inValueOf same-valued one}.
   */
  protected constructor(
      {
        aspects,
      }: {
        readonly aspects?: InConverter.Aspect<Value> | readonly InConverter.Aspect<Value>[];
      },
  ) {
    super();
    this._aspectConversion = intoConvertedAspects(aspects)(inValueOf(this), this);
  }

  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>,
  ): InAspect.Application.Result<Instance, Value, Kind> | undefined {
    return this._aspectConversion.applyAspect(aspect) || super._applyAspect(aspect);
  }

}
