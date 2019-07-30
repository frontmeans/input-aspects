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
 * @param element
 */
export function intoWrapper<Value>(element: InStyledElement): InControl.Converter<Value, Value> {
  return () => ({
    set: asis,
    get: asis,
    applyAspect<Instance, Kind extends InAspect.Application.Kind>(aspect: InAspect<Instance, Kind>) {
      return aspect as InAspect<any> === InStyledElement[InAspect__symbol]
          ? inAspectValue(element) as InAspect.Application.Result<Instance, Value, Kind>
          : undefined;
    }
  });
}
