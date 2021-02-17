import type { InConverter } from './converter';

/**
 * @internal
 */
export const noopInConversion: InConverter.Aspect.Conversion<any> = {
  applyAspect(_aspect): undefined {
    return;
  },
};

/**
 * @internal
 */
export function noopInConverter(): InConverter.Aspect.Conversion<any> {
  return noopInConversion;
}
