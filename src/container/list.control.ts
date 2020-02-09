/**
 * @packageDocumentation
 * @module input-aspects
 */
import { itsIterable, mapIt } from 'a-iterable';
import { isDefined, nextArgs, NextCall, noop } from 'call-thru';
import {
  afterAll,
  afterEach,
  AfterEvent,
  AfterEvent__symbol,
  afterEventBy,
  EventEmitter,
  EventKeeper,
  EventReceiver,
  EventSender,
  eventSupply,
  EventSupply,
  EventSupply__symbol,
  eventSupplyOf,
  nextAfterEvent, noEventSupply,
  OnEvent,
  OnEvent__symbol,
  OnEventCallChain,
  trackValue,
  ValueTracker,
} from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectSameOrNull } from '../aspect.impl';
import { InControl } from '../control';
import { InData, InMode } from '../data';
import { inValue } from '../value';
import { InContainer, InContainerControls } from './container.control';
import { InParents } from './parents.aspect';

/**
 * @internal
 */
const InList__aspect: InAspect<InList<any> | null, 'list'> = {
  applyTo(control) {
    return inAspectSameOrNull(control, InList);
  },
};

/**
 * An indexed list of input controls.
 *
 * Nested controls can be added and removed via `controls` property.
 *
 * List value (called model) is an array object formed by nested control values. The item property value is the one
 * of the control with the same index, if present. When model is updated corresponding controls are also updated.
 *
 * List is available as an aspect of itself and converted controls with the same value.
 *
 * @category Control
 * @typeparam Item  Model item type.
 */
export abstract class InList<Item> extends InContainer<readonly Item[]> {

  static get [InAspect__symbol](): InAspect<InList<any> | null, 'list'> {
    return InList__aspect;
  }

  /**
   * Input list controls.
   */
  abstract readonly controls: InListControls<Item>;

  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<any, any>,
  ): InAspect.Application.Result<Instance, readonly Item[], Kind> | undefined {
    return aspect === InList__aspect
        ? inAspectSameOrNull(this, InList, this) as InAspect.Application.Result<Instance, readonly Item[], Kind>
        : super._applyAspect(aspect);
  }

}

export namespace InList {

  /**
   * Input controls list entry.
   *
   * This is a tuple containing model index and corresponding control.
   *
   * @typeparam Item  Model item type.
   */
  export type Entry<Item> = readonly [number, InControl<Item>];

  /**
   * A snapshot of input control list controls.
   *
   * @typeparam Item  Model item type.
   */
  export interface Snapshot<Item> extends InContainer.Snapshot {

    /**
     * Input controls array length.
     */
    readonly length: number;

    [Symbol.iterator](): IterableIterator<InControl<Item>>;

    entries(): IterableIterator<Entry<Item>>;

    /**
     * Returns input control at the given `index`, if present.
     *
     * @param index  Control index, i.e. corresponding model item index.
     *
     * @returns Target control, or `undefined` if there is no control at this `index`.
     */
    item(index: number): InControl<Item> | undefined;

  }

}

/**
 * Input list controls.
 *
 * @category Control
 * @typeparam Item  Model item type.
 */
export abstract class InListControls<Item>
    extends InContainerControls
    implements EventSender<[InList.Entry<Item>[], InList.Entry<Item>[]]>, EventKeeper<[InList.Snapshot<Item>]> {

  abstract readonly on: OnEvent<[InList.Entry<Item>[], InList.Entry<Item>[]]>;

  abstract readonly read: AfterEvent<[InList.Snapshot<Item>]>;

  /**
   * Sets input control with the given index.
   *
   * Replaces existing control if already present.
   *
   * @param index  An index of input control to set. I.e. corresponding model item index.
   * @param control  Input control to add.
   *
   * @returns A supply of just added control that removes it once cut off.
   */
  set(index: number, control: InControl<Item>): EventSupply {
    return this.splice(index, 1, control);
  }

  /**
   * Appends input controls.
   *
   * @param controls  Input controls to add after the last one.
   *
   * @returns A supply of just added controls that removes them once cut off. Cut off supply when no controls added.
   */
  abstract add(...controls: InControl<Item>[]): EventSupply;

  /**
   * Inserts input controls at the given position.
   *
   * @param index  An index to insert controls at.
   * @param controls  Input controls to add after the last one.
   *
   * @returns A supply of just inserted controls that removes them once cut off. Cut off supply when no controls
   * inserted.
   */
  insert(index: number, ...controls: InControl<Item>[]): EventSupply {
    return this.splice(index, 0, ...controls);
  }

  /**
   * Removes input controls starting at the given index.
   *
   * @param start  An index of the first control to remove.
   * @param end  An index of the control next to the last one to remove. Only one control will be removed if omitted.
   */
  remove(start: number, end?: number): void {
    this.splice(start, end == null ? 1 : end - start);
  }

  /**
   * Changes the contents of controls array by removing or replacing existing controls and/or adding new ones.
   *
   * @param start  The index at which to start changing the array.
   * @param deleteCount  An integer indicating the number of elements in the array to remove from start. If omitted
   * then all controls from `start` will be removed.
   * @param controls  Controls to add.
   *
   * @returns A supply of just added controls that removes them once cut off. Cut off supply when no controls added.
   */
  abstract splice(start: number, deleteCount?: number, ...controls: InControl<Item>[]): EventSupply;

  /**
   * Removes all input controls.
   */
  clear(): void {
    this.splice(0);
  }

}

