import {
  AfterEvent,
  AfterEvent__symbol,
  EventKeeper,
  EventSender,
  OnEvent,
  OnEvent__symbol,
} from '@proc7ts/fun-events';
import { inconvertibleInAspect } from '../applied-aspect';
import { InAspect, InAspect__symbol } from '../aspect';
import { InControl } from '../control';

/**
 * @internal
 */
const InContainer__aspect: InAspect<InContainer<any> | null, 'container'> = {
  applyTo(control) {
    return inconvertibleInAspect(control, InContainer);
  },
};

/**
 * An input control containing other controls.
 *
 * Container is available as an aspect of itself and converted controls with the same value.
 *
 * @category Control
 * @typeParam TValue - Input value type.
 */
export abstract class InContainer<TValue> extends InControl<TValue> {

  static get [InAspect__symbol](): InAspect<InContainer<any> | null, 'container'> {
    return InContainer__aspect;
  }

  /**
   * Controls of this input container.
   */
  abstract readonly controls: InContainerControls;

  protected _applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
      aspect: InAspect<TInstance, TKind>,
  ): InAspect.Application.Result<TInstance, TValue, TKind> | undefined {
    return aspect === InContainer__aspect as InAspect<any>
        ? inconvertibleInAspect(this, InContainer, this) as InAspect.Application.Result<TInstance, TValue, TKind>
        : super._applyAspect(aspect);
  }

}

/**
 * @category Control
 */
export namespace InContainer {

  /**
   * Input controls container entry.
   *
   * This is a tuple containing control key and control itself.
   *
   * Container implementations may apply limitations on the type of keys and input values they support.
   */
  export type Entry = readonly [PropertyKey, InControl<any>];

  /**
   * A snapshot of input controls within container.
   *
   * Extends an `Iterable` interface by iterating over all nested controls.
   */
  export interface Snapshot extends Iterable<InControl<any>> {

    [Symbol.iterator](): IterableIterator<InControl<any>>;

    /**
     * Iterates over nested control entries.
     *
     * @returns An iterable iterator over entries.
     */
    entries(): IterableIterator<InContainer.Entry>;

  }

}

/**
 * Controls of input container.
 *
 * Allows to track container contents. I.e. nested controls, their additions and removal.
 *
 * Implements `EventSender` interface by sending arrays of added and removed control entries.
 *
 * Implements `EventKeeper` interface by sending container contents instance each time it is changed.
 *
 * @category Control
 */
export abstract class InContainerControls
     implements EventSender<[InContainer.Entry[], InContainer.Entry[]]>, EventKeeper<[InContainer.Snapshot]> {

  /**
   * An `OnEvent` sender of container updates.
   *
   * Sends two arrays on each container update: the first one contains added control entries, while the second one
   * contains removed control entries.
   *
   * The `[OnEvent__symbol]` property is an alias of this one.
   */
  abstract readonly on: OnEvent<[InContainer.Entry[], InContainer.Entry[]]>;

  /**
   * An `AfterEvent` keeper of input container contents.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[InContainer.Snapshot]>;

  [OnEvent__symbol](): OnEvent<[InContainer.Entry[], InContainer.Entry[]]> {
    return this.on;
  }

  [AfterEvent__symbol](): AfterEvent<[InContainer.Snapshot]> {
    return this.read;
  }

}

declare module '../aspect' {

  export namespace InAspect.Application {

    export interface Map<TInstance, TValue> {

      /**
       * Input controls container application type.
       */
      container(): InContainer<TValue> | null;

    }

  }

}
