import { valueProvider } from 'call-thru';
import { EventEmitter, OnEvent, trackValue, ValueTracker } from 'fun-events';
import { InAspect, InAspect__symbol } from './aspect';

/**
 * User input control.
 *
 * Maintains input value and various aspects of the user input, such as input focus, validity, etc.
 *
 * @typeparam Value Input value type.
 */
export abstract class InControl<Value = string> extends ValueTracker<Value> {

  /**
   * @internal
   */
  private readonly _aspects = new Map<InAspect<any, any>, InAspect.Applied<any, Value>>();

  /**
   * Input value.
   */
  abstract it: Value;

  /**
   * Retrieves an aspect instance applied to this control.
   *
   * If the given `aspect` is not applied yet, then applies it first.
   *
   * @typeparam Instance Aspect instance type.
   * @typeparam Kind Aspect application kind.
   * @param aspectKey A key of aspect to apply to this control.
   *
   * @returns An applied aspect instance.
   */
  aspect<Instance, Kind extends InAspect.Application.Kind>(
      aspectKey: InAspect.Key<Instance, Kind>,
  ): InAspect.Application.Instance<Instance, Value, Kind> {
    return this._aspect(aspectKey[InAspect__symbol]).instance;
  }

  /**
   * Performs additional setup of this control.
   *
   * @param setup A function that accepts this control as its only parameter to configure it.
   *
   * @returns `this` control instance.
   */
  setup(setup: (this: void, control: this) => void): this;

  /**
   * Performs additional setup of this control's aspect.
   *
   * @typeparam Instance Aspect instance type.
   * @typeparam Kind Aspect application kind.
   * @param aspectKey A key of aspect to set up.
   * @param setup A function that accepts the aspect and this control as parameters to configure them.
   *
   * @returns `this` control instance.
   */
  setup<Instance, Kind extends InAspect.Application.Kind>(
      aspectKey: InAspect.Key<Instance, Kind>,
      setup: (this: void, aspect: InAspect.Application.Instance<Instance, Value, Kind>, control: this) => void,
  ): this;

  setup<Instance, Kind extends InAspect.Application.Kind>(
      aspectKeyOrSetup: InAspect.Key<Instance, Kind> | ((this: void, control: this) => void),
      aspectSetup?: (this: void, aspect: InAspect.Application.Instance<Instance, Value, Kind>, control: this) => void,
  ): this {
    if (!aspectSetup) {

      const controlSetup = aspectKeyOrSetup as (control: this) => void;

      controlSetup(this);
    } else {

      const aspectKey = aspectKeyOrSetup as InAspect.Key<Instance, Kind>;

      aspectSetup(this.aspect(aspectKey), this);
    }

    return this;
  }

  /**
   * Converts this control to another one with value of different type.
   *
   * The converted control's value bound to this one and wise versa.
   *
   * @typeparam To Converted input value type.
   * @param set Value conversion function accepting this control's value an returning converted one.
   * @param get Reverse value conversion function accepting converted value and returning this control's one.
   *
   * @returns Converted control.
   */
  convert<To>(
      set: (this: void, value: Value) => To,
      get: (this: void, value: To) => Value,
  ): InControl<To>;

  /**
   * Converts this control to another one with value of different type potentially depending on various input aspects.
   *
   * @typeparam To Converted input value type.
   * @param by Input control converter.
   *
   * @returns Converted control.
   */
  convert<To>(by: InControl.Converter<Value, To>): InControl<To>;

  convert<To>(
      setOrBy: ((this: void, value: Value) => To) | InControl.Converter<Value, To>,
      get?: (this: void, value: To) => Value,
  ): InControl<To> {

    let by: InControl.Converter<Value, To>;

    if (!get) {
      by = setOrBy as InControl.Converter<Value, To>;
    } else {
      by = valueProvider([(setOrBy as (this: void, value: Value) => To), get]);
    }

    return new InConverted(this, by);
  }

  /**
   * @internal
   */
  _aspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>
  ): InAspect.Application.Result<Instance, Value, Kind> {

    const existing = this._aspects.get(aspect);

    if (existing) {
      return existing as InAspect.Application.Result<Instance, Value, Kind>;
    }

    const applied = this._applyAspect(aspect) || aspect.applyTo(this);

    this._aspects.set(aspect, applied);

    return applied as InAspect.Application.Result<Instance, Value, Kind>;
  }

  /**
   * Applies the given aspect to this control in a custom way.
   *
   * @typeparam Instance Aspect instance type.
   * @typeparam Kind Aspect application kind.
   * @param aspect An aspect tp apply.
   *
   * @returns Either applied aspect instance or `undefined` to apply the aspect in standard way (i.e. using
   * `InAspect.applyTo()` method).
   */
  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>
  ): InAspect.Application.Result<Instance, Value, Kind> | undefined {
    return;
  }

}

export namespace InControl {

  /**
   * Input control converter.
   *
   * It is a function called by `InControl.convert()` method to construct value converters.
   *
   * This function should not access converted control value as the one does not exist at calling time.
   *
   * @typeparam From Original input value type.
   * @typeparam To Converted input value type.
   * @param from Original input control.
   * @param to Converted input control.
   *
   * @returns A tuple containing value conversion function and reverse value conversion function.
   */
  export type Converter<From, To> = (this: void, from: InControl<From>, to: InControl<To>) => Converters<From, To>;

  /**
   * A tuple containing value conversion function and reverse value conversion function.
   *
   * @typeparam From Original input value type.
   * @typeparam To Converted input value type.
   */
  export type Converters<From, To> = [(this: void, value: From) => To, (this: void, value: To) => From];

  /**
   * A value type of the given input control type.
   *
   * @typeparam Control Input control type.
   */
  export type ValueType<Control extends InControl<any>> = Control extends InControl<infer Value> ? Value : never;

}

class InConverted<From, To> extends InControl<To> {

  readonly on: OnEvent<[To, To]>;
  private readonly _it: ValueTracker<[To, number]>;

  constructor(
      private readonly _src: InControl<From>,
      by: InControl.Converter<From, To>,
  ) {
    super();

    let lastRev = 0;
    let backward: From | undefined;

    const on = new EventEmitter<[To, To]>();

    this.on = on.on;

    const [set, get] = by(_src, this);

    this._it = trackValue([set(_src.it), 0]);
    this._it.on(([newValue], [oldValue]) => {
      if (newValue !== oldValue) {
        on.send(newValue, oldValue);
      }
    }).whenDone(reason => on.done(reason));
    _src.on(value => {
      if (value !== backward) {
        this._it.it = [set(value), ++lastRev];
      }
    }).whenDone(reason => this.done(reason));
    this._it.on(([value, rev]) => {
      if (rev !== lastRev) {
        lastRev = rev;
        backward = get(value);
        try {
          _src.it = backward;
        } finally {
          backward = undefined;
        }
      }
    });
  }

  get it(): To {
    return this._it.it[0];
  }

  set it(value: To) {

    const [prevValue, prevRev] = this._it.it;

    if (value !== prevValue) {
      this._it.it = [value, prevRev + 1];
    }
  }

  done(reason?: any): this {
    this._it.done(reason);
    return this;
  }

  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>
  ): InAspect.Application.Result<Instance, To, Kind> | undefined {

    const applied: InAspect.Applied<any, any> = this._src._aspect(aspect);

    return applied.convertTo<Instance>(this as any) as
        InAspect.Application.Result<Instance, To, Kind> | undefined;
  }

}
