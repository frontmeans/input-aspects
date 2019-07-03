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
export function inAspectValue<Instance>(instance: Instance): InAspect.Applied<Instance> {
  return {
    instance,
    convertTo() {
      return this;
    },
  };
}
