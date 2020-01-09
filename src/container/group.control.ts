/**
 * @module input-aspects
 */
import { itsEach, itsIterable, mapIt, overEntries } from 'a-iterable';
import { nextArgs, noop } from 'call-thru';
import {
  afterAll,
  AfterEvent,
  AfterEvent__symbol,
  afterEventBy,
  afterThe,
  EventEmitter,
  EventKeeper,
  EventSender,
  eventSupply,
  EventSupply,
  OnEvent,
  OnEvent__symbol,
  trackValue,
  ValueTracker,
} from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { InControl } from '../control';
import { InData, InMode } from '../data';
import { InContainer, InContainerControls } from './container.control';
import { InParents } from './parents.aspect';

/**
 * A group of input controls.
 *
 * Nested controls are identified by keys and can be added and removed via `controls` property.
 *
 * Group value (called model) is an object formed by nested control values. The model property value is the one of the
 * control with the same key, if present. When model is updated corresponding controls are also updated.
 *
 * @category Control
 * @typeparam Model  Group model type, i.e. its value type.
 */
export abstract class InGroup<Model extends object> extends InContainer<Model> {

  /**
   * Input group controls.
   */
  abstract readonly controls: InGroupControls<Model>;

}

export namespace InGroup {

  /**
   * Input group controls.
   *
   * This is a read-only object containing an input control per each model property under the same key.
   *
   * @typeparam Model  Group model type, i.e. its value type.
   */
  export type Controls<Model> = {
    readonly [K in keyof Model]?: InControl<Model[K]>;
  };

  /**
   * Input controls group entry.
   *
   * This is a tuple containing model key and corresponding control.
   *
   * @typeparam Model  Group model type, i.e. its value type.
   */
  export type Entry<Model, K extends keyof Model = any> = readonly [K, InControl<Model[K]>];

  /**
   * A snapshot of input control group controls.
   *
   * @typeparam Model  Group model type, i.e. its value type.
   */
  export interface Snapshot<Model> extends InContainer.Snapshot {

    entries(): IterableIterator<Entry<Model>>;

    /**
     * Returns input control with the given key, if present.
     *
     * @param key  Control key, i.e. corresponding model property key.
     *
     * @returns Target control, or `undefined` if there is no control set for this key.
     */
    get<K extends keyof Model>(key: K): InGroup.Controls<Model>[K] | undefined;

  }

}

/**
 * Input group controls.
 *
 * @category Control
 * @typeparam Model  Group model type, i.e. its value type.
 */
export abstract class InGroupControls<Model>
    extends InContainerControls
    implements EventSender<[InGroup.Entry<Model>[], InGroup.Entry<Model>[]]>, EventKeeper<[InGroup.Snapshot<Model>]> {

  abstract readonly on: OnEvent<[InGroup.Entry<Model>[], InGroup.Entry<Model>[]]>;

  abstract readonly read: AfterEvent<[InGroup.Snapshot<Model>]>;

  /**
   * Sets input control with the given key.
   *
   * Replaces existing control if already present.
   *
   * @param key  A key of input control to set. I.e. corresponding model property key.
   * @param control  Input control to add, or `undefined` to remove control.
   *
   * @returns `this` controls instance.
   */
  abstract set<K extends keyof Model>(key: K, control: InControl<Model[K]> | undefined): this;

  /**
   * Sets multiple input controls at a time.
   *
   * @param controls  A map of controls under their keys. A value can be `undefined` to remove corresponding control.
   *
   * @returns `this` controls instance.
   */
  abstract set(controls: InGroup.Controls<Model>): this;

  /**
   * Removes input control with the given key.
   *
   * Calling this method is the same as calling `set(key, undefined)`
   *
   * @param key  A key of input control to remove. I.e. corresponding model property key.
   *
   * @returns `this` controls instance.
   */
  remove(key: keyof Model): this {
    return this.set(key, undefined);
  }

  /**
   * Removes all input controls.
   *
   * @returns `this` controls instance.
   */
  abstract clear(): this;

}

