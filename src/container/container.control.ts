/**
 * @module input-aspects
 */
import { AfterEvent, AfterEvent__symbol, EventKeeper, EventSender, OnEvent, OnEvent__symbol } from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectNull, inAspectValue } from '../aspect.impl';
import { InControl } from '../control';

/**
 * @internal
 */
const InContainer__aspect: InAspect<InContainer<any> | null, 'container'> = {
  applyTo() {
    return inAspectNull;
  },
};

/**
 * An input control containing other controls.
 *
 * Container is available as aspect of itself.
 *
 * @category Control
 * @typeparam Value  Input value type.
 */
export abstract class InContainer<Value> extends InControl<Value> {

  static get [InAspect__symbol](): InAspect<InContainer<any> | null, 'container'> {
    return InContainer__aspect;
  }

  /**
   * Controls of this input container.
   */
  abstract readonly controls: InContainerControls;

  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>,
  ): InAspect.Application.Result<Instance, Value, Kind> | undefined {
    return aspect === InContainer__aspect as InAspect<any>
        ? inAspectValue(this) as InAspect.Application.Result<Instance, Value, Kind>
        : undefined;
  }

}

export namespace InContainer {

  /**
   * Input controls container entry.
   *
   * This is a tuple containing control key and control itself.
   *
   * Container implementations may apply limitations on the type of keys and input values they support.
   *
   * @typeparam L  Input container layout interface.
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

  get [OnEvent__symbol](): OnEvent<[InContainer.Entry[], InContainer.Entry[]]> {
    return this.on;
  }

  /**
   * An `AfterEvent` keeper of input container contents.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[InContainer.Snapshot]>;

  get [AfterEvent__symbol](): AfterEvent<[InContainer.Snapshot]> {
    return this.read;
  }

}

declare module '../aspect' {

  export namespace InAspect.Application {

    export interface Map<OfInstance, OfValue> {

      /**
       * Input controls container application type.
       */
      container(): InContainer<OfValue>;

    }

  }

}
