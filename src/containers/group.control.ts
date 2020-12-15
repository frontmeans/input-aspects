/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import {
  afterAll,
  AfterEvent,
  AfterEvent__symbol,
  afterThe,
  digAfter_,
  EventEmitter,
  EventKeeper,
  EventSender,
  mapAfter,
  onceAfter,
  OnEvent,
  OnEvent__symbol,
  supplyAfter,
  trackValue,
  translateOn,
  ValueTracker,
} from '@proc7ts/fun-events';
import { neverSupply, noop, Supply } from '@proc7ts/primitives';
import {
  iteratorOf,
  itsEach,
  mapIt,
  overEntries,
  overIterator,
  PushIterable,
  PushIterator,
  PushIterator__symbol,
} from '@proc7ts/push-iterator';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectSameOrNull } from '../aspect.impl';
import { InControl } from '../control';
import { InConverter } from '../converter';
import { InData, InMode } from '../data';
import { InContainer, InContainerControls } from './container.control';
import { InParents } from './parents.aspect';

/**
 * @internal
 */
const InGroup__aspect: InAspect<InGroup<any> | null, 'group'> = {
  applyTo(control) {
    return inAspectSameOrNull(control, InGroup);
  },
};

/**
 * A group of input controls.
 *
 * Nested controls are identified by keys and can be added and removed via `controls` property.
 *
 * Group value (called model) is an object formed by nested control values. The model property value is the one of the
 * control with the same key, if present. When model is updated corresponding controls are also updated.
 *
 * Group is available as an aspect of itself and converted controls with the same value.
 *
 * @category Control
 * @typeParam TModel - Group model type, i.e. its value type.
 */
export abstract class InGroup<TModel extends object> extends InContainer<TModel> {

  static get [InAspect__symbol](): InAspect<InGroup<any> | null, 'group'> {
    return InGroup__aspect;
  }

  /**
   * Input group controls.
   */
  abstract readonly controls: InGroupControls<TModel>;

  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<any, any>,
  ): InAspect.Application.Result<Instance, TModel, Kind> | undefined {
    return aspect === InGroup__aspect
        ? inAspectSameOrNull(this, InGroup, this) as InAspect.Application.Result<Instance, TModel, Kind>
        : super._applyAspect(aspect);
  }

}

export namespace InGroup {

  /**
   * Input group controls.
   *
   * This is a read-only object containing an input control per each model property under the same key.
   *
   * @typeParam TModel - Group model type, i.e. its value type.
   */
  export type Controls<TModel> = {
    readonly [K in keyof TModel]?: InControl<TModel[K]>;
  };

  /**
   * Input controls group entry.
   *
   * This is a tuple containing model key and corresponding control.
   *
   * @typeParam TModel - Group model type, i.e. its value type.
   * @typeParam TKey - Model keys type.
   */
  export type Entry<TModel, TKey extends keyof TModel = any> = readonly [TKey, InControl<TModel[TKey]>];

  /**
   * A snapshot of input control group controls.
   *
   * @typeParam TModel - Group model type, i.e. its value type.
   */
  export interface Snapshot<TModel> extends InContainer.Snapshot {

    entries(): IterableIterator<Entry<TModel>>;

    /**
     * Returns input control with the given key, if present.
     *
     * @param key - Control key, i.e. corresponding model property key.
     *
     * @returns Target control, or `undefined` if there is no control set for this key.
     */
    get<TKey extends keyof TModel>(key: TKey): InGroup.Controls<TModel>[TKey] | undefined;

  }

}

/**
 * Input group controls.
 *
 * @category Control
 * @typeParam TModel - Group model type, i.e. its value type.
 */
