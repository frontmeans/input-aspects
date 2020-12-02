/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import { NamespaceDef, QualifiedName } from '@frontmeans/namespace-aliaser';
import { nextArgs } from '@proc7ts/call-thru';
import { afterAll } from '@proc7ts/fun-events';
import { InputAspects__NS } from '../../aspects';
import { InControl } from '../../control';
import { InMode } from '../../data';
import { InValidation } from '../../validation';
import { InStatus } from '../focus';
import { InCssClasses } from './css-classes.aspect';

/**
 * Builds a source of informative CSS classes.
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
 *
 * @returns A source of CSS class names to apply.
 */
export function inCssInfo(
    {
      ns = InputAspects__NS,
    }: {
      ns?: NamespaceDef;
    } = {},
): InCssClasses.Source {
  return (control: InControl<any>) => {

    const cls = (name: string) => [name, ns] as const;

    return afterAll({
      md: control.aspect(InMode),
      vl: control.aspect(InValidation),
      st: control.aspect(InStatus),
    }).keepThru(
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
