import {
  afterAll,
  afterEach,
  AfterEvent,
  AfterEvent__symbol,
  afterThe,
  digAfter_,
  EventEmitter,
  EventKeeper,
  EventReceiver,
  EventSender,
  mapAfter,
  OnEvent,
  OnEvent__symbol,
  trackValue,
  translateOn,
  ValueTracker,
} from '@proc7ts/fun-events';
import { isDefined, neverSupply, noop, Supply } from '@proc7ts/primitives';
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
 * @typeParam TItem - Model item type.
 */
export abstract class InList<TItem> extends InContainer<readonly TItem[]> {

  static get [InAspect__symbol](): InAspect<InList<any> | null, 'list'> {
    return InList__aspect;
  }

  /**
   * Input list controls.
   */
  abstract readonly controls: InListControls<TItem>;

  protected _applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
      aspect: InAspect<any, any>,
  ): InAspect.Application.Result<TInstance, readonly TItem[], TKind> | undefined {
    return aspect === InList__aspect
        ? inAspectSameOrNull(this, InList, this) as InAspect.Application.Result<TInstance, readonly TItem[], TKind>
        : super._applyAspect(aspect);
  }

}

/**
 * @category Control
 */
export namespace InList {

  /**
   * Input controls list entry.
   *
   * This is a tuple containing model index and corresponding control.
   *
   * @typeParam TItem - Model item type.
   */
  export type Entry<TItem> = readonly [number, InControl<TItem>];

  /**
   * A snapshot of input control list controls.
   *
   * @typeParam TItem - Model item type.
   */
  export interface Snapshot<TItem> extends InContainer.Snapshot {

    /**
     * Input controls array length.
     */
    readonly length: number;

    [Symbol.iterator](): IterableIterator<InControl<TItem>>;

    entries(): IterableIterator<Entry<TItem>>;

    /**
     * Returns input control at the given `index`, if present.
     *
     * @param index - Control index, i.e. corresponding model item index.
     *
     * @returns Target control, or `undefined` if there is no control at this `index`.
     */
    item(index: number): InControl<TItem> | undefined;

  }

}

/**
 * Input list controls.
 *
 * @category Control
 * @typeParam TItem - Model item type.
 */
export abstract class InListControls<TItem>
    extends InContainerControls
    implements EventSender<[InList.Entry<TItem>[], InList.Entry<TItem>[]]>, EventKeeper<[InList.Snapshot<TItem>]> {

  abstract readonly on: OnEvent<[InList.Entry<TItem>[], InList.Entry<TItem>[]]>;

  abstract readonly read: AfterEvent<[InList.Snapshot<TItem>]>;

  /**
   * Sets input control with the given index.
   *
   * Replaces existing control if already present.
   *
   * @param index - An index of input control to set. I.e. corresponding model item index.
   * @param control - Input control to add.
   *
   * @returns A supply of just added control that removes it once cut off.
   */
  set(index: number, control: InControl<TItem>): Supply {
    return this.splice(index, 1, control);
  }

  /**
   * Appends input controls.
   *
   * @param controls - Input controls to add after the last one.
   *
   * @returns A supply of just added controls that removes them once cut off. Cut off supply when no controls added.
   */
  abstract add(...controls: InControl<TItem>[]): Supply;

  /**
   * Inserts input controls at the given position.
   *
   * @param index - An index to insert controls at.
   * @param controls - Input controls to add after the last one.
   *
   * @returns A supply of just inserted controls that removes them once cut off. Cut off supply when no controls
   * inserted.
   */
  insert(index: number, ...controls: InControl<TItem>[]): Supply {
    return this.splice(index, 0, ...controls);
  }

  /**
   * Removes input controls starting at the given index.
   *
   * @param start - An index of the first control to remove.
   * @param end - An index of the control next to the last one to remove. Only one control will be removed if omitted.
   */
  remove(start: number, end?: number): void {
    this.splice(start, end == null ? 1 : end - start);
  }

  /**
   * Changes the contents of controls array by removing or replacing existing controls and/or adding new ones.
   *
   * @param start - The index at which to start changing the array.
   * @param deleteCount - An integer indicating the number of elements in the array to remove from start. If omitted
   * then all controls from `start` will be removed.
   * @param controls - Controls to add.
   *
   * @returns A supply of just added controls that removes them once cut off. Cut off supply when no controls added.
   */
  abstract splice(start: number, deleteCount?: number, ...controls: InControl<TItem>[]): Supply;

  /**
   * Removes all input controls.
   */
  clear(): void {
    this.splice(0);
  }

}

