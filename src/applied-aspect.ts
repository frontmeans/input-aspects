import { noop, valueProvider } from '@proc7ts/primitives';
import { InAspect } from './aspect';
import { InControl } from './control';

const nullInAspect$: InAspect.Applied<any, any> = {
  instance: null,
  convertTo: noop,
};

/**
 * Creates an aspect applied to control with `null` instance value.
 *
 * @category Aspect
 * @typeParam TValue - Input value type.
 * @typeParam TInstance - Aspect instance type.
 *
 * @returns Applied input aspect.
 */
export function nullInAspect<TValue, TInstance>(): InAspect.Applied<TValue, TInstance | null> {
  return nullInAspect$;
}

/**
 * Creates an aspect applied to control with known instance.
 *
 * An instance remains as is when converted to another control.
 *
 * @category Aspect
 * @typeParam TValue - Input value type.
 * @typeParam TInstance - Aspect instance type.
 * @typeParam instance - Known aspect instance type.
 *
 * @returns Applied input aspect.
 */
export function knownInAspect<TValue, TInstance>(
  instance: TInstance,
): InAspect.Applied<TValue, TInstance> {
  return {
    instance,
    convertTo(_target) {
      return this as InAspect.Applied<any, TInstance>;
    },
  };
}

/**
 * Creates an aspect applied to control with known inconvertible instance.
 *
 * When converted to another control with the same value, an aspect instance remains as is.
 *
 * When converted to another control with another value, an aspect instance replaced by `null`.
 *
 * @category Aspect
 * @typeParam TValue - Input value type.
 * @typeParam TInstance - Aspect instance type.
 * @typeParam TKind - Aspect application kind.
 * @param control - Target control to apply an aspect to.
 * @param aspectKey - Applied aspect key.
 * @param instance - Known aspect instance type. Defaults to `null`.
 *
 * @returns Applied input aspect.
 */
export function inconvertibleInAspect<TValue, TInstance, TKind extends InAspect.Application.Kind>(
  control: InControl<TValue>,
  aspectKey: InAspect.Key<TInstance | null, TKind>,
  instance: TInstance | null = null,
): InAspect.Applied<TValue, TInstance | null> {
  return builtInAspect$(control, aspectKey, valueProvider(null), instance);
}

/**
 * Creates an aspect applied to control with built instance.
 *
 * When converted to another control with the same value, an aspect instance remains as is.
 *
 * When converted to another control with another value, an aspect instance is built again with original control
 * passed to the builder as a second parameter.
 *
 * @category Aspect
 * @typeParam TValue - Input value type.
 * @typeParam TInstance - Aspect instance type.
 * @typeParam TKind - Aspect application kind.
 * @param control - Target control to apply an aspect to.
 * @param aspectKey - Applied aspect key.
 * @param build - Aspect instance builder function. Accepts target control and optionally an original one as parameters.
 *
 * @returns Applied input aspect.
 */
export function builtInAspect<TValue, TInstance, TKind extends InAspect.Application.Kind>(
  control: InControl<TValue>,
  aspectKey: InAspect.Key<TInstance, TKind>,
  build: <TValue>(this: void, control: InControl<TValue>, origin?: InControl<any>) => TInstance,
): InAspect.Applied<TValue, TInstance> {
  return builtInAspect$(control, aspectKey, build);
}

function builtInAspect$<TValue, TInstance, TKind extends InAspect.Application.Kind>(
  control: InControl<TValue>,
  aspectKey: InAspect.Key<TInstance, TKind>,
  build: <TValue>(this: void, control: InControl<TValue>, origin?: InControl<any>) => TInstance,
  instance?: TInstance,
  origin?: InControl<any>,
): InAspect.Applied<TValue, TInstance> {
  if (instance === undefined) {
    instance = build(control, origin);
  }

  return {
    instance,
    convertTo<TTo>(target: InControl<TTo>): InAspect.Applied<TTo, TInstance> {
      return builtInAspect$<TTo, TInstance, TKind>(target, aspectKey, build, undefined, control);
    },
    attachTo(target: InControl<TValue>): InAspect.Applied<TValue, TInstance> | undefined {
      return builtInAspect$(
        target,
        aspectKey,
        build,
        (control.aspect(aspectKey) as TInstance | undefined) || build(target),
      );
    },
  };
}
