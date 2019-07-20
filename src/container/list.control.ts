import { itsIterable, mapIt } from 'a-iterable';
import { isDefined, nextArgs, noop } from 'call-thru';
import {
  AfterEvent,
  AfterEvent__symbol,
  afterEventFromAll,
  afterEventFromEach,
  afterEventOf,
  afterEventOr,
  EventEmitter,
  eventInterest,
  EventInterest,
  EventKeeper,
  EventReceiver,
  EventSender,
  OnEvent,
  OnEvent__symbol,
  trackValue,
  ValueTracker
} from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { InControl } from '../control';
import { InData, InMode } from '../submit';
import { inValue } from '../value';
import { InContainer, InContainerControls } from './container.control';
import { InParents } from './parents.aspect';

/**
 * An indexed list of input controls.
 *
 * Nested controls can be added and removed via `controls` property.
 *
 * List value (called model) is an array object formed by nested control values. The item property value is the one
 * of the control with the same index, if present. When model is updated corresponding controls are also updated.
 *
 * @typeparam Item Model item type.
 */
export abstract class InList<Item> extends InContainer<readonly Item[]> {

  /**
   * HTML element this list is constructed for, if any.
   */
  abstract readonly element?: HTMLElement;

  /**
   * Input list controls.
   */
  abstract readonly controls: InListControls<Item>;

}

export namespace InList {

  /**
   * Input controls list entry.
   *
   * This is a tuple containing model index and corresponding control.
   *
   * @typeparam Item Model item type.
   */
  export type Entry<Item> = readonly [number, InControl<Item>];

  /**
   * A snapshot of input control list controls.
   *
   * @typeparam Item Model item type.
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
     * @param index Control index, i.e. corresponding model item index.
     *
     * @returns Target control, or `undefined` if there is no control at this `index`.
     */
    item(index: number): InControl<Item> | undefined;

  }

}

/**
 * Input list controls.
 *
 * @typeparam Item Model item type.
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
   * @param index An index of input control to set. I.e. corresponding model item index.
   * @param control Input control to add.
   *
   * @returns `this` controls instance.
   */
  set(index: number, control: InControl<Item>): this {
    return this.splice(index, 1, control);
  }

  /**
   * Appends input controls.
   *
   * @param controls Input controls to add after the last one.
   *
   * @returns `this` controls instance.
   */
  abstract add(...controls: InControl<Item>[]): this;

  /**
   * Inserts input controls at the given position.
   *
   * @param index An index to insert controls at.
   * @param controls Input controls to add after the last one.
   *
   * @returns `this` controls instance.
   */
  insert(index: number, ...controls: InControl<Item>[]): this {
    return this.splice(index, 0, ...controls);
  }

  /**
   * Removes input controls starting at the given index.
   *
   * @param start An index of the first control to remove.
   * @param end An index of the control next to the last one to remove. Only one control will be removed if omitted.
   *
   * @returns `this` controls instance.
   */
  remove(start: number, end?: number): this {
    return this.splice(start, end == null ? 1 : end - start);
  }

  /**
   * Changes the contents of controls array by removing existing controls.
   *
   * @param start The index at which to start changing the array.
   * @param deleteCount An integer indicating the number of elements in the array to remove from `start`. If omitted
   * then all controls from `start` will be removed.
   *
   * @returns `this` controls instance.
   */
  abstract splice(start: number, deleteCount?: number): this;

  /**
   * Changes the contents of controls array by removing or replacing existing controls and/or adding new ones.
   *
   * @param start The index at which to start changing the array.
   * @param deleteCount An integer indicating the number of elements in the array to remove from start.
   * @param controls Controls to add.
   *
   * @returns `this` controls instance.
   */
  abstract splice(start: number, deleteCount: number, ...controls: InControl<Item>[]): this;

}

export interface InListControls<Item> {

  readonly [OnEvent__symbol]: OnEvent<[InList.Entry<Item>[], InList.Entry<Item>[]]>;

  readonly [AfterEvent__symbol]: AfterEvent<[InList.Snapshot<Item>]>;

}

type ControlEntry<Item> = [InControl<Item>, EventInterest];

class InListSnapshot<Item> implements InList.Snapshot<Item> {

  constructor(readonly _entries: ControlEntry<Item>[]) {
  }

  get length() {
    return this._entries.length;
  }

  [Symbol.iterator](): IterableIterator<InControl<Item>> {
    return itsIterable(mapIt(this._entries, ([control]) => control));
  }

  * entries(): IterableIterator<InList.Entry<Item>> {

    let index = 0;

    for (const entry of this._entries) {
      yield [index++, entry[0]];
    }
  }

  item(index: number) {

    const entry = this._entries[index];

    return entry && entry[0];
  }

}

const controlReplacedReason = {};

class InListEntries<Item> {

  readonly _interest = eventInterest();
  _entries: ControlEntry<Item>[];
  private _shot?: InListSnapshot<Item>;

  constructor(
      readonly _controls: InListControlControls<Item>,
      initial: InControl<Item>[]) {
    this._entries = initial.map(control => controlEntry(this, control));
  }

  splice(
      start: number,
      deleteCount: number | undefined,
      controls: InControl<Item>[],
      added: [number, ControlEntry<Item>][],
      removed: [number, ControlEntry<Item>][],
  ) {

    const self = this;
    const extracted = deleteCount == null ? modify().splice(start) : modify().splice(
        start,
        deleteCount,
        ...controls.map(
            (control, index) => {

              const entry = controlEntry(this, control);

              added.push([start + index, entry]);

              return entry;
            }
        )
    );

    removed.push(
        ...extracted.map((entry, index) => {
          entry[1].off(controlReplacedReason);
          return [start + index, entry] as [number, ControlEntry<Item>];
        })
    );

    function modify(): ControlEntry<Item>[] {
      if (self._shot) {
        self._shot = undefined;
        self._entries = [...self._entries];
      }
      return self._entries;
    }
  }

