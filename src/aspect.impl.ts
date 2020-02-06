import { noop } from 'call-thru';
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
export function inAspectSameOrNull<Value, Instance, Kind extends InAspect.Application.Kind>(
    control: InControl<Value>,
    aspectKey: InAspect.Key<Instance | null, Kind>,
    instance: Instance | null = null,
): InAspect.Applied<Value, Instance | null> {
  return {
    instance,
    convertTo<To>(target: InControl<To>): InAspect.Applied<To, Instance | null> {
      return inAspectSameOrNull<To, Instance, Kind>(target, aspectKey);
    },
    attachTo(target: InControl<Value>): InAspect.Applied<Value, Instance | null> | undefined {
      return inAspectSameOrNull(
          target,
          aspectKey,
          control.aspect(aspectKey) as Instance | null,
      );
    },
  };
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
