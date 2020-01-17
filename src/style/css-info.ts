/**
 * @module input-aspects
 */
import { afterAll } from 'fun-events';
import { css__naming, NamespaceDef } from 'namespace-aliaser';
import { InControl } from '../control';
import { InMode } from '../data';
import { InStatus } from '../focus';
import { InNamespaceAliaser, InputAspects__NS } from '../namespace-aliaser.aspect';
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
 * These names are qualified with the given (or {@link InputAspects__NS default} namespace. Then uses
 * [[InNamespaceAliaser]] to convert qualified CSS class names to simple ones.
 *
 * @category Style
 * @param ns  A definition of namespace to qualify CSS class names with. The {@link InputAspects__NS default namespace}
 * will be used when omitted.
 */
export function inCssInfo(
    {
      ns = InputAspects__NS,
    }: {
      ns?: NamespaceDef,
    } = {},
): InCssClasses.Source {
  return (control: InControl<any>) => {

    const nsAlias = control.aspect(InNamespaceAliaser);
    const cls = (name: string) => css__naming.name([name, ns], nsAlias);

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
}
