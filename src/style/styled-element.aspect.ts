/**
 * @packageDocumentation
 * @module input-aspects
 */
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectNull, inAspectValue } from '../aspect.impl';
import { InControl } from '../control';
import { InConverter } from '../converter';
import { InElement } from '../element.control';

/**
 * An input aspect representing DOM element to apply styles to.
 *
 * This is a HTML element for input element control, and `null` for everything else by default.
 *
 * @category Aspect
 */
export type InStyledElement = Element;

/**
 * @internal
 */
const InStyledElement__aspect: InAspect<InStyledElement | null> = {

  applyTo(control: InControl<any>): InAspect.Applied<any, InStyledElement | null> {

    const element = control.aspect(InElement);

    return element ? inAspectValue(element.element) : inAspectNull;
  },

};

/**
 * @category Aspect
 */
export const InStyledElement = {

  get [InAspect__symbol]() {
    return InStyledElement__aspect;
  },

  /**
   * Creates input control aspect converter that assigns the given styled element to converted control.
   *
   * This is useful for controls without elements (such as input groups), or can be used to apply CSS classes to input
   * element wrappers (such as `form-group` in Bootstrap).
   *
   * @param element  A DOM element to apply styles to. Styles won't be applied when `null` or undefined.
   *
   * @returns Input control aspect converter.
   */
  to<Value>(element: InStyledElement | null = null): InConverter.Aspect<any, Value> {
    return {
      applyAspect<Instance, Kind extends InAspect.Application.Kind>(
          aspect: InAspect<any, any>,
      ): InAspect.Applied<any, InAspect.Application.Instance<Instance, Value, Kind>> | undefined {
        return aspect === InStyledElement__aspect
            ? inAspectValue(element) as InAspect.Application.Result<Instance, Value, Kind>
            : undefined;
      },
    };
  },

};
