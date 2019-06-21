import { AfterEvent, afterEventOf } from 'fun-events';

/**
 * Input validator that requires nothing.
 */
export const requireNothing: AfterEvent<[]> = /*#__PURE__*/ afterEventOf<[]>();
