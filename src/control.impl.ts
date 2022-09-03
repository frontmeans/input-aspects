import { InAspect } from './aspect';
import { InControl } from './control';
import { InConverter } from './converter';

/**
 * @internal
 */
export const InControl$Aspects__symbol = /*#__PURE__*/ Symbol('InControl.aspects');

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

  private readonly _byKey = new Map<InAspect<any, any>, InAspect.Applied<any, any>>();

  constructor(
    readonly control: InControl$Impl<TControl, TValue>,
    readonly aspects: InConverter.Aspect.Conversion<TValue>,
  ) {}

  aspect<TInstance, TKind extends InAspect.Application.Kind>(
    aspect: InAspect<TInstance, TKind>,
  ): InAspect.Application.Result<TInstance, TValue, TKind> {
    const applied = this._byKey.get(aspect);

    if (applied) {
      // Aspect applied already.
      // Return it.
      return applied;
    }

    const application =
      this.control._applyAspect(aspect)
      || (aspect.applyTo(this.control) as InAspect.Application.Result<TInstance, TValue, TKind>);

    this._byKey.set(aspect, application);

    return application;
  }

}
