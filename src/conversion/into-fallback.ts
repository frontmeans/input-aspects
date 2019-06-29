import { asis } from 'call-thru';
import { InControl } from '../control';

/**
 * Creates a converter that converts an input control to the one replacing `undefined` value with fallback one.
 *
 * @typeparam Input value type.
 * @param fallback A fallback value that is used instead of original one when `undefined` is assigned to converted
 * control.
 */
export function intoFallback<Value>(fallback: Value): InControl.Converter<Value, Value | undefined> {
  return () => [asis, value => value !== undefined ? value : fallback];
}