export interface InGroupControls<Model> {

  readonly [OnEvent__symbol]: OnEvent<[InGroup.Entry<Model>[], InGroup.Entry<Model>[]]>;

  readonly [AfterEvent__symbol]: AfterEvent<[InGroup.Snapshot<Model>]>;

}

type ControlEntry = readonly [InControl<any>, EventSupply]; // When event supply is done the control is unused

const controlReplacedReason = {};

class InGroupSnapshot<Model> implements InGroup.Snapshot<Model> {

  constructor(private readonly _map: Map<keyof Model, ControlEntry>) {
  }

  get<K extends keyof Model>(key: K): InGroup.Controls<Model>[K] | undefined {

    const entry = this._map.get(key);

    return entry && entry[0] as InGroup.Controls<Model>[K];
  }

  [Symbol.iterator](): IterableIterator<InControl<any>> {
    return itsIterable(mapIt(this._map.values(), ([control]) => control));
  }

  entries(): IterableIterator<InGroup.Entry<Model>> {
    return itsIterable(mapIt(this._map.entries(), ([key, [control]]) => [key, control]));
  }

}

class InGroupMap<Model extends object> {

  readonly _supply = eventSupply();
  private _map = new Map<keyof Model, ControlEntry>();
  private _shot?: InGroupSnapshot<Model>;

  constructor(private readonly _controls: InGroupControlControls<Model>) {
  }

  set<K extends keyof Model>(
      key: K,
      control: InControl<Model[K]> | undefined,
      added: [keyof Model, ControlEntry][],
      removed: [keyof Model, ControlEntry][],
  ) {

    const self = this;
    const replaced = this._map.get(key);

    if (control) {
      if (replaced) {
        if (replaced[0] === control) {
          // Do not replace control with itself
          return;
        }
        removed.push([key, replaced]);
      }

      const entry: ControlEntry = [control, eventSupply(reason => {
        if (reason !== controlReplacedReason) {
          self._controls.remove(key);
        }
      }).needs(self._supply)];

      modify().set(key, entry);
      added.push([key, entry]);
    } else if (replaced) {
      removed.push([key, replaced]);
      modify().delete(key);
    }
    if (replaced) {
      replaced[1].off(controlReplacedReason);
    }

    function modify(): Map<keyof Model, ControlEntry> {
      if (self._shot) {

        const map = new Map<keyof Model, ControlEntry>();

        itsEach(self._map.entries(), ([k, e]) => map.set(k, e));
        self._shot = undefined;
        self._map = map;
      }

      return self._map;
    }
  }

  snapshot(): InGroup.Snapshot<Model> {
    return this._shot || (this._shot = new InGroupSnapshot<Model>(this._map));
  }

  clear(): [keyof Model, ControlEntry][] {

    const added: [keyof Model, ControlEntry][] = [];
    const removed: [keyof Model, ControlEntry][] = [];

    itsEach(this._map.keys(), key => this.set(key, undefined, added, removed));

    return removed;
  }

}

class InGroupControlControls<Model extends object> extends InGroupControls<Model> {

  private readonly _map: InGroupMap<Model>;
  private readonly _updates = new EventEmitter<[[keyof Model, ControlEntry][], [keyof Model, ControlEntry][]]>();
  readonly on: OnEvent<[InGroup.Entry<Model>[], InGroup.Entry<Model>[]]>;
  readonly read: AfterEvent<[InGroup.Snapshot<Model>]>;

