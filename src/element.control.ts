/**
 * @packageDocumentation
 * @module input-aspects
 */
import { AfterEvent, DomEventDispatcher } from 'fun-events';
import { InAspect, InAspect__symbol } from './aspect';
import { inAspectNull, inAspectValue } from './aspect.impl';
import { InControl } from './control';

/**
 * @internal
 */
const InElement__aspect: InAspect<InElement<any> | null, 'element'> = {
  applyTo() {
    return inAspectNull;
  },
};

/**
 * HTML input element control.
 *
 * It is also available as aspect of itself and converted controls. It is not available as aspect of other controls.
 *
 * @category Control
 * @typeparam Value  Input value type.
 * @typeparam Elt  A type of input HTML element.
 */
export abstract class InElement<Value, Elt = HTMLElement> extends InControl<Value> {

  /**
   * HTML input element this control is based on.
   */
  abstract readonly element: Elt;

  /**
   * An `AfterEvent` keeper of user input.
   */
  abstract readonly input: AfterEvent<[InElement.Input<Value>]>;

  /**
   * DOM event dispatcher of this element.
   */
  abstract readonly events: DomEventDispatcher;

  static get [InAspect__symbol](): InAspect<InElement<any> | null, 'element'> {
    return InElement__aspect;
  }

  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>,
  ): InAspect.Application.Result<Instance, Value, Kind> | undefined {
    return aspect === InElement__aspect as InAspect<any, any>
        ? inAspectValue(this) as InAspect.Application.Result<Instance, Value, Kind>
        : undefined;
  }

}

export namespace InElement {

  /**
   * User input.
   *
   * @typeparam Value  Input value type.
   */
  export interface Input<Value> {

    /**
     * The value user entered.
     */
    value: Value;

    /**
     * An event caused the value to be applied.
     *
     * The value has been applied programmatically if missing.
     */
    event?: Event;

  }

}

declare module './aspect' {

  export namespace InAspect.Application {

    export interface Map<OfInstance, OfValue> {

      /**
       * Input element application type.
       */
      element(): InElement<OfValue>;

    }

  }

}
