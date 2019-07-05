import { nextArgs, noop } from 'call-thru';
import {
  AfterEvent,
  AfterEvent__symbol,
  dynamicMap,
  DynamicMap,
  eventInterest,
  EventInterest,
  EventKeeper,
  EventSender,
  OnEvent,
  OnEvent__symbol,
  trackValue,
  ValueTracker
} from 'fun-events';
import { InControl } from '../control';
import { InContainer, InContainerControls } from './container';
import { InParents } from './parents.aspect';

/**
 * A group of input controls.
 *
 * Nested controls are identified by keys and can be added and removed via `controls` property.
 *
 * Group value is an object formed by nested control values. The model property is the one of the control with the same
 * key, if present. When model is updated corresponding controls are also updated.
 *
 * @typeparam Model Group model type, i.e. its value type.
 */
export abstract class InGroup<Model> extends InContainer<Model> {

  /**
   * HTML element this group is constructed for, if any.
   */
  abstract readonly element?: HTMLElement;

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
   * @typeparam Model Group model type, i.e. its value type.
   */
  export type Controls<Model> = {
    readonly [K in keyof Model]?: InControl<Model[K]>;
  };

  /**
   * Input controls group entry.
   *
   * This is a tuple containing model key and corresponding control.
   *
   * @typeparam Model Group model type, i.e. its value type.
   */
  export type Entry<Model, K extends keyof Model = any> = readonly [K, InControl<Model[K]>];

  /**
   * A snapshot of input control group controls.
   */
  export interface Snapshot<Model> extends InContainer.Snapshot {

    entries(): IterableIterator<Entry<Model>>;

    /**
     * Returns input control with the given key, if present.
     *
     * @param key Control key, i.e. corresponding model property key.
     *
     * @returns Target control, or `undefined` if there is no control set for this key.
     */
    get<K extends keyof Model>(key: K): InGroup.Controls<Model>[K] | undefined;

  }

}

/**
 * Input group controls.
 *
 * @typeparam Model Group model type, i.e. its value type.
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
   * @param key A key of input control to set. I.e. corresponding model property key.
   * @param control Input control to add, or `undefined` to remove control.
   *
   * @returns `this` controls instance.
   */
  abstract set<K extends keyof Model>(key: K, control: InControl<Model[K]> | undefined): this;

  /**
   * Sets multiple input controls at a time.
   *
   * @param controls A map of controls under their keys. A value can be `undefined` to remove corresponding control.
   *
   * @returns `this` controls instance.
   */
  abstract set(controls: InGroup.Controls<Model>): this;

  /**
   * Removes input control with the given key.
   *
   * Calling this method is the same as calling `set(key, undefined)`
   *
   * @param key A key of input control to remove. I.e. corresponding model property key.
   *
   * @returns `this` controls instance.
   */
  remove(key: keyof Model): this {
    return this.set(key, undefined);
  }

}

export interface InGroupControls<Model> {

  readonly [OnEvent__symbol]: OnEvent<[InGroup.Entry<Model>[], InGroup.Entry<Model>[]]>;

  readonly [AfterEvent__symbol]: AfterEvent<[InGroup.Snapshot<Model>]>;

}

type ControlEntry = readonly [InControl<any>, EventInterest]; // When event interest is done the control is unused

const controlReplacedReason = {};

class InGroupSnapshot<Model> implements InGroup.Snapshot<Model> {

  constructor(private readonly _map: Map<keyof Model, ControlEntry>) {
  }

  get<K extends keyof Model>(key: K): InGroup.Controls<Model>[K] | undefined {

    const entry = this._map.get(key);

    return entry && entry[0] as InGroup.Controls<Model>[K];
  }

  * [Symbol.iterator](): IterableIterator<InControl<any>> {
    for (const [control] of this._map.values()) {
      yield control;
    }
  }

  * entries(): IterableIterator<InGroup.Entry<Model>> {
    for (const [key, [control]] of this._map.entries()) {
      yield [key, control];
    }
  }

}

class InGroupEditor<Model> implements DynamicMap.Editor<keyof Model, ControlEntry, InGroup.Snapshot<Model>> {

  private _map = new Map<keyof Model, ControlEntry>();
  private _shot = false;

