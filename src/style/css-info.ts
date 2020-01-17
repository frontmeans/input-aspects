/**
 * @module input-aspects
 */
import { nextArgs } from 'call-thru';
import { afterAll } from 'fun-events';
import { NamespaceDef, QualifiedName } from 'namespace-aliaser';
import { InControl } from '../control';
import { InMode } from '../data';
import { InStatus } from '../focus';
import { InputAspects__NS } from '../namespace-aliaser.aspect';
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
 * These names are qualified with the given (or {@link InputAspects__NS default}) namespace.
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

    const cls = (name: string) => [name, ns] as const;

    return afterAll({
      md: control.aspect(InMode),
      vl: control.aspect(InValidation),
      st: control.aspect(InStatus),
    }).keep.thru(
        ({ md: [mode], vl: [valid], st: [{ hasFocus, touched, edited }] }) => {

          const names: QualifiedName[] = [];

          if (!InMode.hasData(mode)) {
            names.push(cls('disabled'));
          }
          if (mode === 'ro' || mode === '-ro') {
            names.push(cls('readonly'));
          }
          if (!valid.ok) {
            names.push(cls('invalid'));
          }
          if (valid.has('missing')) {
            names.push(cls('missing'));
          }
          if (valid.has('incomplete')) {
            names.push(cls('incomplete'));
          }
          if (hasFocus) {
            names.push(cls('has-focus'));
          }
          if (touched) {
            names.push(cls('touched'));
          }
          if (edited) {
            names.push(cls('edited'));
          }

          return nextArgs(...names);
        },
    );
  };
}
