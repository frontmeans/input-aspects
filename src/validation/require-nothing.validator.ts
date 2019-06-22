import { AfterEvent, afterEventOf } from 'fun-events';

const _requireNothing: AfterEvent<[]> = /*#__PURE__*/ afterEventOf<[]>();

/**
 * Input validator that requires nothing.
 */
export function requireNothing(): AfterEvent<[]> {
  return _requireNothing;
}
