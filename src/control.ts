/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import { EventEmitter, OnEvent, trackValue, ValueTracker } from '@proc7ts/fun-events';
import { asis, noop, Supply } from '@proc7ts/primitives';
import { InAspect, InAspect__symbol } from './aspect';
import { InConverter, intoConvertedBy, isInAspectConversion } from './converter';

/**
 * User input control.
 *
 * Maintains input value and various aspects of the user input, such as input focus, validity, etc.
 *
 * @category Control
 * @typeParam TValue - Input value type.
 */
export abstract class InControl<TValue> extends ValueTracker<TValue> {

  /**
   * @internal
   */
  private readonly _aspects = new Map<InAspect<any, any>, InAspect.Applied<any, any>>();

  /**
   * Input value.
   */
  abstract it: TValue;

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
  abstract get supply(): Supply;

  /**
   * Retrieves an aspect instance applied to this control.
   *
   * If the given `aspect` is not applied yet, then applies it first.
   *
   * @typeParam TInstance - Aspect instance type.
   * @typeParam TKind - Aspect application kind.
   * @param aspectKey - A key of aspect to apply to this control.
   *
   * @returns An applied aspect instance.
   */
  aspect<TInstance, TKind extends InAspect.Application.Kind>(
      aspectKey: InAspect.Key<TInstance, TKind>,
  ): InAspect.Application.Instance<TInstance, TValue, TKind> {
    return this._aspect(aspectKey[InAspect__symbol]).instance;
  }

  /**
   * Performs additional setup of this control.
   *
   * @param setup - A function that accepts this control as its only parameter to configure it.
   *
   * @returns `this` control instance.
   */
  setup(setup: (this: void, control: this) => void): this;

  /**
   * Performs additional setup of this control's aspect.
   *
   * @typeParam TInstance - Aspect instance type.
   * @typeParam TKind - Aspect application kind.
   * @param aspectKey - A key of aspect to set up.
   * @param setup - A function that accepts the aspect and this control as parameters to configure them.
   *
   * @returns `this` control instance.
   */
  setup<TInstance, TKind extends InAspect.Application.Kind>(
      aspectKey: InAspect.Key<TInstance, TKind>,
      setup?: (this: void, aspect: InAspect.Application.Instance<TInstance, TValue, TKind>, control: this) => void,
  ): this;

  setup<TInstance, TKind extends InAspect.Application.Kind>(
      aspectKeyOrSetup: InAspect.Key<TInstance, TKind> | ((this: void, control: this) => void),
      aspectSetup: (
          this: void,
          aspect: InAspect.Application.Instance<TInstance, TValue, TKind>,
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
   * @typeParam TTo - Converted input value type.
   * @param by - Input control aspect converters.
   *
   * @returns Converted control.
   */
  convert(
      ...by: InConverter.Aspect<TValue, TValue>[]
  ): InControl<TValue>;

  /**
   * Converts this control to another one.
   *
   * The converted aspect may have another value and input aspects.
   *
   * @typeParam TTo - Converted input value type.
   * @param by - Input control converter.
   * @param and - Additional input control aspect converters.
   *
   * @returns Converted control.
   */
  convert<TTo>(
      by: InConverter<TValue, TTo>,
      ...and: InConverter.Aspect<TValue, TTo>[]
  ): InControl<TTo>;

  convert<TTo>(
      by?: InConverter<TValue, TTo>,
      ...and: InConverter.Aspect<TValue, TTo>[]
  ): InControl<TValue> | InControl<TTo> {
    return new InConverted(this, intoConvertedBy(by, ...and));
  }

  /**
   * @internal
   */
  _aspect<TInstance, TKind extends InAspect.Application.Kind>(
      aspect: InAspect<TInstance, TKind>,
  ): InAspect.Application.Result<TInstance, TValue, TKind> {

    const existing = this._aspects.get(aspect);

    if (existing) {
      return existing as InAspect.Application.Result<TInstance, TValue, TKind>;
    }

    const applied = this._applyAspect(aspect) || aspect.applyTo(this);

    this._aspects.set(aspect, applied);

    return applied as InAspect.Application.Result<TInstance, TValue, TKind>;
  }

  /**
   * Applies the given aspect to this control in a custom way.
   *
   * @typeParam TInstance - Aspect instance type.
   * @typeParam TKind - Aspect application kind.
   * @param _aspect - An aspect to apply.
   *
   * @returns Either applied aspect instance or `undefined` to apply the aspect in standard way (i.e. using
   * `InAspect.applyTo()` method).
   */
  protected _applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
      _aspect: InAspect<TInstance, TKind>,
  ): InAspect.Application.Result<TInstance, TValue, TKind> | undefined {
    return;
  }

}

/**
 * @internal
 */
function isAspectKey<TInstance, TKind extends InAspect.Application.Kind>(
    value: any,
): value is InAspect.Key<TInstance, TKind> {
  return InAspect__symbol in value;
}

/**
 * @category Control
 */
export namespace InControl {

  /**
   * A value type of the given input control type.
   *
   * @typeParam TControl - Input control type.
   */
  export type ValueType<TControl extends InControl<any>> = TControl extends InControl<infer TValue> ? TValue : never;

}

/**
 * @internal
 */
class InConverted<TFrom, TTo> extends InControl<TTo> {

  readonly supply: Supply;
  private readonly _on = new EventEmitter<[TTo, TTo]>();
  private readonly _it: ValueTracker<[TTo, number]>;
  protected readonly _applyAspect: <TInstance, TKind extends InAspect.Application.Kind>(
      this: this,
      aspect: InAspect<TInstance, TKind>,
  ) => InAspect.Application.Result<TInstance, TTo, TKind> | undefined;

  constructor(src: InControl<TFrom>, by: InConverter.Factory<TFrom, TTo>) {
    super();
    this.supply = new Supply().needs(src);

    let lastRev = 0;
    let backward: TFrom | undefined;

    const conversion = by(src, this);
    let set: (value: TFrom) => TTo;
    let get: (value: TTo) => TFrom;
    let convertAspect: <TInstance, TKind extends InAspect.Application.Kind>(
        aspect: InAspect<TInstance, TKind>,
    ) => InAspect.Application.Result<TInstance, TTo, TKind> | undefined;

    if (/*#__INLINE__*/ isInAspectConversion(conversion)) {
      set = asis as (value: TFrom) => TTo;
      get = asis as (value: TTo) => TFrom;
      convertAspect = <TInstance, TKind extends InAspect.Application.Kind>(aspect: InAspect<TInstance, TKind>) => {

        const fallback: InAspect.Applied<any, any> = src._aspect(aspect);

        return fallback.attachTo ? fallback.attachTo(this) : fallback.convertTo(this);
      };
    } else {
      set = conversion.set;
      get = conversion.get;
      convertAspect = <TInstance, TKind extends InAspect.Application.Kind>(aspect: InAspect<TInstance, TKind>) => {

        const fallback: InAspect.Applied<any, any> = src._aspect(aspect);

        return fallback.convertTo(this);
      };
    }

    this._applyAspect = aspect => conversion.applyAspect?.(aspect) || convertAspect(aspect);
    this._it = trackValue([set(src.it), 0]);
    this._it.supply.needs(this.supply);
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

  get it(): TTo {
    return this._it.it[0];
  }

  set it(value: TTo) {

    const [prevValue, prevRev] = this._it.it;

    if (value !== prevValue) {
      this._it.it = [value, prevRev + 1];
    }
  }

  get on(): OnEvent<[TTo, TTo]> {
    return this._on.on;
  }

}
