/**
 * @packageDocumentation
 * @module @proc7ts/input-aspects
 */
import { nextArgs, NextCall } from '@proc7ts/call-thru';
import {
  afterAll,
  afterEach,
  AfterEvent,
  AfterEvent__symbol,
  afterSent,
  EventEmitter,
  EventKeeper,
  EventReceiver,
  EventSender,
  eventSupply,
  EventSupply,
  EventSupply__symbol,
  eventSupplyOf,
  nextAfterEvent,
  noEventSupply,
  OnEvent,
  OnEvent__symbol,
  OnEventCallChain,
  trackValue,
  ValueTracker,
} from '@proc7ts/fun-events';
import { isDefined, noop } from '@proc7ts/primitives';
import {
  iteratorOf,
  mapArray,
  mapIt,
  overIterator,
  PushIterable,
  PushIterator,
  PushIterator__symbol,
} from '@proc7ts/push-iterator';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectSameOrNull } from '../aspect.impl';
import { InControl } from '../control';
import { inValue } from '../controls';
import { InConverter } from '../converter';
import { InData, InMode } from '../data';
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

  abstract on(): OnEvent<[InList.Entry<Item>[], InList.Entry<Item>[]]>;
  abstract on(receiver: EventReceiver<[InList.Entry<Item>[], InList.Entry<Item>[]]>): EventSupply;

  abstract read(): AfterEvent<[InList.Snapshot<Item>]>;
  abstract read(receiver: EventReceiver<[InList.Snapshot<Item>]>): EventSupply;

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

  [OnEvent__symbol](): OnEvent<[InList.Entry<Item>[], InList.Entry<Item>[]]>;

  [AfterEvent__symbol](): AfterEvent<[InList.Snapshot<Item>]>;

}

/**
 * @internal
 */
type InListEntry<Item> = [InControl<Item>, EventSupply];

/**
 * @internal
 */
class InListSnapshot<Item> implements InList.Snapshot<Item>, PushIterable<InControl<Item>> {

  private readonly _it: PushIterable<InControl<Item>>;
  private readonly _entriesIt: PushIterable<InList.Entry<Item>>;

  constructor(readonly _entries: InListEntry<Item>[]) {
    this._it = mapArray(this._entries, ([control]) => control);
    this._entriesIt = overIterator(() => iteratorOf(this._entries.map(
        ([entry], index): InList.Entry<Item> => [index, entry],
    )));
  }

  get length(): number {
    return this._entries.length;
  }

  [Symbol.iterator](): PushIterator<InControl<Item>> {
    return this[PushIterator__symbol]();
  }

  [PushIterator__symbol](accept?: PushIterator.Acceptor<InControl<Item>>): PushIterator<InControl<Item>> {
    return this._it[PushIterator__symbol](accept);
  }

  entries(): PushIterator<InList.Entry<Item>> {
    return iteratorOf(this._entriesIt);
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

    let supply = controls.length > 1 ? eventSupply() : undefined;
    const modify = (): InListEntry<Item>[] => {
      if (this._shot) {
        this._shot = undefined;
        this._entries = this._entries.slice();
      }
      return this._entries;
    };
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

    supply.needs(result).whenOff(
        reason => result.off(reason !== inControlReplacedReason ? reason : undefined),
    );

    return result;
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
  control.aspect(InParents)
      .add({ parent: controls._list })
      .needs(supply)
      .cuts(supply);
  control.read({
    supply,
    receive: (_ctx, value) => {

      const index = controls._entries._entries.findIndex(([ctrl]) => ctrl === control);
      const model = controls._list.it;

      if (model[index] !== value) {

        const newModel = controls._list.it.slice();

        newModel[index] = control.it;

        controls._list.it = newModel;
      }
    },
  });
}

/**
 * @internal
 */
class InListControlControls<Item> extends InListControls<Item> {

  readonly _entries: InListEntries<Item>;
  private readonly _updates = new EventEmitter<[[number, InListEntry<Item>][], [number, InListEntry<Item>][]]>();

