import {
  AfterEvent,
  AfterEvent__symbol,
  EventEmitter,
  EventKeeper,
  EventSender,
  OnEvent,
  OnEvent__symbol, trackValue, ValueTracker
} from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectNull, inAspectValue } from '../aspect.impl';
import { InControl } from '../control';

const InContainer__aspect: InAspect<InContainer<any> | null> = {
  applyTo() {
    return inAspectNull;
  },
};

/**
 * An input control containing other controls.
 *
 * Container is available as aspect of itself.
 *
 * @typeparam Value Input value type.
 */
export abstract class InContainer<Value> extends InControl<Value> {

  static get [InAspect__symbol](): InAspect<InContainer<any> | null> {
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
   * @typeparam L Input container layout interface.
   */
  export type Entry = readonly [PropertyKey, InControl<any>];

}

/**
 * Controls of input container.
 *
 * This interface is read-only and allows to track container contents. I.e. nested controls, their additions and
 * removal.
 *
 * Implements an `Iterable` interface by iterating over all nested controls.
 *
 * Implements `EventSender` interface by sending arrays of added and removed control entries.
 *
 * Implements `EventKeeper` interface by sending controls instance each time its contents changed.
 */
export abstract class InContainerControls
    implements Iterable<InControl<any>>,
        EventSender<[InContainer.Entry[], InContainer.Entry[]]>,
        EventKeeper<[InContainerControls]> {

  /**
   * An `OnEvent` registrar of control updates receivers.
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
   * An `AfterEvent` registrar of updated controls receivers.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[this]>;

  get [AfterEvent__symbol](): AfterEvent<[this]> {
    return this.read;
  }

  /**
   * Iterates over nested control entries.
   *
   * @returns An iterable iterator over entries.
   */
  abstract entries(): IterableIterator<InContainer.Entry>;

  * [Symbol.iterator](): IterableIterator<InControl<any>> {
    for (const [, control] of this.entries()) {
      yield control;
    }
  }

}