  constructor(private readonly _group: InGroupControl<Model>) {
    super();

    const self = this;

    this._map = new InGroupMap<Model>(this);
    this.on = this._updates.on.thru(
        (added, removed) => nextArgs(
            added.map(controlEntryToGroupEntry),
            removed.map(controlEntryToGroupEntry),
        ),
    );
    this.read = afterEventBy(
        this._updates.on.thru(
            () => this._map.snapshot(),
        ),
        () => [this._map.snapshot()],
    );
    this._map._supply.needs(_group.read(applyModelToControls));

    function applyModelToControls(model: Model) {
      self.read.once(snapshot => {

        const withValues = new Set<keyof Model>();

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
    }
  }

  set<K extends keyof Model>(
      keyOrControls: K | InGroup.Controls<Model>,
      newControl?: InControl<Model[K]> | undefined,
  ): this {

    const group = this._group;
    const added: [keyof Model, ControlEntry][] = [];
    const removed: [keyof Model, ControlEntry][] = [];

    if (typeof keyOrControls === 'object') {
      itsEach(overEntries(keyOrControls), ([key, value]) => {
        this._map.set(key, value, added, removed);
      });
    } else {
      this._map.set(keyOrControls, newControl, added, removed);
    }
    if (added.length || removed.length) {
      this._updates.send(added, removed);
      if (added.length) {
        applyControlsToModel();
      }
    }

    return this;

    function applyControlsToModel() {

      let newModel: Model | undefined;

      added.forEach(([key, [control, supply]]) => {
        supply.needs(control.aspect(InParents).add({ parent: group }).needs(supply));

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

      added.forEach(([key, [control, supply]]) => {
        supply.needs(control.read(value => {
          if (group.it[key] !== value) {
            group.it = {
              ...group.it,
              [key]: value,
            };
          }
        }).needs(supply));
      });
    }
  }

  clear(): this {

    const removed = this._map.clear();

    if (removed.length) {
      this._updates.send([], removed);
    }

    return this;
  }

}

function controlEntryToGroupEntry<Model extends object>(
    [key, [control]]: [keyof Model, ControlEntry],
): InGroup.Entry<Model> {
  return [key, control];
}

class InGroupControl<Model extends object> extends InGroup<Model> {

  private readonly _model: ValueTracker<Model>;
  readonly controls: InGroupControlControls<Model>;

  constructor(model: Model) {
    super();
    this._model = trackValue(model);
    this.controls = new InGroupControlControls(this);
  }

  get on() {
    return this._model.on;
  }

  get it() {
    return this._model.it;
  }

  set it(value: Model) {
    this._model.it = value;
  }

  done(reason?: any): this {
    this._model.done(reason);
    return this;
  }

  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>,
  ): InAspect.Application.Result<Instance, Model, Kind> | undefined {
    if (aspect as InAspect<any> === InData[InAspect__symbol]) {
      return {
        instance: groupData(this),
        convertTo: noop,
      } as InAspect.Application.Result<any, any, any>;
    }
    return super._applyAspect(aspect);
  }

}

function groupData<Model extends object>(group: InGroup<Model>): InData<Model> {
  return afterAll({
    cs: group.controls,
    model: group,
    mode: group.aspect(InMode),
  }).keep.dig_(
      readGroupData,
  );
}

function readGroupData<Model extends object>(
    {
      cs: [controls],
      model: [model],
      mode: [mode],
    }: {
      cs: [InGroup.Snapshot<Model>];
      model: [Model];
      mode: [InMode.Value];
    },
): InData<Model> {
  if (!InMode.hasData(mode)) {
    return afterThe();
  }

  const csData: { [key in keyof Model]: InData<any> } = {} as any;

  itsEach(controls.entries(), ([key, control]) => {
    csData[key as keyof Model] = control.aspect(InData);
  });

  return afterAll(csData).keep.thru(controlsData => {

    const data: Partial<Model> = { ...model };

    itsEach(overEntries(controlsData), ([key, [controlData]]) => {
      data[key] = controlData;
    });

    return data as InData.DataType<Model>;
  });
}

/**
 * Constructs input controls group.
 *
 * @category Control
 * @typeparam Model  Group model type, i.e. its value type.
 * @param model  Initial model of the group.
 *
 * @returns New input controls group.
 */
export function inGroup<Model extends object>(model: Model): InGroup<Model> {
  return new InGroupControl(model);
}