  constructor(readonly _list: InListControl<Item>) {
    super();

    this._entries = new InListEntries(this, inListControlsByModel(_list.it, 0));

    const applyModelToControls: EventReceiver.Object<[readonly Item[]]> = {
      receive: (context, model) => {
        context.onRecurrent(noop);

        const entries = this._entries._entries;

        model.forEach((item, index) => {

          const entry = entries[index];

          if (entry) {
            entry[0].it = item;
          }
        });

        if (model.length < entries.length) {
          // Remove controls without values in model
          this.splice(model.length);
        } else if (model.length > entries.length) {
          // Create missing value controls
          this.add(...inListControlsByModel(model, entries.length));
        }
      },
    };

    this._entries._supply.needs(_list.read(applyModelToControls))
        .needs(this._list)
        .cuts(this._updates);

    this._entries._entries.forEach(entry => readControlValue(this, entry));
  }

  on(): OnEvent<[InList.Entry<Item>[], InList.Entry<Item>[]]>;
  on(receiver: EventReceiver<[InList.Entry<Item>[], InList.Entry<Item>[]]>): EventSupply;
  on(
      receiver?: EventReceiver<[InList.Entry<Item>[], InList.Entry<Item>[]]>,
  ): OnEvent<[InList.Entry<Item>[], InList.Entry<Item>[]]> | EventSupply {
    return (this.on = this._updates.on().thru(
        (added, removed) => nextArgs(
            added.map(toInListEntry),
            removed.map(toInListEntry),
        ),
    ).F)(receiver);
  }

  read(): AfterEvent<[InList.Snapshot<Item>]>;
  read(receiver: EventReceiver<[InList.Snapshot<Item>]>): EventSupply;
  read(
      receiver?: EventReceiver<[InList.Snapshot<Item>]>,
  ): AfterEvent<[InList.Snapshot<Item>]> | EventSupply {
    return (this.read = afterSent<[InList.Snapshot<Item>]>(
        this._updates.on().thru(
            () => this._entries.snapshot(),
        ),
        () => [this._entries.snapshot()],
    ).F)(receiver);
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

      const updated = list.it.slice();

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

  constructor(
      model: readonly Item[],
      opts: {
        readonly aspects?: InConverter.Aspect<readonly Item[]> | readonly InConverter.Aspect<readonly Item[]>[];
      },
  ) {
    super(opts);
    this._model = trackValue(model);
    this.controls = new InListControlControls(this);
    eventSupplyOf(this).whenOff(() => this.controls.clear());
  }

  get [EventSupply__symbol](): EventSupply {
    return eventSupplyOf(this._model);
  }

  get it(): readonly Item[] {
    return this._model.it;
  }

  set it(value: readonly Item[]) {
    this._model.it = value;
  }

  on(): OnEvent<[readonly Item[], readonly Item[]]>;
  on(receiver: EventReceiver<[readonly Item[], readonly Item[]]>): EventSupply;
  on(
      receiver?: EventReceiver<[readonly Item[], readonly Item[]]>,
  ): OnEvent<[readonly Item[], readonly Item[]]> | EventSupply {
    return (this.on = this._model.on().F)(receiver);
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
  }).keepThru_(
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

  return nextAfterEvent(afterEach(...csData).keepThru(
      (...controlsData) => controlsData.map(([d]) => d).filter(isDefined),
  ));
}

/**
 * Constructs input controls list.
 *
 * @category Control
 * @typeparam Item  Model item type.
 * @param model  Initial model of the list.
 * @param aspects  Input aspects applied by default. These are aspect converters to constructed control
 * from {@link inValueOf same-valued one}.
 *
 * @returns New input controls group.
 */
export function inList<Item>(
    model: readonly Item[],
    {
      aspects,
    }: {
      readonly aspects?: InConverter.Aspect<readonly Item[]> | readonly InConverter.Aspect<readonly Item[]>[];
    } = {},
): InList<Item> {
  return new InListControl(model, { aspects });
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
