import { InControl } from '../control';

/**
 * Creates input control converter that extracts the first item from input array.
 *
 * The created converter extracts `undefined` when array is empty.
 *
 * @typeparam Item Input array item type.
 */
export function intoFirst<Item>(): InControl.Converter<Item[], Item | undefined>;

/**
 * Creates input control converter that extracts first item from input array or falls back to the given value if array
 * is empty.
 *
 * @typeparam Item Input array item type.
 * @param fallback Fallback value to use when array is empty.
 */
export function intoFirst<Item>(fallback: Item): InControl.Converter<Item[], Item>;

/**
 * Input control converter that extracts the first item from input array.
 *
 * Extracts `undefined` when array is empty.
 *
 * @typeparam Item Input array item type.
 */
export function intoFirst<Item>(
    from: InControl<Item[]>,
    to: InControl<Item | undefined>,
): InControl.Converters<Item[], Item | undefined>;

export function intoFirst<Item>(
    fromOrFallback?: InControl<Item[]> | Item,
    to?: InControl<Item | undefined>,
):
    | InControl.Converter<Item[], Item | undefined>
    | InControl.Converter<Item[], Item>
    | InControl.Converters<Item[], Item | undefined> {
  if (fromOrFallback === undefined) {
    return intoFirst;
  }
  if (!to) {
    return () => [
        array => array.length ? array[0] : fromOrFallback as Item,
        item => [item],
    ] as InControl.Converters<Item[], Item>;
  }
  return [array => array[0], item => item !== undefined ? [item] : []];
}
