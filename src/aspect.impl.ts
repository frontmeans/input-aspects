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
export function inAspectSameOrBuild<Value, Instance, Kind extends InAspect.Application.Kind>(
    control: InControl<Value>,
    aspectKey: InAspect.Key<Instance, Kind>,
    build: <V>(this: void, control: InControl<V>, origin?: InControl<any>) => Instance,
    instance?: Instance,
    origin?: InControl<any>,
): InAspect.Applied<Value, Instance> {
  if (instance === undefined) {
    instance = build(control, origin);
  }
  return {
    instance,
    convertTo<To>(target: InControl<To>): InAspect.Applied<To, Instance> {
      return inAspectSameOrBuild<To, Instance, Kind>(
          target,
          aspectKey,
          build,
          undefined,
          control,
      );
    },
    attachTo(target: InControl<Value>): InAspect.Applied<Value, Instance> | undefined {
      return inAspectSameOrBuild(
          target,
          aspectKey,
          build,
          (control.aspect(aspectKey) as Instance | undefined) || build(target),
      );
    },
  };
}

/**
 * @internal
 */
export function inAspectSameOrNull<Value, Instance, Kind extends InAspect.Application.Kind>(
    control: InControl<Value>,
    aspectKey: InAspect.Key<Instance | null, Kind>,
    instance: Instance | null = null,
): InAspect.Applied<Value, Instance | null> {
  return inAspectSameOrBuild(control, aspectKey, valueProvider(null), instance);
}

/**
 * @internal
 */
export function inAspectValue<Instance>(instance: Instance): InAspect.Applied<any, Instance> {
  return {
    instance,
    convertTo() {
      return this;
    },
  };
}
