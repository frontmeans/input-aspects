import { noop, valueProvider } from '@proc7ts/primitives';
import { InAspect } from './aspect';
import { InControl } from './control';

/**
 * @internal
 */
export const inAspectNull: InAspect.Applied<any, any, any> = {
  instance: null,
  convertTo: noop,
};

/**
 * @internal
 */
export function inAspectSameOrBuild<TValue, TInstance, TKind extends InAspect.Application.Kind>(
    control: InControl<TValue>,
    aspectKey: InAspect.Key<TInstance, TKind>,
    build: <V>(this: void, control: InControl<V>, origin?: InControl<any>) => TInstance,
    instance?: TInstance,
    origin?: InControl<any>,
): InAspect.Applied<TValue, TInstance> {
  if (instance === undefined) {
    instance = build(control, origin);
  }
  return {
    instance,
    convertTo<TTo>(target: InControl<TTo>): InAspect.Applied<TTo, TInstance> {
      return inAspectSameOrBuild<TTo, TInstance, TKind>(
          target,
          aspectKey,
          build,
          undefined,
          control,
      );
    },
    attachTo(target: InControl<TValue>): InAspect.Applied<TValue, TInstance> | undefined {
      return inAspectSameOrBuild(
          target,
          aspectKey,
          build,
          (control.aspect(aspectKey) as TInstance | undefined) || build(target),
      );
    },
  };
}

/**
 * @internal
 */
export function inAspectSameOrNull<TValue, TInstance, TKind extends InAspect.Application.Kind>(
    control: InControl<TValue>,
    aspectKey: InAspect.Key<TInstance | null, TKind>,
    instance: TInstance | null = null,
): InAspect.Applied<TValue, TInstance | null> {
  return inAspectSameOrBuild(control, aspectKey, valueProvider(null), instance);
}

/**
 * @internal
 */
export function inAspectValue<TInstance>(instance: TInstance): InAspect.Applied<any, TInstance> {
  return {
    instance,
    convertTo() {
      return this;
    },
  };
}
