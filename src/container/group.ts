import { valueProvider, valuesProvider } from 'call-thru';
import {
  AfterEvent,
  afterEventFrom,
  EventEmitter,
  EventInterest,
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

}

/**
 * Input group controls.
 *
 * @typeparam Model Group model type, i.e. its value type.
 */
export abstract class InGroupControls<Model>
    extends InContainerControls
    implements EventSender<[InGroup.Entry<Model>[], InGroup.Entry<Model>[]]> {

  abstract readonly on: OnEvent<[InGroup.Entry<Model>[], InGroup.Entry<Model>[]]>;

  abstract entries(): IterableIterator<InGroup.Entry<Model>>;

  /**
   * Returns input control with the given key, if present.
   *
   * @param key Control key, i.e. corresponding model property key.
   *
   * @returns Target control, or `undefined` if there is no control set for this key.
   */
  abstract get<K extends keyof Model>(key: K): InGroup.Controls<Model>[K] | undefined;

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

}

type ControlEntry = readonly [InControl<any>, EventInterest]; // When event interest is done the control is unused

const controlReplacedReason = {};

class InGroupControlControls<Model> extends InGroupControls<Model> {

  readonly read: AfterEvent<[this]>;
  private readonly _on = new EventEmitter<[InGroup.Entry<Model>[], InGroup.Entry<Model>[]]>();
  private readonly _map = new Map<keyof Model, ControlEntry>();

  constructor(private readonly _group: InGroupControl<Model>) {
    super();

    const self = this;

    this.read = afterEventFrom(
        this.on.thru(
            valueProvider(this),
        ),
        valuesProvider(this));
    _group.read(applyModelToControls);

    function applyModelToControls(model: Model) {

      const withValues = new Set<keyof Model>();

      for (const k of Object.keys(model)) {

        const key = k as keyof Model;
        const value = model[key];

        withValues.add(key);

        const control = self.get(key);

        if (isControl(control)) {
          control.it = value;
        }
      }

      // Assign `undefined` to controls without values in model
      for (const [k, [control]] of self._map.entries()) {

        const key = k as keyof Model;

        if (!withValues.has(key)) {
          control.it = undefined;
        }
      }
    }
  }

  get on(): OnEvent<[InGroup.Entry<Model>[], InGroup.Entry<Model>[]]> {
    return this._on.on;
  }

  get<K extends keyof Model>(key: K): InGroup.Controls<Model>[K] | undefined {

    const entry = this._map.get(key);

    return entry && entry[0] as InGroup.Controls<Model>[K];
  }

  set<K extends keyof Model>(
      keyOrControls: K | InGroup.Controls<Model>,
      newControl?: InControl<Model[K]> | undefined): this {

    const self = this;
    const group = this._group;
    const added: InGroup.Entry<Model>[] = [];
    const removed: InGroup.Entry<Model>[] = [];

    if (typeof keyOrControls === 'object') {
      for (const k of Object.keys(keyOrControls)) {

        const key = k as keyof Model;
        const control = keyOrControls[key];

        setControl(key, control);
      }
    } else {
      setControl(keyOrControls, newControl);
    }

    if (added.length || removed.length) {
      this._on.send(added, removed);
    }

    return this;

    function setControl<KK extends keyof Model>(key: KK, control: InControl<Model[KK]> | undefined) {

      const existing = self._map.get(key);

      if (existing) {

        const [existingControl, existingInterest] = existing;

        if (existingControl === control) {
          return; // Control is added already
        }

        if (!control) {
          removeControl(key);
        }
        existingInterest.off(controlReplacedReason); // Removing control before replacing
        removed.push([key, existingControl]);
      }

      if (isControl(control)) {

        const interest = control.read(value => {
          if (group.it[key] !== value) {
            group.it = {
              ...group.it,
              [key]: value,
            };
          }
        });

        const entry: ControlEntry = [control, interest];

        added.push([key, control]);
        self._map.set(key, entry);
        control.aspect(InParents).add(group, key).needs(interest);

        interest.whenDone(reason => {
          if (reason !== controlReplacedReason) {
            removeControl(key);
            self._on.send([], [[key, control]]);
          }
        });
      }
    }

    function removeControl<KK extends keyof Model>(key: KK) {
      self._map.delete(key);
    }
  }

  * entries(): IterableIterator<InGroup.Entry<Model>> {
    for (const [key, [control]] of this._map.entries()) {
      yield [key, control];
    }
  }

  _done(reason?: any) {
    for (const [, interest] of this._map.values()) {
      interest.off(reason);
    }
  }

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
    this.controls._done(reason);
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
