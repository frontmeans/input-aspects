import { InAspect, InAspect__symbol } from './aspect';

/**
 * @internal
 */
export function isAspectKey<TInstance, TKind extends InAspect.Application.Kind>(
    value: object,
): value is InAspect.Key<TInstance, TKind> {
  return InAspect__symbol in value;
}
