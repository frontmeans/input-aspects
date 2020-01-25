/**
 * @packageDocumentation
 * @module input-aspects
 */
import { noop } from 'call-thru';
import { EventEmitter, OnEvent, trackValue, ValueTracker } from 'fun-events';
import { InAspect, InAspect__symbol } from './aspect';
import { InConverter, intoConvertedBy } from './converter';
import { InSupply } from './supply.aspect';

/**
 * User input control.
 *
 * Maintains input value and various aspects of the user input, such as input focus, validity, etc.
 *
 * @category Control
 * @typeparam Value  Input value type.
 */
export abstract class InControl<Value> extends ValueTracker<Value> {

  /**
   * @internal
   */
  private readonly _aspects = new Map<InAspect<any, any>, InAspect.Applied<any, any>>();

  /**
   * Input value.
   */
  abstract it: Value;

  /**
   * Retrieves an aspect instance applied to this control.
   *
   * If the given `aspect` is not applied yet, then applies it first.
   *
   * @typeparam Instance  Aspect instance type.
   * @typeparam Kind  Aspect application kind.
   * @param aspectKey  A key of aspect to apply to this control.
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
   * @param setup  A function that accepts this control as its only parameter to configure it.
   *
   * @returns `this` control instance.
   */
  setup(setup: (this: void, control: this) => void): this;

  /**
   * Performs additional setup of this control's aspect.
   *
   * @typeparam Instance  Aspect instance type.
   * @typeparam Kind  Aspect application kind.
   * @param aspectKey  A key of aspect to set up.
   * @param setup  A function that accepts the aspect and this control as parameters to configure them.
   *
   * @returns `this` control instance.
   */
  setup<Instance, Kind extends InAspect.Application.Kind>(
      aspectKey: InAspect.Key<Instance, Kind>,
      setup?: (this: void, aspect: InAspect.Application.Instance<Instance, Value, Kind>, control: this) => void,
  ): this;

  setup<Instance, Kind extends InAspect.Application.Kind>(
      aspectKeyOrSetup: InAspect.Key<Instance, Kind> | ((this: void, control: this) => void),
      aspectSetup: (
          this: void,
          aspect: InAspect.Application.Instance<Instance, Value, Kind>,
          control: this,
      ) => void = noop,
  ): this {
    if (isAspectKey(aspectKeyOrSetup)) {
      aspectSetup(this.aspect(aspectKeyOrSetup), this);
    } else {
      aspectKeyOrSetup(this);
    }
    return this;
  }

  /**
   * Converts this control to another one.
   *
   * The converted aspect may have another value and input aspects.
   *
   * @typeparam To  Converted input value type.
   * @param by  Input control converter.
   * @param and  Additional input control aspect converters.
   *
   * @returns Converted control.
   */
  convert<To>(
      by: InConverter<Value, To>,
      ...and: InConverter.Aspect<Value, To>[]
  ): InControl<To>;

  /**
   * Converts this control to another one without changing its value type.
   *
   * The converted aspect may have another value and input aspects.
   *
   * @typeparam To  Converted input value type.
   * @param by  Input control aspect converters.
   *
   * @returns Converted control.
   */
  convert(
      ...by: InConverter.Aspect<Value, Value>[]
  ): InControl<Value>;

  convert<To>(
      by?: InConverter<Value, To> | InConverter.Aspect<Value, To>,
      ...and: InConverter.Aspect<Value, To>[]
  ): InControl<Value> | InControl<To> {
    return new InConverted(this, intoConvertedBy(by as InConverter<Value, To>, ...and));
  }

  /**
   * Cuts off {@link InSupply input supply}.
   *
   * Removes all registered event receivers and cuts off corresponding event supplies.
   *
   * After this method call the control should no longer be used.
   *
   * @param reason  A reason to stop receiving user input.
   *
   * @returns `this` instance.
   */
  done(reason?: any): this {
    this.aspect(InSupply).off(reason);
    return this;
  }

  /**
   * Registers a callback function that will be called as soon as {@link InSupply input supply} is cut off.
   *
   * This callback will be called immediately if the supply is cut off already.
   *
   * @param callback  A callback function accepting optional cut off reason as its only parameter.
   * By convenience an `undefined` reason means normal completion.
   *
   * @returns `this` instance.
   */
  whenDone(callback: (this: void, reason?: any) => void): this {
    this.aspect(InSupply).whenOff(callback);
    return this;
  }

  /**
   * @internal
   */
  _aspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>,
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
   * @typeparam Instance  Aspect instance type.
   * @typeparam Kind  Aspect application kind.
   * @param _aspect  An aspect to apply.
   *
   * @returns Either applied aspect instance or `undefined` to apply the aspect in standard way (i.e. using
   * `InAspect.applyTo()` method).
   */
  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      _aspect: InAspect<Instance, Kind>,
  ): InAspect.Application.Result<Instance, Value, Kind> | undefined {
    return;
  }

}

/**
 * @internal
 */
function isAspectKey<Instance, Kind extends InAspect.Application.Kind>(
    value: any,
): value is InAspect.Key<Instance, Kind> {
  return InAspect__symbol in value;
}

export namespace InControl {

  /**
   * A value type of the given input control type.
   *
   * @typeparam Control  Input control type.
   */
  export type ValueType<Control extends InControl<any>> = Control extends InControl<infer Value> ? Value : never;

}

/**
 * @internal
 */
class InConverted<From, To> extends InControl<To> {

  readonly on: OnEvent<[To, To]>;
  private readonly _it: ValueTracker<[To, number]>;
  protected readonly _applyAspect: <Instance, Kind extends InAspect.Application.Kind>(
      this: this,
      aspect: InAspect<Instance, Kind>,
  ) => InAspect.Application.Result<Instance, To, Kind> | undefined;

  constructor(src: InControl<From>, by: InConverter.Factory<From, To>) {
    super();

    let lastRev = 0;
    let backward: From | undefined;

    const on = new EventEmitter<[To, To]>();

    this.on = on.on;

    const conversion = by(src, this);
    const convertAspect = <Instance, Kind extends InAspect.Application.Kind>(
        aspect: InAspect<Instance, Kind>,
    ): InAspect.Application.Result<Instance, To, Kind> | undefined => {

      const fallback: InAspect.Applied<any, any> = src._aspect(aspect);

      return fallback.convertTo<Instance>(this as any);
    };

    this._applyAspect = aspect => conversion.applyAspect?.(aspect) || convertAspect(aspect);
    this._it = trackValue([conversion.set(src.it), 0]);
    this._it.on(([newValue], [oldValue]) => {
      if (newValue !== oldValue) {
        on.send(newValue, oldValue);
      }
    }).whenOff(reason => on.done(reason));
    src.on(value => {
      if (value !== backward) {
        this._it.it = [conversion.set(value), ++lastRev];
      }
    }).whenOff(reason => this.done(reason));
    this._it.on(([value, rev]) => {
      if (rev !== lastRev) {
        lastRev = rev;
        backward = conversion.get(value);
        try {
          src.it = backward;
        } finally {
          backward = undefined;
        }
      }
    });

    this.whenDone(reason => this._it.done(reason));
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

}
