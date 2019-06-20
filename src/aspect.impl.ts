import { noop } from 'call-thru';
import { InAspect } from './aspect';

/**
 * @internal
 */
export const inAspectNull: InAspect.Applied<any, any> = {
  instance: null,
  convertTo: noop,
};

/**
 * @internal
 */
export function inAspectValue<Instance, Value = any>(instance: Instance): InAspect.Applied<Instance, Value> {
  return {
    instance,
    convertTo() {
      return this;
    },
  };
}