  snapshot() {
    return this._shot || (this._shot = new InListSnapshot<Item>(this._entries));
  }

}

function controlEntry<Item>(
    entries: InListEntries<Item>,
    control: InControl<Item>,
): ControlEntry<Item> {
  return [
    control,
    eventInterest(reason => {
      if (reason !== controlReplacedReason) {
        entries._controls.remove(entries._entries.findIndex(e => e && e[0] === control));
      }
    }).needs(entries._interest)
  ];
}

function readControlValue<Item>(
    controls: InListControlControls<Item>,
    [control, interest]: ControlEntry<Item>) {
  interest.needs(control.aspect(InParents).add({ parent: controls._list }).needs(interest));
  interest.needs(control.read(value => {

    const index = controls._entries._entries.findIndex(([ctrl]) => ctrl === control);
    const model = controls._list.it;

    if (model[index] !== value) {

      const newModel = [...controls._list.it];

      newModel[index] = control.it;

      controls._list.it = newModel;
    }
  }).needs(interest));
}

class InListControlControls<Item> extends InListControls<Item> {

  readonly _entries: InListEntries<Item>;
  private readonly _updates = new EventEmitter<[[number, ControlEntry<Item>][], [number, ControlEntry<Item>][]]>();
  readonly on: OnEvent<[InList.Entry<Item>[], InList.Entry<Item>[]]>;
  readonly read: AfterEvent<[InList.Snapshot<Item>]>;

  constructor(readonly _list: InListControl<Item>) {
    super();

    const self = this;

    this._entries = new InListEntries(this, controlsByModel(_list.it, 0));
    this.on = this._updates.on.thru(
        (added, removed) => nextArgs(
            added.map(controlEntryToListEntry),
            removed.map(controlEntryToListEntry)),
    );
    this.read = afterEventOr(
        this._updates.on.thru(
            () => this._entries.snapshot(),
        ),
        () => [this._entries.snapshot()]);
    this._entries._interest.needs(_list.read(applyModelToControls))
        .whenDone(reason => this._updates.done(reason));
    this._entries._entries.forEach(entry => readControlValue(this, entry));

    function applyModelToControls(this: EventReceiver.Context<[readonly Item[]]>, model: readonly Item[]) {
      this.afterRecurrent(noop);

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
        self.add(...controlsByModel(model, entries.length));
      }
    }
  }

  add(...controls: InControl<Item>[]): this {
    return this.splice(this._entries._entries.length, 0, ...controls);
  }

  splice(start: number, deleteCount?: number, ...controls: InControl<Item>[]): this {

    const list = this._list;
    const added: [number, ControlEntry<Item>][] = [];
    const removed: [number, ControlEntry<Item>][] = [];

    this._entries.splice(start, deleteCount, controls, added, removed);

    if (added.length || removed.length) {

      const updated = [...list.it];

      updated.splice(start, removed.length, ...added.map(([, [control]]) => control.it));
      list.it = updated;

      this._updates.send(added, removed);
      added.forEach(([, entry]) => readControlValue(this, entry));
    }

    return this;
  }

}

function controlsByModel<Item>(model: readonly Item[], start: number): InControl<Item>[] {

  const controls: InControl<Item>[] = [];

  for (let i = start; i < model.length; ++i) {
    controls.push(inValue(model[i]));
  }

  return controls;
}

function controlEntryToListEntry<Item>([key, [control]]: [number, ControlEntry<Item>]): InList.Entry<Item> {
  return [key, control];
}

class InListControl<Item> extends InList<Item> {

  private readonly _model: ValueTracker<readonly Item[]>;
  readonly controls: InListControlControls<Item>;

  constructor(model: readonly Item[], readonly element?: HTMLElement) {
    super();
    this._model = trackValue(model);
    this.controls = new InListControlControls(this);
  }

  get on() {
    return this._model.on;
  }

  get it() {
    return this._model.it;
  }

  set it(value: readonly Item[]) {
    this._model.it = value;
  }

  done(reason?: any): this {
    this._model.done(reason);
    return this;
  }

  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>,
  ): InAspect.Application.Result<Instance, readonly Item[], Kind> | undefined {
    if (aspect as InAspect<any> === InData[InAspect__symbol]) {
      return {
        instance: listData(this),
        convertTo: noop,
      } as InAspect.Application.Result<any, any, any>;
    }
    return super._applyAspect(aspect);
  }

}

function listData<Item>(list: InList<Item>): InData<readonly Item[]> {
  return afterEventFromAll({
    cs: list.controls,
    mode: list.aspect(InMode),
  }).keep.dig_(
      readListData,
  );
}

function readListData<Item>(
    {
      cs: [controls],
      mode: [mode],
    }: {
      cs: [InList.Snapshot<Item>];
      mode: [InMode.Value];
    }
): InData<readonly Item[]> {
  if (!InMode.hasData(mode)) {
    return afterEventOf();
  }

  const csData = mapIt(controls, control => control.aspect(InData));

  return afterEventFromEach(...csData).keep.thru((...controlsData) => {
    return controlsData.map(([d]) => d).filter(isDefined) as InData.DataType<readonly Item[]>;
  });
}

/**
 * Constructs input controls list.
 *
 * @typeparam Item Model item type.
 * @param model Initial model of the list.
 * @param element Optional HTML element the list is constructed for.
 *
 * @returns New input controls group.
 */
export function inList<Item>(model: readonly Item[], element?: HTMLElement): InList<Item> {
  return new InListControl(model, element);
}
