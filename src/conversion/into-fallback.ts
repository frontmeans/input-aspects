/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import { asis } from '@proc7ts/primitives';
import { InConverter } from '../converter';

/**
 * Creates a converter that converts an input control to the one replacing `undefined` value with fallback one.
 *
 * Treats `null` values as `undefined`. Despite the signature does not allow nulls they are often used instead.
 * E.g. when receiving JSON from server.
 *
 * @category Converter
 * @typeParam TValue - Input value type.
 * @param fallback - A fallback value that is used instead of original one when `undefined` (or`null`) is assigned
 * to converted control.
 */
export function intoFallback<TValue>(fallback: TValue): InConverter<TValue, TValue | undefined> {
  return () => ({
    set: asis,
    get(value) {
      return value != null ? value : fallback;
    },
  });
}
