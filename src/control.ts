/**
 * @packageDocumentation
 * @module @proc7ts/input-aspects
 */
import {
  EventEmitter,
  EventReceiver,
  eventSupply,
  EventSupply,
  EventSupply__symbol,
  eventSupplyOf,
  OnEvent,
  trackValue,
  ValueTracker,
} from '@proc7ts/fun-events';
import { asis, noop } from '@proc7ts/primitives';
import { InAspect, InAspect__symbol } from './aspect';
import { InConverter, intoConvertedBy, isInAspectConversion } from './converter';

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
   * This control's input supply.
   *
   * Releases all control resources when cut off.
   *
   * Each control has its own supply. An input supply of converted control depends on the input supply of control it
   * is converted from.
   *
   * After this supply cut off the control should no longer be used.
   */
  abstract get [EventSupply__symbol](): EventSupply;

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

  convert<To>(
      by?: InConverter<Value, To>,
      ...and: InConverter.Aspect<Value, To>[]
  ): InControl<Value> | InControl<To> {
    return new InConverted(this, intoConvertedBy(by, ...and));
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

  private readonly _supply: EventSupply;
  private readonly _on = new EventEmitter<[To, To]>();
  private readonly _it: ValueTracker<[To, number]>;
  protected readonly _applyAspect: <Instance, Kind extends InAspect.Application.Kind>(
      this: this,
      aspect: InAspect<Instance, Kind>,
  ) => InAspect.Application.Result<Instance, To, Kind> | undefined;

  constructor(src: InControl<From>, by: InConverter.Factory<From, To>) {
    super();
    this._supply = eventSupply().needs(src);

    let lastRev = 0;
    let backward: From | undefined;

    const conversion = by(src, this);
    let set: (value: From) => To;
    let get: (value: To) => From;
    let convertAspect: <Instance, Kind extends InAspect.Application.Kind>(
        aspect: InAspect<Instance, Kind>,
    ) => InAspect.Application.Result<Instance, To, Kind> | undefined;

    if (/*#__INLINE__*/ isInAspectConversion(conversion)) {
      set = asis as (value: From) => To;
      get = asis as (value: To) => From;
      convertAspect = <Instance, Kind extends InAspect.Application.Kind>(aspect: InAspect<Instance, Kind>) => {

        const fallback: InAspect.Applied<any, any> = src._aspect(aspect);

        return fallback.attachTo ? fallback.attachTo(this) : fallback.convertTo(this);
      };
    } else {
      set = conversion.set;
      get = conversion.get;
      convertAspect = <Instance, Kind extends InAspect.Application.Kind>(aspect: InAspect<Instance, Kind>) => {

        const fallback: InAspect.Applied<any, any> = src._aspect(aspect);

        return fallback.convertTo(this);
      };
    }

    this._applyAspect = aspect => conversion.applyAspect?.(aspect) || convertAspect(aspect);
    this._it = trackValue([set(src.it), 0]);
    eventSupplyOf(this._it).needs(this._supply);
    this._it.on(([newValue], [oldValue]) => {
      if (newValue !== oldValue) {
        this._on.send(newValue, oldValue);
      }
    }).cuts(this._on);
    src.on(value => {
      if (value !== backward) {
        this._it.it = [set(value), ++lastRev];
      }
    }).cuts(this);
    this._it.on(([value, rev]) => {
      if (rev !== lastRev) {
        lastRev = rev;
        backward = get(value);
        try {
          src.it = backward;
        } finally {
          backward = undefined;
        }
      }
    });
  }

  get [EventSupply__symbol](): EventSupply {
    return this._supply;
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

  on(): OnEvent<[To, To]>;
  on(receiver: EventReceiver<[To, To]>): EventSupply;
  on(receiver?: EventReceiver<[To, To]>): OnEvent<[To, To]> | EventSupply {
    return (this.on = this._on.on().F)(receiver);
  }

}
