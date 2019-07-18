import { asis } from 'call-thru';
import { InControl } from '../control';

/**
 * Creates a converter that converts an input control to the one replacing `undefined` value with fallback one.
 *
 * Treats `null` values as `undefined`. Despite the signature does not allow nulls they are often used instead.
 * E.g. when receiving JSON from server.
 *
 * @typeparam Input value type.
 * @param fallback A fallback value that is used instead of original one when `undefined` (or`null`) is assigned
 * to converted control.
 */
export function intoFallback<Value>(fallback: Value): InControl.Converter<Value, Value | undefined> {
  return () => [asis, value => value != null ? value : fallback];
}
