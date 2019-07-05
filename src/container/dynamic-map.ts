import {
  AfterEvent,
  AfterEvent__symbol,
  afterEventBy,
  EventEmitter,
  EventKeeper,
  EventSender,
  OnEvent,
  OnEvent__symbol
} from 'fun-events';

/**
 * Dynamic map of values.
 *
 * When modified a snapshot of key/value pairs is created and sent as an update to registered receivers.
 *
 * Implements `EventSender` interface by sending lists of added and removed entries.
 *
 * Implements `EventKeeper` interface by sending updated snapshot.
 *
 * @typeparam K Key type.
 * @typeparam V Value type.
 * @typeparam S Snapshot type. An iterable snapshot by default.
 */
export abstract class DynamicMap<K, V, S>
    implements EventSender<[[K, V][], [K, V][]]>, EventKeeper<[S]> {

  /**
   * An `OnEvent` registrar of updates receivers.
   *
   * Sends two arrays on each update: the first one contains added entries (i.e. key/value tuples), while the second
   * one contains removed entries.
   *
   * The `[OnEvent__symbol]` property is an alias of this one.
   */
  abstract readonly on: OnEvent<[[K, V][], [K, V][]]>;

  get [OnEvent__symbol](): OnEvent<[[K, V][], [K, V][]]> {
    return this.on;
  }

  /**
   * An `AfterEvent` registrar of actual snapshot receivers.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[S]>;

  get [AfterEvent__symbol](): AfterEvent<[S]> {
    return this.read;
  }

  /**
   * Associates the `value` with the given `key`.
   *
   * @param key Target key.
   * @param value A value to associated with the `key`, or `undefined` to remove the association.
   *
   * @returns `this` instance.
   */
  set(key: K, value: V | undefined): this {
    return this.from([[key, value]]);
  }

  /**
   * Removes the value association with the given `key`.
   *
   * Calling this method is the same as calling `set(key, undefined)`.
   *
   * @param key Target key.
   *
   * @returns `this` instance.
   */
  delete(key: K): this {
    return this.set(key, undefined);
  }

  /**
   * Associates all the the values from the given `entries` iterable with their respective keys.
   *
   * @param entries An iterable containing tuples of keys and their respective values. If the value is `undefined` then
   * association will be removed.
   *
   * @returns `this` instance.
   */
  abstract from(entries: Iterable<[K, V | undefined]>): this;

}

export namespace DynamicMap {

  /**
   * Dynamic map editor.
   *
   * It is used internally by dynamic map to modify it and to build snapshots. The dynamic map then takes care of
   * sending updates.
   */
  export interface Editor<K, V, S> {

    /**
     * Associates the value with the given key.
     *
     * @param key Target key.
     * @param value A value to associated with the `key`, or `undefined` to remove the association.
     *
     * @returns Either the value previously associated with this `key`, or `undefined` if there were no such value.
     * Should return the `value` itself if it were already associated with this `key`.
     */
    set(key: K, value?: V): V | undefined;

    /**
     * Takes a snapshot of current associations.
     *
     * This method is called after a series of modifications. The returned snapshot is then sent to registered snapshot
     * receivers.
     *
     * @returns The latest snapshot
     */
    snapshot(): S;

    postUpdate(added: [K, V][], removed: [K, V][]): void;

  }

}

/**
 * Creates a dynamic map with the given `editor`.
 *
 * @typeparam K Key type.
 * @typeparam V Value type.
 * @typeparam S Snapshot type.
 * @param editor Dynamic map editor to use.
 *
 * @returns New dynamic map instance.
 */
export function dynamicMap<K, V, S>(editor: DynamicMap.Editor<K, V, S>): DynamicMap<K, V, S> {

  const updates = new EventEmitter<[[K, V][], [K, V][]]>();
  const onSnapshot = updates.on.thru(
      () => editor.snapshot(),
  );
  const read = afterEventBy<[S]>(receiver => {
    receiver(editor.snapshot());
    return onSnapshot(receiver);
  }).share();

  class DMap extends DynamicMap<K, V, S> {

    // noinspection JSMethodCanBeStatic
    get on() {
      return updates.on;
    }

    // noinspection JSMethodCanBeStatic
    get read() {
      return read;
    }

    from(entries: Iterable<[K, (V | undefined)]>): this {

      const added: [K, V][] = [];
      const removed: [K, V][] = [];

      for (const [key, value] of entries) {
        set(key, value, added, removed);
      }

      if (added.length || removed.length) {
        updates.send(added, removed);
        editor.postUpdate(added, removed);
      }

      return this;
    }

  }

  return new DMap();

  function set(key: K, value: V | undefined, added: [K, V][], removed: [K, V][]): void {

    const replaced = editor.set(key, value);

    if (replaced !== undefined) {
      // Value replaced
      if (replaced === value) {
        // By the same value - do nothing
        return;
      }
      // By different value - signal the replaced value removed
      removed.push([key, replaced]);
    }
    if (value !== undefined) {
      // Value added - signal this
      added.push([key, value]);
    }
  }
}
