import { translateAfter } from '@proc7ts/fun-events';
import { arrayOfElements } from '@proc7ts/primitives';
import { InputAspects__NS } from '../../aspects';
import { InValidation } from '../../validation';
import { InCssClasses } from './css-classes.aspect';

/**
 * Builds a source of error marker CSS classes.
 *
 * Applies error marker class(es) when the given error message codes present in
 * {@link InValidation.Result validation result}.
 *
 * @category Style
 * @param mark - Error mark. Specifies CSS class(es) to apply when requested error present.
 * A class with `has-error` name in {@link InputAspects__NS input
 * aspects namespace} is used by default.
 * @param when - {@link InValidation.Message Validation message} code(s) to expect.
 * {@link InValidation.Result.ok Any} error matches by default.
 *
 * @returns A source of CSS class names to apply.
 */
export function inCssError(
    {
      mark,
      when,
    }: {
      mark?: InCssClasses.Spec | readonly InCssClasses.Spec[];
      when?: string | string[];
    } = {},
): InCssClasses.Source {

  let hasError: (errors: InValidation.Result) => boolean;

  if (!when) {
    hasError = defaultInCssHasError;
  } else if (Array.isArray(when)) {
    hasError = when.length ? errors => when.every(code => errors.has(code)) : defaultInCssHasError;
  } else {
    hasError = errors => errors.has(when);
  }

  return control => control.aspect(InValidation).read.do(translateAfter(
      (send, errors) => hasError(errors) ? send(...inCssErrorMarks(mark)) : send(),
  ));
}

/**
 * @internal
 */
function defaultInCssHasError(errors: InValidation.Result): boolean {
  return !errors.ok;
}

/**
 * @internal
 */
const defaultInCssErrorMarks: readonly InCssClasses.Spec[] = [['has-error', InputAspects__NS]];

/**
 * @internal
 */
function inCssErrorMarks(mark?: InCssClasses.Spec | readonly InCssClasses.Spec[]): readonly InCssClasses.Spec[] {
  if (!mark) {
    return defaultInCssErrorMarks;
  }

  const marks = arrayOfElements(mark);

  return marks.length ? marks : defaultInCssErrorMarks;
}