export abstract class InGroupControls<TModel>
    extends InContainerControls
    implements EventSender<[InGroup.Entry<TModel>[], InGroup.Entry<TModel>[]]>,
        EventKeeper<[InGroup.Snapshot<TModel>]> {

  abstract readonly on: OnEvent<[InGroup.Entry<TModel>[], InGroup.Entry<TModel>[]]>;

  abstract readonly read: AfterEvent<[InGroup.Snapshot<TModel>]>;

  /**
   * Sets input control with the given key.
   *
   * Replaces existing control if already present.
   *
   * @typeParam TKey - Model key type.
   * @param key - A key of input control to set. I.e. corresponding model property key.
   * @param control - Input control to add, or `undefined` to remove control.
   *
   * @returns A supply of just added control that removes it once cut off. A cut off supply when set to `undefined`.
   */
  abstract set<TKey extends keyof TModel>(key: TKey, control: InControl<TModel[TKey]> | undefined): Supply;

  /**
   * Sets multiple input controls at a time.
   *
   * @param controls - A map of controls under their keys. A value can be `undefined` to remove corresponding control.
   *
   * @returns A supply of just added controls that removes them once cut off.
   */
  abstract set(controls: InGroup.Controls<TModel>): Supply;

  /**
   * Removes input control with the given key.
   *
   * Calling this method is the same as calling `set(key, undefined)`
   *
   * @param key - A key of input control to remove. I.e. corresponding model property key.
   */
  remove(key: keyof TModel): void {
    this.set(key, undefined);
  }

  /**
   * Removes all input controls.
   */
  abstract clear(): void;

}

export interface InGroupControls<TModel> {

  [OnEvent__symbol](): OnEvent<[InGroup.Entry<TModel>[], InGroup.Entry<TModel>[]]>;

  [AfterEvent__symbol](): AfterEvent<[InGroup.Snapshot<TModel>]>;

}

/**
 * @internal
 */
type InGroupEntry = readonly [InControl<any>, Supply]; // When event supply is done the control is unused

/**
 * @internal
 */
const inControlReplacedReason = {};

/**
 * @internal
 */
class InGroupSnapshot<TModel> implements InGroup.Snapshot<TModel>, PushIterable<InControl<any>> {

  private readonly _it: PushIterable<InControl<any>>;
  private readonly _entriesIt: PushIterable<InGroup.Entry<TModel>>;

  constructor(private readonly _map: Map<keyof TModel, InGroupEntry>) {
    this._it = mapIt(
        overIterator(() => this._map.values()),
        ([control]: InGroupEntry) => control,
    );
    this._entriesIt = mapIt(this._map, ([key, [control]]) => [key, control]);
  }

  get<TKey extends keyof TModel>(key: TKey): InGroup.Controls<TModel>[TKey] | undefined {

    const entry = this._map.get(key);

    return entry && entry[0] as InGroup.Controls<TModel>[TKey];
  }

  [Symbol.iterator](): PushIterator<InControl<any>> {
    return this[PushIterator__symbol]();
  }

  [PushIterator__symbol](accept?: PushIterator.Acceptor<InControl<any>>): PushIterator<InControl<any>> {
    return this._it[PushIterator__symbol](accept);
  }

  entries(): PushIterator<InGroup.Entry<TModel>> {
    return iteratorOf(this._entriesIt);
  }

}

/**
 * @internal
 */
class InGroupMap<TModel extends object> {

  readonly _supply = new Supply();
  private _map = new Map<keyof TModel, InGroupEntry>();
  private _shot?: InGroupSnapshot<TModel>;

  constructor(private readonly _controls: InGroupControlControls<TModel>) {
  }

  set<TKey extends keyof TModel>(
      key: TKey,
      control: InControl<TModel[TKey]> | undefined,
      added: [keyof TModel, InGroupEntry][],
      removed: [keyof TModel, InGroupEntry][],
  ): Supply {

    const replaced = this._map.get(key);
    let supply: Supply;

    if (control) {
      supply = new Supply();

      const entry = this.newEntry(key, control, supply);

      let sendUpdate = true;

      if (replaced) {
        if (replaced[0] === control) {
          // Do not send update when replacing control with itself
          sendUpdate = false;
        } else {
          removed.push([key, replaced]);
        }
      }

      if (sendUpdate) {
        this.modify().set(key, entry);
        added.push([key, entry]);
      } else {
        this._map.set(key, entry);
      }
    } else {
      supply = neverSupply();
      if (replaced) {
        removed.push([key, replaced]);
        this.modify().delete(key);
      }
    }
    if (replaced) {
      replaced[1].off(inControlReplacedReason);
    }

    return supply;
  }