export interface InListControls<Item> {

  readonly [OnEvent__symbol]: OnEvent<[InList.Entry<Item>[], InList.Entry<Item>[]]>;

  readonly [AfterEvent__symbol]: AfterEvent<[InList.Snapshot<Item>]>;

}

/**
 * @internal
 */
type InListEntry<Item> = [InControl<Item>, EventSupply];

/**
 * @internal
 */
class InListSnapshot<Item> implements InList.Snapshot<Item> {

  constructor(readonly _entries: InListEntry<Item>[]) {
  }

  get length(): number {
    return this._entries.length;
  }

  [Symbol.iterator](): IterableIterator<InControl<Item>> {
    return itsIterable(mapIt(this._entries, ([control]) => control));
  }

  *entries(): IterableIterator<InList.Entry<Item>> {

    let index = 0;

    for (const entry of this._entries) {
      yield [index++, entry[0]];
    }
  }

  item(index: number): InControl<Item> | undefined {

    const entry = this._entries[index];

    return entry && entry[0];
  }

}

/**
 * @internal
 */
const inControlReplacedReason = {};

/**
 * @internal
 */
class InListEntries<Item> {

  readonly _supply = eventSupply();
  _entries: InListEntry<Item>[];
  private _shot?: InListSnapshot<Item>;

  constructor(
      readonly _controls: InListControlControls<Item>,
      initial: InControl<Item>[],
  ) {
    this._entries = initial.map(control => inListEntry(this, control));
  }

  splice(
      start: number,
      deleteCount: number | undefined,
      controls: InControl<Item>[],
      added: [number, InListEntry<Item>][],
      removed: [number, InListEntry<Item>][],
  ): EventSupply {

    const self = this;
    let supply = controls.length > 1 ? eventSupply() : undefined;
    const extracted = deleteCount == null
        ? modify().splice(start)
        : modify().splice(
            start,
            deleteCount,
            ...controls.map(
                (control, index) => {

                  const entry = inListEntry(this, control);

                  added.push([start + index, entry]);
                  if (supply) {
                    entry[1].needs(supply);
                  } else {
                    supply = entry[1];
                  }

                  return entry;
                },
            ),
        );

    removed.push(
        ...extracted.map(
            (entry, index) => {
              entry[1].off(inControlReplacedReason);
              return [start + index, entry] as [number, InListEntry<Item>];
            },
        ),
    );

    if (!supply) {
      return noEventSupply();
    }

    const result = eventSupply();

    supply.needs(result);
    supply.whenOff(reason => result.off(reason !== inControlReplacedReason ? reason : undefined));

    return result;

    function modify(): InListEntry<Item>[] {
      if (self._shot) {
        self._shot = undefined;
        self._entries = Array.from(self._entries);
      }
      return self._entries;
    }
  }

  snapshot(): InList.Snapshot<Item> {
    return this._shot || (this._shot = new InListSnapshot<Item>(this._entries));
  }

}

/**
 * @internal
 */
function inListEntry<Item>(
    entries: InListEntries<Item>,
    control: InControl<Item>,
): InListEntry<Item> {

  const entry: InListEntry<Item> = [
    control,
    eventSupply(reason => {
      if (reason !== inControlReplacedReason) {
        entries._controls.remove(entries._entries.findIndex(e => e === entry));
      }
    }).needs(entries._supply),
  ];

  return entry;
}

/**
 * @internal
 */
function readControlValue<Item>(
    controls: InListControlControls<Item>,
    [control, supply]: InListEntry<Item>,
): void {
  supply.needs(control.aspect(InParents).add({ parent: controls._list }).needs(supply));
  supply.needs(control.read(value => {

    const index = controls._entries._entries.findIndex(([ctrl]) => ctrl === control);
    const model = controls._list.it;

    if (model[index] !== value) {

      const newModel = Array.from(controls._list.it);

      newModel[index] = control.it;

      controls._list.it = newModel;
    }
  }).needs(supply));
}

/**
 * @internal
 */
class InListControlControls<Item> extends InListControls<Item> {

  readonly _entries: InListEntries<Item>;
  private readonly _updates = new EventEmitter<[[number, InListEntry<Item>][], [number, InListEntry<Item>][]]>();
  readonly on: OnEvent<[InList.Entry<Item>[], InList.Entry<Item>[]]>;
  readonly read: AfterEvent<[InList.Snapshot<Item>]>;

