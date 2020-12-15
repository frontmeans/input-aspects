/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import { DomEventDispatcher } from '@frontmeans/dom-events';
import { AfterEvent } from '@proc7ts/fun-events';
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
 * @typeParam Value - Input value type.
 * @typeParam TElt - A type of input HTML element.
 */
export abstract class InElement<Value, TElt = HTMLElement> extends AbstractInControl<Value> {

  static get [InAspect__symbol](): InAspect<InElement<any> | null, 'element'> {
    return InElement__aspect;
  }

  /**
   * HTML input element this control is based on.
   */
  abstract readonly element: TElt;

  /**
   * DOM event dispatcher of this element.
   */
  abstract readonly events: DomEventDispatcher;

  /**
   * An `AfterEvent` keeper of user input.
   */
  abstract readonly input: AfterEvent<[InElement.Input<Value>]>;

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
   * @typeParam Value - Input value type.
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

    export interface Map<TInstance, TValue> {

      /**
       * Input element application type.
       */
      element(): InElement<TValue> | null;

    }

  }

}
