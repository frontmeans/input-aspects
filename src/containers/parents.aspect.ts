/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import {
  AfterEvent,
  AfterEvent__symbol,
  afterSent,
  EventEmitter,
  EventKeeper,
  EventReceiver,
  EventSender,
  eventSupply,
  EventSupply,
  eventSupplyOf,
  OnEvent,
  OnEvent__symbol,
} from '@proc7ts/fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectValue } from '../aspect.impl';
import { InControl } from '../control';
import { InContainer } from './container.control';

/**
 * @internal
 */
const InParents__aspect: InAspect<InParents> = {
  applyTo(control): InAspect.Applied<any, InParents> {
    return inAspectValue(new InControlParents(control));
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
    implements EventKeeper<[Iterable<InParents.Entry>]>, EventSender<[InParents.Entry[], InParents.Entry[]]> {

  static get [InAspect__symbol](): InAspect<InParents> {
    return InParents__aspect;
  }

  /**
   * Builds an `OnEvent` sender of parent updates.
   *
   * Sends two arrays on each parents update: the first one contains added parent entries, while the second one
   * contains removed parent entries.
   *
   * The `[OnEvent__symbol]` property is an alias of this one.
   *
   * @returns `OnEvent` sender of parent updates.
   */
  abstract on(): OnEvent<[InParents.Entry[], InParents.Entry[]]>;

  /**
   * Starts sending parent updates to the given `receiver`.
   *
   * Sends two arrays on each parents update: the first one contains added parent entries, while the second one
   * contains removed parent entries.
   *
   * @param receiver  Target parent updates receiver.
   *
   * @returns Parent updates supply.
   */
  abstract on(receiver: EventReceiver<[InParents.Entry[], InParents.Entry[]]>): EventSupply;

  [OnEvent__symbol](): OnEvent<[InParents.Entry[], InParents.Entry[]]> {
    return this.on();
  }

  /**
   * Builds an `AfterEvent` keeper of control parents.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   *
   * @returns `AfterEvent` keeper of control parents.
   */
  abstract read(): AfterEvent<[InParents.All]>;

  /**
   * Starts sending control parents and updates to the given `receiver`
   *
   * @param receiver  Target control parents receiver.
   *
   * @returns Control parents supply.
   */
  abstract read(receiver: EventReceiver<[InParents.All]>): EventSupply;

  [AfterEvent__symbol](): AfterEvent<[InParents.All]> {
    return this.read();
  }

  /**
   * Adds the input control to the given parent container under the given key.
   *
   * @param entry  Parent container entry.
   *
   * @returns A parent container supply. Removes the control from the parent container once cut off.
   */
  abstract add(entry: InParents.Entry): EventSupply;

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

/**
 * @internal
 */
class InControlParents extends InParents {

  private readonly _map = new Map<InParents.Entry, EventSupply>();
  private readonly _on = new EventEmitter<[InParents.Entry[], InParents.Entry[]]>();

  constructor(private readonly _control: InControl<any>) {
    super();
    eventSupplyOf(this._on).needs(this._control);
  }

  add(entry: InParents.Entry): EventSupply {

    const existingSupply = this._map.get(entry);

    if (existingSupply) {
      // Parent entry already added. Doing nothing
      return existingSupply;
    }

    // Adding new entry
    const supply = eventSupply(() => {
      this._map.delete(entry);
      this._on.send([], [entry]);
    });

    this._map.set(entry, supply);
    this._on.send([entry], []);

    return supply
        .needs(this._control)
        .needs(entry.parent);
  }

  on(): OnEvent<[InParents.Entry[], InParents.Entry[]]>;
  on(receiver: EventReceiver<[InParents.Entry[], InParents.Entry[]]>): EventSupply;
  on(
      receiver?: EventReceiver<[InParents.Entry[], InParents.Entry[]]>,
  ): OnEvent<[InParents.Entry[], InParents.Entry[]]> | EventSupply {
    return (this.on = this._on.on().F)(receiver);
  }

  read(): AfterEvent<[InParents.All]>;
  read(receiver: EventReceiver<[InParents.All]>): EventSupply;
  read(receiver?: EventReceiver<[InParents.All]>): AfterEvent<[InParents.All]> | EventSupply {

    const allParents = (): IterableIterator<InParents.Entry> => this._map.keys();

    return (this.read = afterSent<[InParents.All]>(
        this.on().thru(allParents),
        () => [allParents()],
    ).F)(receiver);
  }

}