export interface InListControls<TItem> {

  [OnEvent__symbol](): OnEvent<[InList.Entry<TItem>[], InList.Entry<TItem>[]]>;

  [AfterEvent__symbol](): AfterEvent<[InList.Snapshot<TItem>]>;

}

/**
 * @internal
 */
type InListEntry<TItem> = [InControl<TItem>, Supply];

/**
 * @internal
 */
class InListSnapshot<TItem> implements InList.Snapshot<TItem>, PushIterable<InControl<TItem>> {

  private readonly _it: PushIterable<InControl<TItem>>;
  private readonly _entriesIt: PushIterable<InList.Entry<TItem>>;

  constructor(readonly _entries: InListEntry<TItem>[]) {
    this._it = mapArray(this._entries, ([control]) => control);
    this._entriesIt = overIterator(() => iteratorOf(this._entries.map(
        ([entry], index): InList.Entry<TItem> => [index, entry],
    )));
  }

  get length(): number {
    return this._entries.length;
  }

  [Symbol.iterator](): PushIterator<InControl<TItem>> {
    return this[PushIterator__symbol]();
  }

  [PushIterator__symbol](accept?: PushIterator.Acceptor<InControl<TItem>>): PushIterator<InControl<TItem>> {
    return this._it[PushIterator__symbol](accept);
  }

  entries(): PushIterator<InList.Entry<TItem>> {
    return iteratorOf(this._entriesIt);
  }

  item(index: number): InControl<TItem> | undefined {

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
class InListEntries<TItem> {

  readonly _supply = new Supply();
  _entries: InListEntry<TItem>[];
  private _shot?: InListSnapshot<TItem>;

  constructor(
      readonly _controls: InListControlControls<TItem>,
      initial: InControl<TItem>[],
  ) {
    this._entries = initial.map(control => inListEntry(this, control));
  }

  splice(
      start: number,
      deleteCount: number | undefined,
      controls: InControl<TItem>[],
      added: [number, InListEntry<TItem>][],
      removed: [number, InListEntry<TItem>][],
  ): Supply {

    let supply = controls.length > 1 ? new Supply() : undefined;
    const modify = (): InListEntry<TItem>[] => {
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
              return [start + index, entry] as [number, InListEntry<TItem>];
            },
        ),
    );

    if (!supply) {
      return neverSupply();
    }

    const result = new Supply();

    supply.needs(result).whenOff(
        reason => result.off(reason !== inControlReplacedReason ? reason : undefined),
    );

    return result;
  }

  snapshot(): InList.Snapshot<TItem> {
    return this._shot || (this._shot = new InListSnapshot<TItem>(this._entries));
  }

}

/**
 * @internal
 */
