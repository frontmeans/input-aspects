/**
 * @module input-aspects
 */
import { AfterEvent, afterEventOf } from 'fun-events';

const _requireNothing: AfterEvent<[]> = /*#__PURE__*/ afterEventOf<[]>();

/**
 * Input validator that requires nothing.
 *
 * @category Validation
 */
export function requireNothing(): AfterEvent<[]> {
  return _requireNothing;
}
