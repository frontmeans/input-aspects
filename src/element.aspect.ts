import { InAspect } from './aspect';
import { inAspectNull } from './aspect.impl';
import { InElement } from './element';

/**
 * @internal
 */
export const InElement__aspect: InAspect<'default', InElement | null> = {
  applyTo() {
    return inAspectNull;
  },
};
