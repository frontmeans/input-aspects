import { DomEventDispatcher } from 'fun-events';
import { InAspect, InAspect__symbol } from './aspect';
import { InControl } from './control';
import { InElement__aspect } from './element.aspect';

/**
 * Input element control.
 *
 * It is also available as aspect of itself and converted controls. It is not available as aspect of other controls.
 *
 * An input element control can be constructed using `inElt()` function.
 */
export abstract class InElement extends InControl {

  /**
   * The input element this control is based on.
   *
   * Note that this is not always a HTML input element. E.g. this may be an enclosing element for `InHost` control.
   * Typically this the element to apply styles to.
   */
  abstract readonly element?: any;

  /**
   * DOM event dispatcher of this element.
   */
  abstract readonly events: DomEventDispatcher;

  static get [InAspect__symbol](): InAspect<'default', InElement | null> {
    return InElement__aspect;
  }

}