  constructor(readonly _list: InListControl<Item>) {
    super();

    const self = this;

    this._entries = new InListEntries(this, inListControlsByModel(_list.it, 0));
    this.on = this._updates.on.thru(
        (added, removed) => nextArgs(
            added.map(toInListEntry),
            removed.map(toInListEntry),
        ),
    );
    this.read = afterEventBy(
        this._updates.on.thru(
            () => this._entries.snapshot(),
        ),
        () => [this._entries.snapshot()],
    );

    const applyModelToControls: EventReceiver.Object<[readonly Item[]]> = {
      receive(context, model) {
        context.onRecurrent(noop);

        const entries = self._entries._entries;

        model.forEach((item, index) => {

          const entry = entries[index];

          if (entry) {
            entry[0].it = item;
          }
        });

        if (model.length < entries.length) {
          // Remove controls without values in model
          self.splice(model.length);
        } else if (model.length > entries.length) {
          // Create missing value controls
          self.add(...inListControlsByModel(model, entries.length));
        }
      },
    };

    this._entries._supply.needs(_list.read(applyModelToControls))
        .needs(this._list)
        .whenOff(reason => this._updates.done(reason));

    this._entries._entries.forEach(entry => readControlValue(this, entry));
  }

  add(...controls: InControl<Item>[]): EventSupply {
    return this.splice(this._entries._entries.length, 0, ...controls);
  }

  splice(start: number, deleteCount?: number, ...controls: InControl<Item>[]): EventSupply {

    const list = this._list;
    const added: [number, InListEntry<Item>][] = [];
    const removed: [number, InListEntry<Item>][] = [];
    const supply = this._entries.splice(start, deleteCount, controls, added, removed);

    if (added.length || removed.length) {

      const updated = Array.from(list.it);

      updated.splice(start, removed.length, ...added.map(([, [control]]) => control.it));
      list.it = updated;

      this._updates.send(added, removed);
      added.forEach(([, entry]) => readControlValue(this, entry));
    }

    return supply;
  }

}

/**
 * @internal
 */
function inListControlsByModel<Item>(model: readonly Item[], start: number): InControl<Item>[] {

  const controls: InControl<Item>[] = [];

  for (let i = start; i < model.length; ++i) {
    controls.push(inValue(model[i]));
  }

  return controls;
}

/**
 * @internal
 */
function toInListEntry<Item>([key, [control]]: [number, InListEntry<Item>]): InList.Entry<Item> {
  return [key, control];
}

/**
 * @internal
 */
class InListControl<Item> extends InList<Item> {

  private readonly _model: ValueTracker<readonly Item[]>;
  readonly controls: InListControlControls<Item>;

  constructor(model: readonly Item[]) {
    super();
    this._model = trackValue(model);
    this.controls = new InListControlControls(this);
    eventSupplyOf(this).whenOff(() => this.controls.clear());
  }

  get [EventSupply__symbol](): EventSupply {
    return eventSupplyOf(this._model);
  }

  get on(): OnEvent<[readonly Item[], readonly Item[]]> {
    return this._model.on;
  }

  get it(): readonly Item[] {
    return this._model.it;
  }

  set it(value: readonly Item[]) {
    this._model.it = value;
  }

  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<any, any>,
  ): InAspect.Application.Result<Instance, readonly Item[], Kind> | undefined {
    if (aspect === InData[InAspect__symbol]) {
      return {
        instance: inListData(this),
        convertTo: noop,
      } as InAspect.Application.Result<any, any, any>;
    }
    return super._applyAspect(aspect);
  }

}

/**
 * @internal
 */
function inListData<Item>(list: InList<Item>): InData<readonly Item[]> {
  return afterAll({
    cs: list.controls,
    mode: list.aspect(InMode),
  }).keep.thru_(
      readInListData,
  );
}

/**
 * @internal
 */
function readInListData<Item>(
    {
      cs: [controls],
      mode: [mode],
    }: {
      cs: [InList.Snapshot<Item>];
      mode: [InMode.Value];
    },
): NextCall<OnEventCallChain, [InData.DataType<readonly Item[]>?]> {
  if (!InMode.hasData(mode)) {
    return nextArgs();
  }

  const csData = mapIt(controls, control => control.aspect(InData));

  return nextAfterEvent(afterEach(...csData).keep.thru(
      (...controlsData) => controlsData.map(([d]) => d).filter(isDefined),
  ));
}

/**
 * Constructs input controls list.
 *
 * @category Control
 * @typeparam Item  Model item type.
 * @param model  Initial model of the list.
 *
 * @returns New input controls group.
 */
export function inList<Item>(model: readonly Item[]): InList<Item> {
  return new InListControl(model);
}

declare module '../aspect' {

  export namespace InAspect.Application {

    export interface Map<OfInstance, OfValue> {

      /**
       * Input controls list application type.
       */
      list(): InList<OfValue extends readonly (infer Item)[] ? Item : never> | null;

    }

  }

}
