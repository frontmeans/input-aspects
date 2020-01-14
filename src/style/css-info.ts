/**
 * @module input-aspects
 */
import { afterAll } from 'fun-events';
import { InControl } from '../control';
import { InMode } from '../data';
import { InStatus } from '../focus';
import { InValidation } from '../validation';
import { InCssClasses } from './css-classes.aspect';

/**
 * A source of informative CSS classes.
 *
 * Generates the following CSS classes:
 * - `disabled` when input control is disabled (i.e. has no data).
 * - `readonly` when input control is read-only,
 * - `invalid` when input control validation failed,
 * - `missing` when there are validation messages with `missing` code,
 * - `incomplete` when there are validation messages with `incomplete`,
 * - `hasFocus` when input control has input focus,
 * - `touched` when input control is touched (i.e. had focus already),
 * - `edited` when input control is edited by user.
 *
 * @category Style
 * @param prefix  Optional prefix to add to generated class names. `inas-` by default.
 * @param suffix  Optional suffix to add to generated class names.
 */
export function inCssInfo(
    {
      prefix = 'inap-',
      suffix = '',
    }: {
      prefix?: string,
      suffix?: string,
    } = {},
): InCssClasses.Source {
  return (control: InControl<any>) => {
    return afterAll({
      md: control.aspect(InMode),
      vl: control.aspect(InValidation),
      st: control.aspect(InStatus),
    }).keep.thru(
        ({ md: [mode], vl: [valid], st: [{ hasFocus, touched, edited }] }) => {
          return {
            [cls('disabled')]: !InMode.hasData(mode),
            [cls('readonly')]: mode === 'ro' || mode === '-ro',
            [cls('invalid')]: !valid.ok,
            [cls('missing')]: valid.has('missing'),
            [cls('incomplete')]: valid.has('incomplete'),
            [cls('has-focus')]: hasFocus,
            [cls('touched')]: touched,
            [cls('edited')]: edited,
          } as InCssClasses.Map;
        },
    );
  };

  function cls(name: string): string {
    return `${prefix}${name}${suffix}`;
  }
}