  private newEntry<TKey extends keyof TModel>(
      key: TKey,
      control: InControl<TModel[TKey]>,
      supply: Supply,
  ): InGroupEntry {
    return [
      control,
      new Supply(reason => {
        if (reason !== inControlReplacedReason) {
          this._controls.remove(key);
        }
      })
          .needs(this._supply)
          .needs(supply)
          .whenOff(
              reason => supply.off(reason === inControlReplacedReason ? undefined : reason),
          ),
    ];
  }

  private modify(): Map<keyof TModel, InGroupEntry> {
    if (this._shot) {

      const map = new Map<keyof TModel, InGroupEntry>();

      itsEach(this._map.entries(), ([k, e]) => map.set(k, e));
      this._shot = undefined;
      this._map = map;
    }

    return this._map;
  }

  snapshot(): InGroup.Snapshot<TModel> {
    return this._shot || (this._shot = new InGroupSnapshot<TModel>(this._map));
  }

  clear(): [keyof TModel, InGroupEntry][] {

    const added: [keyof TModel, InGroupEntry][] = [];
    const removed: [keyof TModel, InGroupEntry][] = [];

    itsEach(this._map.keys(), key => this.set(key, undefined, added, removed));

    return removed;
  }

}

/**
 * @internal
 */
class InGroupControlControls<TModel extends object> extends InGroupControls<TModel> {

  readonly on: OnEvent<[InGroup.Entry<TModel>[], InGroup.Entry<TModel>[]]>;
  readonly read: AfterEvent<[InGroup.Snapshot<TModel>]>;
  private readonly _map: InGroupMap<TModel>;
  private readonly _updates = new EventEmitter<[[keyof TModel, InGroupEntry][], [keyof TModel, InGroupEntry][]]>();

  constructor(private readonly _group: InGroupControl<TModel>) {
    super();

    const applyModelToControls = (model: TModel): void => {
      this.read.do(onceAfter)(snapshot => {

        const withValues = new Set<keyof TModel>();

        itsEach(overEntries(model), ([key, value]) => {
          withValues.add(key);

          const control = snapshot.get(key);

          if (control) {
            control.it = value;
          }
        });

        itsEach(snapshot.entries(), ([key, control]) => {
          if (!withValues.has(key)) {
            control.it = undefined!;
          }
        });
      });
    };

    this._map = new InGroupMap<TModel>(this);

    this.on = this._updates.on.do(translateOn(
        (send, added, removed) => send(
            added.map(controlEntryToGroupEntry),
            removed.map(controlEntryToGroupEntry),
        ),
    ));

    const takeSnapshot = this._map.snapshot.bind(this._map);

    this.read = this._updates.on.do(mapAfter(
        takeSnapshot,
        takeSnapshot,
    ));

    this._map._supply.needs(_group.read(applyModelToControls));
  }

  set<TKey extends keyof TModel>(
      keyOrControls: TKey | InGroup.Controls<TModel>,
      newControl?: InControl<TModel[TKey]> | undefined,
  ): Supply {

    const group = this._group;
    const added: [keyof TModel, InGroupEntry][] = [];
    const removed: [keyof TModel, InGroupEntry][] = [];
    let supply: Supply;

    if (typeof keyOrControls === 'object') {
      supply = new Supply();
      itsEach(overEntries(keyOrControls), ([key, value]) => {
        this._map.set(key, value, added, removed).needs(supply);
      });
    } else {
      supply = this._map.set(keyOrControls, newControl, added, removed);
    }
    if (added.length || removed.length) {
      this._updates.send(added, removed);
      if (added.length) {
        applyControlsToModel();
      }
    }

    return supply;

    function applyControlsToModel(): void {

      let newModel: TModel | undefined;

      added.forEach(<TKey extends keyof TModel>(keyAndEntry: [keyof TModel, InGroupEntry]) => {

        const [key, [control, supply]] = keyAndEntry as [TKey, [InControl<TModel[TKey]>, Supply]];

        control.aspect(InParents)
            .add({ parent: group })
            .needs(supply)
            .cuts(supply);

        const value = control.it;

        if (newModel) {
          newModel[key] = value;
        } else {

          const model = group.it;

          if (model[key] !== value) {
            newModel = { ...model, [key]: value };
          }
        }
      });

      if (newModel) {
        group.it = newModel;
      }

      added.forEach(<TKey extends keyof TModel>(keyAndEntry: [keyof TModel, InGroupEntry]) => {

        const [key, [control, supply]] = keyAndEntry as [TKey, [InControl<TModel[TKey]>, Supply]];

        control.read.do(supplyAfter(supply))(value => {
          if (group.it[key] !== value) {
            group.it = {
              ...group.it,
              [key]: value,
            };
          }
        }).cuts(supply);
      });
    }
  }

