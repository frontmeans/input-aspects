import {
  AfterEvent,
  AfterEvent__symbol,
  EventEmitter,
  EventKeeper,
  EventSender,
  mapAfter,
  OnEvent,
  OnEvent__symbol,
} from '@proc7ts/fun-events';
import { Supply } from '@proc7ts/supply';
import { knownInAspect } from '../applied-aspect';
import { InAspect, InAspect__symbol } from '../aspect';
import { InControl } from '../control';
import { InContainer } from './container.control';

/**
 * @internal
 */
const InParents__aspect: InAspect<InParents> = {
  applyTo(control): InAspect.Applied<any, InParents> {
    return knownInAspect(new InControlParents(control));
  },
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
 *
 * @category Aspect
 */
export abstract class InParents
  implements
    EventKeeper<[Iterable<InParents.Entry>]>,
    EventSender<[InParents.Entry[], InParents.Entry[]]> {

  static get [InAspect__symbol](): InAspect<InParents> {
    return InParents__aspect;
  }

  /**
   * An `OnEvent` sender of parent updates.
   *
   * Sends two arrays on each parents update: the first one contains added parent entries, while the second one
   * contains removed parent entries.
   *
   * The `[OnEvent__symbol]` property is an alias of this one.
   */
  abstract readonly on: OnEvent<[InParents.Entry[], InParents.Entry[]]>;

  /**
   * An `AfterEvent` keeper of control parents.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[InParents.All]>;

  [OnEvent__symbol](): OnEvent<[InParents.Entry[], InParents.Entry[]]> {
    return this.on;
  }

  [AfterEvent__symbol](): AfterEvent<[InParents.All]> {
    return this.read;
  }

  /**
   * Adds the input control to the given parent container under the given key.
   *
   * @param entry - Parent container entry.
   *
   * @returns A parent container supply. Removes the control from the parent container once cut off.
   */
  abstract add(entry: InParents.Entry): Supply;

}

/**
 * @category Aspect
 */
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

/**
 * @internal
 */
class InControlParents extends InParents {

  readonly read: AfterEvent<[InParents.All]>;
  private readonly _map = new Map<InParents.Entry, Supply>();
  private readonly _on = new EventEmitter<[InParents.Entry[], InParents.Entry[]]>();

  constructor(private readonly _control: InControl<any>) {
    super();
    this._on.supply.needs(this._control);

    const allParents = (): InParents.All => ({
      [Symbol.iterator]: () => this._map.keys(),
    });

    this.read = this.on.do(mapAfter(allParents, allParents));
  }

  add(entry: InParents.Entry): Supply {
    const existingSupply = this._map.get(entry);

    if (existingSupply) {
      // Parent entry already added. Doing nothing
      return existingSupply;
    }

    // Adding new entry
    const supply = new Supply(() => {
      this._map.delete(entry);
      this._on.send([], [entry]);
    });

    this._map.set(entry, supply);
    this._on.send([entry], []);

    return supply.needs(this._control).needs(entry.parent);
  }

  get on(): OnEvent<[InParents.Entry[], InParents.Entry[]]> {
    return this._on.on;
  }

}
