/**
 * @module input-aspects
 */
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectNull, inAspectValue } from '../aspect.impl';
import { InControl } from '../control';
import { InElement } from '../element.control';

/**
 * An input aspect representing HTML element to apply styles to.
 *
 * This is a HTML element for input element control, and `null` for everything else by default.
 *
 * @category Aspect
 */
export type InStyledElement = Element;

const InStyledElement__aspect: InAspect<InStyledElement | null> = {

  applyTo(control: InControl<any>): InAspect.Applied<InStyledElement | null> {

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

};
