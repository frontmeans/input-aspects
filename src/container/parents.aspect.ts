import { valueProvider, valuesProvider } from 'call-thru';
import {
  AfterEvent,
  AfterEvent__symbol,
  afterEventFrom,
  EventEmitter, eventInterest, EventInterest,
  EventKeeper,
  EventSender,
  OnEvent,
  OnEvent__symbol
} from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectValue } from '../aspect.impl';
import { InContainer } from './container';

const InParents__aspect: InAspect<InParents> = {
  applyTo(): InAspect.Applied<InParents> {
    return inAspectValue(new InControlParents());
  }
};

/**
 * Parents of input control.
 *
 * Reflects all containers the control belongs to. Note that component may belong to multiple containers. Or even
 * to the same container multiple times under different keys.
 *
 * Implements `Iterable` interface by iterating over all parent entries.
 *
 * Implements `EventSender` interface by sending arrays of parent entries the control is added to and removed from.
 *
 * Implements `EventKeeper` interface by sending parents instance each time it is updated.
 */
export abstract class InParents
    implements Iterable<InParents.Entry>,
        EventKeeper<[InParents]>,
        EventSender<[InParents.Entry[], InParents.Entry[]]> {

  static get [InAspect__symbol](): InAspect<InParents> {
    return InParents__aspect;
  }

  /**
   * An `OnEvent` registrar of parent updates receivers.
   *
   * Sends two arrays on each parents update: the first one contains added parent entries, while the second one
   * contains removed parent entries.
   *
   * The `[OnEvent__symbol]` property is an alias of this one.
   */
  abstract readonly on: OnEvent<[InParents.Entry[], InParents.Entry[]]>;

  get [OnEvent__symbol](): OnEvent<[InParents.Entry[], InParents.Entry[]]> {
    return this.on;
  }

  /**
   * An `AfterEvent` registrar of updated parents receivers.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[this]>;

  get [AfterEvent__symbol](): AfterEvent<[this]> {
    return this.read;
  }

  abstract [Symbol.iterator](): IterableIterator<InParents.Entry>;

  /**
   * Adds the input control to the given parent container under the given key.
   *
   * @param container A container to add input control to.
   * @param key A key of the added control in parent `container`.
   *
   * @returns An event interest instance that removes the control from the parent `container` when loses interest.
   */
  abstract add(container: InContainer<any>, key: PropertyKey): EventInterest;

}

export namespace InParents {

  /**
   * Input control parent entry.
   *
   * This is a tuple containing a parent container control and a key under which current control added to that control.
   *
   * @typeparam L Input container layout interface.
   */
  export type Entry = readonly [InContainer<any>, PropertyKey];

}

class InControlParents extends InParents {

  private readonly _entries = new Map<InContainer<any>, Map<PropertyKey, EventInterest>>();
  private readonly _on = new EventEmitter<[InParents.Entry[], InParents.Entry[]]>();
  readonly read = afterEventFrom<[this]>(
      this._on.on.thru(
          valueProvider(this)
      ),
      valuesProvider(this));

  get on() {
    return this._on.on;
  }

  * [Symbol.iterator](): IterableIterator<InParents.Entry> {
    for (const [container, keyMap] of this._entries.entries()) {
      for (const key of keyMap.keys()) {
        yield [container, key];
      }
    }
  }

  add(container: InContainer<any>, key: PropertyKey): EventInterest {

    let keyMap: Map<PropertyKey, EventInterest>;
    const existing = this._entries.get(container);

    if (existing) {

      const existingInterest = existing.get(key);

      if (existingInterest) {
        // Already added to the same container under the same key. Doing nothing
        return existingInterest;
      } else {
        // Adding to the same container under different key
        keyMap = existing;
      }
    } else {
      // Adding to new container
      this._entries.set(container, keyMap = new Map());
    }

    const interest = eventInterest(() => {

      const removedKeyMap = this._entries.get(container) as Map<PropertyKey, EventInterest>;

      removedKeyMap.delete(key);
      if (!removedKeyMap.size) {
        // No longer belongs to container under any key
        this._entries.delete(container);
      }
      this._on.send([], [[container, key]]);
    });

    keyMap.set(key, interest);
    this._on.send([[container, key]], []);

    return interest;
  }

}
