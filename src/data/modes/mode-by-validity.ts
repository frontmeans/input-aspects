import { mapAfter } from '@proc7ts/fun-events';
import { InValidation } from '../../validation';
import { InMode } from '../mode.aspect';

/**
 * Creates an {@link InMode input mode} source depending on control's {@link InValidation validity}.
 *
 * This can be applied to form control to prevent submission of invalid input.
 *
 * @category Aspect
 * @param invalid - Input mode to set when the input is invalid. `-on` (not submittable) by default. This
 * should not be set to disabled, as the latter would make it impossible to fix input errors.
 * @param ignore - Ignored message codes. If all validation messages have this code the form is not marked as invalid.
 * `submit` by default, as this code intended to be server-side.
 *
 * @returns A source of input mode.
 */
export function inModeByValidity({
  invalid = '-on',
  ignore = 'submit',
}: {
  invalid?: InMode.Value | undefined;
  ignore?: string | string[] | undefined;
} = {}): InMode.Source {
  return control => control
      .aspect(InValidation)
      .read.do(
        mapAfter(validity => validity.hasBut(...(typeof ignore === 'string' ? [ignore] : ignore)) ? invalid : 'on'),
      );
}