  clear(): void {

    const removed = this._map.clear();

    if (removed.length) {
      this._updates.send([], removed);
    }
  }

}

/**
 * @internal
 */
function controlEntryToGroupEntry<TModel extends object>(
    [key, [control]]: [keyof TModel, InGroupEntry],
): InGroup.Entry<TModel> {
  return [key, control];
}

/**
 * @internal
 */
class InGroupControl<TModel extends object> extends InGroup<TModel> {

  private readonly _model: ValueTracker<TModel>;
  readonly controls: InGroupControlControls<TModel>;

  constructor(
      model: TModel,
      opts: {
        readonly aspects?: InConverter.Aspect<TModel> | readonly InConverter.Aspect<TModel>[];
      },
  ) {
    super(opts);
    this._model = trackValue(model);
    this.controls = new InGroupControlControls(this);
    this.supply.whenOff(() => this.controls.clear());
  }

  get supply(): Supply {
    return this._model.supply;
  }

  get it(): TModel {
    return this._model.it;
  }

  set it(value: TModel) {
    this._model.it = value;
  }

  get on(): OnEvent<[TModel, TModel]> {
    return this._model.on;
  }

  protected _applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
      aspect: InAspect<any, any>,
  ): InAspect.Application.Result<TInstance, TModel, TKind> | undefined {
    if (aspect === InData[InAspect__symbol]) {
      return {
        instance: inGroupData(this),
        convertTo: noop,
      } as InAspect.Application.Result<any, any, any>;
    }
    return super._applyAspect(aspect);
  }

}

/**
 * @internal
 */
function inGroupData<TModel extends object>(group: InGroup<TModel>): InData<TModel> {
  return afterAll({
    cs: group.controls,
    model: group,
    mode: group.aspect(InMode),
  }).do(
      digAfter_(readInGroupData),
  );
}

/**
 * @internal
 */
function readInGroupData<TModel extends object>(
    {
      cs: [controls],
      model: [model],
      mode: [mode],
    }: {
      cs: [InGroup.Snapshot<TModel>];
      model: [TModel];
      mode: [InMode.Value];
    },
): AfterEvent<[InData.DataType<TModel>?]> {
  if (!InMode.hasData(mode)) {
    return afterThe();
  }

  const csData = {} as { [key in keyof TModel]: InData<any> };

  itsEach(controls.entries(), ([key, control]) => {
    csData[key as keyof TModel] = control.aspect(InData);
  });

  return afterAll(csData).do(mapAfter(controlsData => {

    const data: Partial<TModel> = { ...model };

    itsEach(
        overEntries(controlsData),
        <TKey extends keyof TModel>(keyAndControlData: readonly [keyof TModel, [InData.DataType<any>?]]) => {

          const [key, [controlData]] = keyAndControlData as readonly [TKey, [TModel[TKey]?]];

          data[key] = controlData;
        },
    );

    return data as InData.DataType<TModel>;
  }));
}

/**
 * Constructs input controls group.
 *
 * @category Control
 * @typeParam TModel - Group model type, i.e. its value type.
 * @param model - Initial model of the group.
 * @param aspects - Input aspects applied by default. These are aspect converters to constructed control
 * from {@link inValueOf same-valued one}.
 *
 * @returns New input controls group.
 */
export function inGroup<TModel extends object>(
    model: TModel,
    {
      aspects,
    }: {
      readonly aspects?: InConverter.Aspect<TModel> | readonly InConverter.Aspect<TModel>[];
    } = {},
): InGroup<TModel> {
  return new InGroupControl(model, { aspects });
}

declare module '../aspect' {

  export namespace InAspect.Application {

    export interface Map<TInstance, TValue> {

      /**
       * Input control group application type.
       */
      group(): InGroup<TValue extends object ? TValue : never> | null;

    }

  }

}