  set(key: keyof Model, value?: ControlEntry): ControlEntry | undefined {

    const self = this;
    const replaced = this._map.get(key);

    if (value) {
      if (replaced && replaced[0] === value[0]) {
        // Do not replace control with itself
        value[1].off(controlReplacedReason);
        return value;
      }
      map().set(key, value);
    } else if (replaced) {
      map().delete(key);
    }
    if (replaced) {
      replaced[1].off(controlReplacedReason);
    }

    return replaced;

    function map(): Map<keyof Model, ControlEntry> {
      if (!self._shot) {
        return self._map;
      }

      const modified = new Map<keyof Model, ControlEntry>();

      for (const [k, e] of self._map.entries()) {
        modified.set(k, e);
      }
      self._shot = false;

      return self._map = modified;
    }
  }

  snapshot(): InGroup.Snapshot<Model> {
    this._shot = true;
    return new InGroupSnapshot<Model>(this._map);
  }

}

class InGroupControlControls<Model> extends InGroupControls<Model> {

  private _map: DynamicMap<keyof Model, ControlEntry, InGroup.Snapshot<Model>>;
  readonly _interest = eventInterest(noop);
  readonly on: OnEvent<[InGroup.Entry<Model>[], InGroup.Entry<Model>[]]>;

  constructor(group: InGroupControl<Model>) {
    super();

    const self = this;

    this._map = dynamicMap(new InGroupEditor());
    this.on = this._map.on.thru(
        (added, removed) => nextArgs(
            added.map(controlEntryToGroupEntry),
            removed.map(controlEntryToGroupEntry)),
    );
    this._map.on(applyControlsToModel);
    group.read(applyModelToControls);

    function applyControlsToModel(added: [keyof Model, ControlEntry][]) {

      let newModel: Model | undefined;

      added.forEach(([key, [control, interest]]) => {
        interest.needs(control.aspect(InParents).add(group, key).needs(interest));

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

      added.forEach(([key, [control, interest]]) => {

        const controlInterest = control.read(value => {
          if (group.it[key] !== value) {
            group.it = {
              ...group.it,
              [key]: value,
            };
          }
        }).needs(interest);

        interest.needs(controlInterest);
      });
    }

    function applyModelToControls(model: Model) {
      self._map.read.once(snapshot => {

        const withValues = new Set<keyof Model>();

        for (const k of Object.keys(model)) {

          const key = k as keyof Model;
          const value = model[key];

          withValues.add(key);

          const control = snapshot.get(key);

          if (isControl(control)) {
            control.it = value;
          }
        }

        // Assign `undefined` to controls without values in model
        for (const [k, control] of snapshot.entries()) {

          const key = k as keyof Model;

          if (!withValues.has(key)) {
            control.it = undefined!;
          }
        }
      });
    }
  }

  get read(): AfterEvent<[InGroup.Snapshot<Model>]> {
    return this._map.read;
  }

  set<K extends keyof Model>(
      keyOrControls: K | InGroup.Controls<Model>,
      newControl?: InControl<Model[K]> | undefined): this {

    const self = this;

    if (typeof keyOrControls === 'object') {
      this._map.from(allControls(keyOrControls));
    } else {
      this._map.set(keyOrControls, controlEntry(keyOrControls, newControl));
    }

    return this;

    function *allControls(
        controls: InGroup.Controls<Model>,
    ): IterableIterator<[keyof Model, ControlEntry | undefined]> {
      for (const k of Object.keys(controls)) {

        const key = k as keyof Model;

        yield [key, controlEntry(key, controls[key])];
      }
    }

    function controlEntry(
        key: keyof Model,
        control: InControl<any> | undefined): ControlEntry | undefined {
      return control && [control, eventInterest(reason => {
        if (reason !== controlReplacedReason) {
          self._map.delete(key);
        }
      }).needs(self._interest)];
    }
  }

}

function controlEntryToGroupEntry<Model>([key, [control]]: [keyof Model, ControlEntry]): InGroup.Entry<Model> {
    return [key, control];
}

class InGroupControl<Model> extends InGroup<Model> {

  private readonly _model: ValueTracker<Model>;
  readonly controls: InGroupControlControls<Model>;

  constructor(model: Model, readonly element?: HTMLElement) {
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
    this.controls._interest.off(reason);
    return this;
  }

}

function isControl<V>(control: InControl<V> | undefined): control is InControl<V> {
  return !!control;
}

/**
 * Constructs input controls group.
 *
 * @param model Initial model of the group.
 * @param element Optional HTML element the group is constructed for.
 *
 * @returns New input controls group.
 */
export function inGroup<Model>(model: Model, element?: HTMLElement): InGroup<Model> {
  return new InGroupControl(model, element);
}
