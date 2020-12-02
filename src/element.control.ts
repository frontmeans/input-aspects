/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import { AfterEvent, EventReceiver, EventSupply } from '@proc7ts/fun-events';
import { DomEventDispatcher } from '@proc7ts/fun-events/dom';
import { InAspect, InAspect__symbol } from './aspect';
import { inAspectSameOrNull } from './aspect.impl';
import { AbstractInControl } from './controls';

/**
 * @internal
 */
const InElement__aspect: InAspect<InElement<any> | null, 'element'> = {
  applyTo(control) {
    return inAspectSameOrNull(control, InElement);
  },
};

/**
 * HTML input element control.
 *
 * It is also available as aspect of itself and converted controls with the same value.
 *
 * @category Control
 * @typeparam Value  Input value type.
 * @typeparam Elt  A type of input HTML element.
 */
export abstract class InElement<Value, Elt = HTMLElement> extends AbstractInControl<Value> {

  /**
   * HTML input element this control is based on.
   */
  abstract readonly element: Elt;

  /**
   * DOM event dispatcher of this element.
   */
  abstract readonly events: DomEventDispatcher;

  static get [InAspect__symbol](): InAspect<InElement<any> | null, 'element'> {
    return InElement__aspect;
  }

  /**
   * Builds an `AfterEvent` keeper of user input.
   *
   * @returns `AfterEvent` keeper of user input.
   */
  abstract input(): AfterEvent<[InElement.Input<Value>]>;

  /**
   * Starts sending user input and updates to the given `receiver`.
   *
   * @param receiver  Target user input receiver.
   *
   * @returns User input supply.
   */
  abstract input(receiver: EventReceiver<[InElement.Input<Value>]>): EventSupply;

  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>,
  ): InAspect.Application.Result<Instance, Value, Kind> | undefined {
    return aspect as InAspect<any, any> === InElement__aspect
        ? inAspectSameOrNull(
            this,
            InElement,
            this as InElement<Value, any>,
        ) as InAspect.Application.Result<Instance, Value, Kind>
        : super._applyAspect(aspect);
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
      element(): InElement<OfValue> | null;

    }

  }

}
