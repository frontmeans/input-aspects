import { InAspect } from './in-aspect';
import { inAspectNull } from './in-aspect.impl';
import { InElement } from './in-element';

/**
 * @internal
 */
export const InElement__aspect: InAspect<'default', InElement | null> = {
  applyTo() {
    return inAspectNull;
  },
};
