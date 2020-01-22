/**
 *@packageDocumentation
 *@module input-aspects
 */
import { nextArgs } from 'call-thru';
import { InputAspects__NS } from '../namespace-aliaser.aspect';
import { InValidation } from '../validation';
import { InCssClasses } from './css-classes.aspect';

/**
 * @internal
 */
const defaultInCssErrorMarks: InCssClasses.Spec[] = [['has-error', InputAspects__NS]];

/**
 * @internal
 */
function defaultInCssHasError(errors: InValidation.Result): boolean {
  return !errors.ok;
}

/**
 * Builds a source of error marker CSS classes.
 *
 * Applies error marker class(es) when the given error message codes present in
 * {@link InValidation.Result validation result}.
 *
 * @category Style
 * @param mark  Error mark. Specifies CSS class(es) to apply when requested error present.
 * A class with `has-error` name in {@link InputAspects__NS input
 * aspects namespace} is used by default.
 * @param when  {@link InValidation.Message Validation message} code(s) to expect.
 * {@link InValidation.Result.ok Any} error matches by default.
 *
 * @returns A source of CSS class names to apply.
 */
export function inCssError(
    {
      mark,
      when,
    }: {
      mark?: InCssClasses.Spec | InCssClasses.Spec[];
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

  let marks: InCssClasses.Spec[];

  if (!mark) {
    marks = defaultInCssErrorMarks;
  } else if (Array.isArray(mark)) {
    marks = mark.length ? mark : defaultInCssErrorMarks;
  } else {
    marks = [mark];
  }

  return control => control.aspect(InValidation).read.keep.thru(
      errors => hasError(errors) ? nextArgs(...marks) : nextArgs(),
  );
}
