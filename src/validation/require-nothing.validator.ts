import { AfterEvent, afterThe } from '@proc7ts/fun-events';

/**
 * @internal
 */
const RequireNothing$ = (/*#__PURE__*/ afterThe<[]>());

/**
 * Input validator that requires nothing.
 *
 * @category Validation
 */
export function requireNothing(): AfterEvent<[]> {
  return RequireNothing$;
}
