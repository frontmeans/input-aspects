import { InAspect, InAspect__symbol } from './aspect';
import { isAspectKey } from './aspect.impl';
import { InBuilder$Impl, InBuilder$Impl__symbol } from './builder.impl';
import { InControl } from './control';
import { InConverter } from './converter';

/**
 * User input control builder.
 *
 * @category Control
 * @typeParam TControl - Control type.
 * @typeParam TValue - Input value type.
 */
export class InBuilder<TControl extends InControl<TValue>, TValue = InControl.ValueType<TControl>> {

  /**
   * @internal
   */
  private readonly [InBuilder$Impl__symbol]: InBuilder$Impl<TControl, TValue>;

  /**
   * Constructs control builder.
   *
   * @param factory - Control factory.
   */
  constructor(factory: InControl.Factory<TControl, TValue>) {
    this[InBuilder$Impl__symbol] = new InBuilder$Impl(factory);
  }

  /**
   * Registers an aspect to add to the built control.
   *
   * @param aspectKey - A key of aspect to add.
   * @param converter - An aspect converter to the built control from the {@link inValueOf same-valued one}.
   *
   * @returns `this` builder instance.
   */
  addAspect(aspectKey: InAspect.Key<any, any>, converter: InConverter.Aspect<TValue>): this {
    this[InBuilder$Impl__symbol].addAspect(aspectKey[InAspect__symbol], converter);
    return this;
  }

  /**
   * Registers arbitrary aspects to add to the built control.
   *
   * These aspects always applied after {@link addAspect concrete} ones.
   *
   * @param aspects - Input aspects to add. These are aspect converters to the built control from the {@link inValueOf
   * same-valued one}.
   *
   * @returns `this` builder instance.
   */
  addAspects(...aspects: InConverter.Aspect<TValue>[]): this {
    if (aspects.length) {
      this[InBuilder$Impl__symbol].addAspects(aspects);
    }
    return this;
  }

  /**
   * Registers additional setup of the built control.
   *
   * The setup is performed when the control {@link build built}.
   *
   * @param setup - A function that accepts a built control as its only parameter.
   *
   * @returns `this` builder instance.
   */
  setup(setup: (this: void, control: TControl) => void): this;

  /**
   * Registers additional setup of the built control's aspect.
   *
   * The setup is performed when the target aspect applied to the control.
   *
   * @typeParam TInstance - Aspect instance type.
   * @typeParam TKind - Aspect application kind.
   * @param aspectKey - A key of aspect to set up.
   * @param setup - A function that accepts an applied aspect instance and a built control as parameters.
   *
   * @returns `this` builder instance.
   */
  setup<TInstance, TKind extends InAspect.Application.Kind>(
      aspectKey: InAspect.Key<TInstance, TKind>,
      setup: (this: void, aspect: InAspect.Application.Instance<TInstance, TValue, TKind>, control: TControl) => void,
  ): this;

  setup<TInstance, TKind extends InAspect.Application.Kind>(
      aspectKeyOrSetup: InAspect.Key<TInstance, TKind> | ((this: void, control: TControl) => void),
      aspectSetup?: (
          this: void,
          aspect: InAspect.Application.Instance<TInstance, TValue, TKind>,
          control: TControl,
      ) => void,
  ): this {
    if (isAspectKey(aspectKeyOrSetup)) {
      this[InBuilder$Impl__symbol].setupAspect(aspectKeyOrSetup[InAspect__symbol], aspectSetup!);
    } else {
      this[InBuilder$Impl__symbol].setup(aspectKeyOrSetup);
    }
    return this;
  }

  /**
   * Builds control.
   *
   * @returns New user input control constructed by the factory passed to builder constructor, and set up with the given
   * aspects and setup procedures.
   */
  build(): TControl {
    return this[InBuilder$Impl__symbol].build();
  }

}
