import {
  AfterEvent,
  AfterEvent__symbol,
  afterEventOr,
  EventEmitter,
  eventInterest,
  EventInterest,
  EventKeeper,
  EventSender,
  OnEvent,
  OnEvent__symbol
} from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectValue } from '../aspect.impl';
import { InContainer } from './container.control';

const InParents__aspect: InAspect<InParents> = {
  applyTo(): InAspect.Applied<InParents> {
    return inAspectValue(new InControlParents());
  }
};

/**
 * Parents of input control.
 *
 * Reflects all containers the control belongs to. Note that component may belong to multiple containers. Or even
 * to the same container multiple times.
 *
 * Implements `EventSender` interface by sending arrays of parent entries the control is added to and removed from.
 *
 * Implements `EventKeeper` interface by sending a snapshot of all parents each time it is updated.
 */
export abstract class InParents
    implements EventKeeper<[Iterable<InParents.Entry>]>, EventSender<[InParents.Entry[], InParents.Entry[]]> {

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
   * An `AfterEvent` registrar of updated parents iterable receivers.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[InParents.All]>;

  get [AfterEvent__symbol](): AfterEvent<[InParents.All]> {
    return this.read;
  }

  /**
   * Adds the input control to the given parent container under the given key.
   *
   * @param entry Parent container entry.
   *
   * @returns An event interest instance that removes the control from the parent `container` when loses interest.
   */
  abstract add(entry: InParents.Entry): EventInterest;

}

export namespace InParents {

  /**
   * Parent container entry of input control.
   */
  export interface Entry {

    /**
     * Parent container.
     */
    readonly parent: InContainer<any>;

  }

  /**
   * All control parents as iterable instance.
   */
  export interface All extends Iterable<Entry> {

    [Symbol.iterator](): IterableIterator<Entry>;

  }

}

class InControlParents extends InParents {

  private readonly _map = new Map<InParents.Entry, EventInterest>();
  private readonly _on = new EventEmitter<[InParents.Entry[], InParents.Entry[]]>();
  readonly read: AfterEvent<[InParents.All]>;

  constructor() {
    super();

    const map = this._map;

    this.read = afterEventOr(
        this._on.on.thru(
            allParents
        ),
        () => [allParents()]);

    function allParents(): IterableIterator<InParents.Entry> {
      return map.keys();
    }
  }

  get on() {
    return this._on.on;
  }

  add(entry: InParents.Entry): EventInterest {

    const existingInterest = this._map.get(entry);

    if (existingInterest) {
      // Parent entry already added. Doing nothing
      return existingInterest;
    }

    // Adding new entry
    const interest = eventInterest(() => {
      this._map.delete(entry);
      this._on.send([], [entry]);
    });

    this._map.set(entry, interest);
    this._on.send([entry], []);

    return interest;
  }

}
