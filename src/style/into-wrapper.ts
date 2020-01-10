/**
 * @module input-aspects
 */
import { asis } from 'call-thru';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectValue } from '../aspect.impl';
import { InControl } from '../control';
import { InStyledElement } from './styled-element.aspect';

/**
 * Creates input control converter that converts arbitrary control to the one with the given styled `element`.
 *
 * This is useful for controls without elements (such as input groups), or can be used to apply CSS classes to input
 * element wrappers (such as `form-group` in Bootstrap).
 *
 * @category Converter
 * @param element  A DOM element to apply styles to. Styles won't be applied when `null` or undefined.
 *
 * @returns Input control converter.
 */
export function intoWrapper<Value>(element?: InStyledElement | null): InControl.Converter<Value, Value>;

/**
 * Input control converter that converts arbitrary control to the one without styled element.
 *
 * This is useful e.g. when control element style is to be updated by other means.
 */
export function intoWrapper<Value>(from: InControl<Value>, to: InControl<Value>): InControl.Converters<Value, Value>;

export function intoWrapper<Value>(
    elementOrFrom: InStyledElement | null | InControl<Value> = null,
    to?: InControl<Value>,
): InControl.Converter<Value, Value> | InControl.Converters<Value, Value> {
  if (to != null) {
    return intoWrapper<Value>()(elementOrFrom as InControl<Value>, to);
  }

  return () => ({
    set: asis,
    get: asis,
    applyAspect<Instance, Kind extends InAspect.Application.Kind>(aspect: InAspect<Instance, Kind>) {
      return aspect as InAspect<any> === InStyledElement[InAspect__symbol]
          ? inAspectValue(elementOrFrom) as InAspect.Application.Result<Instance, Value, Kind>
          : undefined;
    },
  });
}