function inListEntry<TItem>(
    entries: InListEntries<TItem>,
    control: InControl<TItem>,
): InListEntry<TItem> {

  const entry: InListEntry<TItem> = [
    control,
    new Supply(reason => {
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
function readControlValue<TItem>(
    controls: InListControlControls<TItem>,
    [control, supply]: InListEntry<TItem>,
): void {
  control.aspect(InParents).add({ parent: controls._list }).as(supply);
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
class InListControlControls<TItem> extends InListControls<TItem> {

  readonly on: OnEvent<[InList.Entry<TItem>[], InList.Entry<TItem>[]]>;
  readonly read: AfterEvent<[InList.Snapshot<TItem>]>;
  readonly _entries: InListEntries<TItem>;
  private readonly _updates = new EventEmitter<[[number, InListEntry<TItem>][], [number, InListEntry<TItem>][]]>();

  constructor(readonly _list: InListControl<TItem>) {
    super();

    this._entries = new InListEntries(this, inListControlsByModel(_list.it, 0));

    const applyModelToControls: EventReceiver.Object<[readonly TItem[]]> = {
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

    this.on = this._updates.on.do(translateOn(
        (send, added, removed) => send(
            added.map(toInListEntry),
            removed.map(toInListEntry),
        ),
    ));

    const takeSnapshot = this._entries.snapshot.bind(this._entries);

    this.read = this._updates.on.do(mapAfter(
        takeSnapshot,
        takeSnapshot,
    ));

    this._entries._entries.forEach(entry => readControlValue(this, entry));
  }

  add(...controls: InControl<TItem>[]): Supply {
    return this.splice(this._entries._entries.length, 0, ...controls);
  }

  splice(start: number, deleteCount?: number, ...controls: InControl<TItem>[]): Supply {

    const list = this._list;
    const added: [number, InListEntry<TItem>][] = [];
    const removed: [number, InListEntry<TItem>][] = [];
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
function inListControlsByModel<TItem>(model: readonly TItem[], start: number): InControl<TItem>[] {

  const controls: InControl<TItem>[] = [];

  for (let i = start; i < model.length; ++i) {
    controls.push(inValue(model[i]));
  }

  return controls;
}

/**
 * @internal
 */
function toInListEntry<TItem>([key, [control]]: [number, InListEntry<TItem>]): InList.Entry<TItem> {
  return [key, control];
}

/**
 * @internal
 */
class InListControl<TItem> extends InList<TItem> {

  private readonly _model: ValueTracker<readonly TItem[]>;
  readonly controls: InListControlControls<TItem>;

  constructor(
      model: readonly TItem[],
      opts: {
        readonly aspects?: InConverter.Aspect<readonly TItem[]> | readonly InConverter.Aspect<readonly TItem[]>[];
      },
  ) {
    super(opts);
    this._model = trackValue(model);
    this.controls = new InListControlControls(this);
    this.supply.whenOff(() => this.controls.clear());
  }

  get supply(): Supply {
    return this._model.supply;
  }

  get it(): readonly TItem[] {
    return this._model.it;
  }

  set it(value: readonly TItem[]) {
    this._model.it = value;
  }

  get on(): OnEvent<[readonly TItem[], readonly TItem[]]> {
    return this._model.on;
  }

  protected _applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
      aspect: InAspect<any, any>,
  ): InAspect.Application.Result<TInstance, readonly TItem[], TKind> | undefined {
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
function inListData<TItem>(list: InList<TItem>): InData<readonly TItem[]> {
  return afterAll({
    cs: list.controls,
    mode: list.aspect(InMode),
  }).do(
      digAfter_(readInListData),
  );
}

/**
 * @internal
 */
function readInListData<TItem>(
    {
      cs: [controls],
      mode: [mode],
    }: {
      cs: [InList.Snapshot<TItem>];
      mode: [InMode.Value];
    },
): AfterEvent<[InData.DataType<readonly TItem[]>?]> {
  if (!InMode.hasData(mode)) {
    return afterThe();
  }

  const csData = mapIt(controls, control => control.aspect(InData));

  return afterEach(...csData).do(mapAfter(
      (...controlsData) => controlsData.map(([d]) => d).filter(isDefined),
  ));
}

/**
 * Constructs input controls list.
 *
 * @category Control
 * @typeParam TItem - Model item type.
 * @param model - Initial model of the list.
 * @param aspects - Input aspects applied by default. These are aspect converters to constructed control
 * from {@link inValueOf same-valued one}.
 *
 * @returns New input controls group.
 */
export function inList<TItem>(
    model: readonly TItem[],
    {
      aspects,
    }: {
      readonly aspects?: InConverter.Aspect<readonly TItem[]> | readonly InConverter.Aspect<readonly TItem[]>[];
    } = {},
): InList<TItem> {
  return new InListControl(model, { aspects });
}

declare module '../aspect' {

  export namespace InAspect.Application {

    export interface Map<TInstance, TValue> {

      /**
       * Input controls list application type.
       */
      list(): InList<TValue extends readonly (infer TItem)[] ? TItem : never> | null;

    }

  }

}
