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

export abstract class InGroup<Model> extends InContainer<Model> {

  abstract readonly controls: InGroupControls<Model>;

}

export namespace InGroup {

  /**
   * Input group controls.
   *
   * This is a read-only object containing an input control per each model property under the same key.
   *
   * @typeparam Model Input group model type.
   */
  export type Controls<Model> = {
    readonly [K in keyof Model]?: InControl<Model[K]>;
  };

  /**
   * Input controls group entry.
   *
   * This is a tuple containing model key and corresponding control.
   *
   * Container implementations may apply limitations on the type of keys and input values they support.
   *
   * @typeparam Model Input group model type.
   */
  export type Entry<Model, K extends keyof Model = any> = readonly [K, InControl<Model[K]>];

}

/**
 * Input group controls.
 */
export abstract class InGroupControls<Model>
    extends InContainerControls
    implements EventSender<[InGroup.Entry<Model>[], InGroup.Entry<Model>[]]> {

  abstract readonly on: OnEvent<[InGroup.Entry<Model>[], InGroup.Entry<Model>[]]>;

  abstract entries(): IterableIterator<InGroup.Entry<Model>>;

  abstract get<K extends keyof Model>(key: K): InGroup.Controls<Model>[K] | undefined;

  abstract set<K extends keyof Model>(key: K, control: InControl<Model[K]> | undefined): this;

  remove(key: keyof Model): this {
    return this.set(key, undefined);
  }

}

export interface InGroupControls<Model> {

  readonly [OnEvent__symbol]: OnEvent<[InGroup.Entry<Model>[], InGroup.Entry<Model>[]]>;

}

type MutableControls<Model> = {
  -readonly [K in keyof Model]?: InControl<Model[K]>;
};

type ControlEntry = readonly [InControl<any>, EventInterest]; // When event interest is done the control is unused

const doNotUpdateModel = {};

class InGroupControlControls<Model> extends InGroupControls<Model> {

  readonly read: AfterEvent<[this]>;
  readonly model: ValueTracker<Model>;
  private readonly _on = new EventEmitter<[InGroup.Entry<Model>[], InGroup.Entry<Model>[]]>();
  private readonly _map = new Map<keyof Model, ControlEntry>();

  constructor(_raw: MutableControls<Model>) {
    super();

    const self = this;

    this.read = afterEventFrom(
        this.on.thru(
            valueProvider(this),
        ),
        valuesProvider(this));
    this.model = trackValue(groupModel(_raw));

    for (const k of Object.keys(_raw)) {

      const key = k as keyof Model;
      const control = _raw[key];

      this.set(key, control);
    }

    this.model.read(applyModelToControls);

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

  set<K extends keyof Model>(key: K, control: InControl<Model[K]> | undefined): this {

    const existing = this._map.get(key);
    let removed: InGroup.Entry<Model>[];

    if (existing) {

      const [existingControl, existingInterest] = existing;

      if (existingControl === control) {
        return this; // Control is added already
      }

      existingInterest.off(control && doNotUpdateModel); // Removing control before replacing
      removed = [[key, existingControl]];
    } else {
      removed = [];
    }

    if (isControl(control)) {

      const interest = control.read(value => {
        if (this.model.it[key] !== value) {
          this.model.it = {
            ...this.model.it,
            [key]: value,
          };
        }
      });

      const entry: ControlEntry = [control, interest];

      this._map.set(key, entry);
      this._on.send([[key, control]], removed);

      interest.whenDone(reason => {
        if (reason !== doNotUpdateModel) {

          this._map.delete(key);

          const model = this.model.it;

          if (model[key] !== undefined) {

            const newModel = { ...model };

            delete newModel[key];

            this.model.it = newModel;
          }

          this._on.send([], [[key, control]]);
        }
      });
    }

    return this;
  }

  * entries(): IterableIterator<InGroup.Entry<Model>> {
    for (const [key, [control]] of this._map.entries()) {
      yield [key, control];
    }
  }

  _done(reason?: any) {
    this.model.done(reason);
    for (const [, interest] of this._map.values()) {
      interest.off(reason);
    }
  }

}

class InGroupControl<Model> extends InGroup<Model> {

  readonly controls: InGroupControlControls<Model>;

  constructor(controls: MutableControls<Model>, readonly element?: HTMLElement) {
    super();
    this.controls = new InGroupControlControls(controls);
  }

  get on() {
    return this.controls.model.on;
  }

  get it() {
    return this.controls.model.it;
  }

  set it(value: Model) {
    this.controls.model.it = value;
  }

  done(reason?: any): this {
    this.controls._done(reason);
    return this;
  }

}

function isControl<V>(control: InControl<V> | undefined): control is InControl<V> {
  return !!control;
}

function groupModel<Model>(controls: InGroup.Controls<Model>): Model {

  const result: { -readonly [K in keyof Model]?: Model[K] } = {};

  for (const k of Object.keys(controls)) {

    const key = k as keyof Model;

    assignToModel(key, controls[key]);
  }

  return result as Model;

  function assignToModel<K extends keyof Model>(key: K, control?: InControl<Model[K]>) {
    if (isControl(control)) {
      result[key] = control.it;
    }
  }
}

export function inGroup<Model>(controls: InGroup.Controls<Model>, element?: HTMLElement): InGroup<Model> {
  return new InGroupControl(controls, element);
}
