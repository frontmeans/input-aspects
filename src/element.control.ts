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
 * @typeParam TValue - Input value type.
 * @typeParam TElt - A type of input HTML element.
 */
export abstract class InElement<TValue, TElt = HTMLElement> extends AbstractInControl<TValue> {

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
  abstract readonly input: AfterEvent<[InElement.Input<TValue>]>;

  protected _applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
      aspect: InAspect<TInstance, TKind>,
  ): InAspect.Application.Result<TInstance, TValue, TKind> | undefined {
    return aspect as InAspect<any, any> === InElement__aspect
        ? inAspectSameOrNull(
            this,
            InElement,
            this as InElement<TValue, any>,
        ) as InAspect.Application.Result<TInstance, TValue, TKind>
        : super._applyAspect(aspect);
  }

}

/**
 * @category Control
 */
export namespace InElement {

  /**
   * User input.
   *
   * @typeParam TValue - Input value type.
   */
  export interface Input<TValue> {

    /**
     * The value user entered.
     */
    value: TValue;

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
