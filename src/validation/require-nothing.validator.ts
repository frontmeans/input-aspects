/**
 *@packageDocumentation
 *@module input-aspects
 */
import { AfterEvent, afterThe } from 'fun-events';

/**
 * @internal
 */
const _requireNothing = (/*#__PURE__*/ afterThe<[]>());

/**
 * Input validator that requires nothing.
 *
 * @category Validation
 */
export function requireNothing(): AfterEvent<[]> {
  return _requireNothing;
}
