/**
 * @module input-aspects
 */
import { AfterEvent, afterThe } from 'fun-events';

const _requireNothing: AfterEvent<[]> = /*#__PURE__*/ afterThe<[]>();

/**
 * Input validator that requires nothing.
 *
 * @category Validation
 */
export function requireNothing(): AfterEvent<[]> {
  return _requireNothing;
}
