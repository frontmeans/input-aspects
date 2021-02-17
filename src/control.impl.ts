import { noop } from '@proc7ts/primitives';
import { InAspect } from './aspect';
import { InControl } from './control';
import { InConverter } from './converter';

/**
 * @internal
 */
export const InControl$Aspects__symbol = (/*#__PURE__*/ Symbol('InControl.aspects'));

/**
 * @internal
 */
export type InControl$Impl<TControl extends InControl<TValue>, TValue> = TControl & {

  _applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
      _aspect: InAspect<TInstance, TKind>,
  ): InAspect.Application.Result<TInstance, TValue, TKind> | undefined;

};

/**
 * @internal
 */
export class InControl$Aspects<TControl extends InControl<TValue>, TValue> {

  private readonly _byKey = new Map<InAspect<any, any>, InControl$Aspect<TControl, TValue, any, any>>();

  constructor(
      readonly control: InControl$Impl<TControl, TValue>,
      public aspects: InConverter.Aspect.Conversion<TValue>,
  ) {}

  add(aspects: InConverter.Aspect.Conversion<TValue>): void {

    const prev = this.aspects;

    this.aspects = {
      applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
          aspect: InAspect<TInstance, TKind>,
      ): InAspect.Application.Result<TInstance, TValue, TKind> | undefined {
        return prev.applyAspect(aspect) || aspects.applyAspect(aspect);
      },
    };
  }

  aspect<TInstance, TKind extends InAspect.Application.Kind>(
      aspect: InAspect<TInstance, TKind>,
  ): InAspect.Application.Result<TInstance, TValue, TKind> {

    const existing = this._byKey.get(aspect);
    let setupAspect!: (
        this: void,
        aspect: InAspect.Application.Instance<TInstance, TValue, TKind>,
        control: TControl,
    ) => void;

    if (existing) {
      // Aspect applied already.
      // Return it.

      const { setup, applied } = existing;

      if (applied) {
        return applied;
      }

      existing.setup = noop; // Prevent recurrent setup.
      setupAspect = setup;
    }

    const applied = this.control._applyAspect(aspect)
        || aspect.applyTo(this.control) as InAspect.Application.Result<TInstance, TValue, TKind>;

    if (existing) {
      // Aspect has a setup.
      // Apply aspect then issue its setup.
      existing.applied = applied;
      setupAspect(applied.instance, this.control);
    } else {
      this._byKey.set(aspect, { setup: noop, applied });
    }

    return applied;
  }

  setup<TInstance, TKind extends InAspect.Application.Kind>(
      aspect: InAspect<TInstance, TKind>,
      setup: (
          this: void,
          aspect: InAspect.Application.Instance<TInstance, TValue, TKind>,
          control: TControl,
      ) => void,
  ): void {

    const existing = this._byKey.get(aspect);

    if (existing) {

      const { applied } = existing;

      if (applied) {
        // Aspect already applied.
        // Issue its setup immediately.
        setup(applied.instance, this.control);
      } else {
        // Aspect already has a setup procedure.
        // Add another one.

        const prevSetup = existing.setup;

        existing.setup = (instance, control) => {
          prevSetup(instance, control);
          setup(instance, control);
        };
      }
    } else {
      this._byKey.set(aspect, { setup });
    }
  }

}

interface InControl$Aspect<
    TControl extends InControl<TValue>,
    TValue,
    TInstance,
    TKind extends InAspect.Application.Kind> {

  setup(
      this: void,
      aspect: InAspect.Application.Instance<TInstance, TValue, TKind>,
      control: TControl,
  ): void;

  applied?: InAspect.Applied<any, any>;

}
