/**
 *@packageDocumentation
 *@module input-aspects
 */
import { InControl } from '../../control';
import { InMode, inModeValue } from '../index';
import { InSubmit } from '../../submit.aspect';

/**
 * Creates an {@link InMode input mode} source which is updated depending on the given `form` control status.
 *
 * This can be applied e.g. to submit button, to form element (with another control!), or to input controls.
 * The defaults best suit the latter.
 *
 * @category Aspect
 * @param form  Form control the evaluated mode depends on. Should not be the same as the target control!
 * @param notReady  Input mode to set when submit is not ready. E.g. when input is invalid.
 * `on` (enabled) by default. An `off` (disable) value is a better choice for submit button.
 * @param invalid  Input mode to set when submit is not ready _and_ the form is submitted.
 * `on` (enabled) by default. An `off` (disable) value is a better choice for submit button.
 * @param busy  Input mode to set while submitting. `ro` (read-only) by default. An `off` (disabled) value is a better
 * choice for submit button.
 *
 * @returns A source of input mode source.
 */
export function inModeByForm(
    form: InControl<any>,
    {
      notReady = 'on',
      invalid = 'on',
      busy = 'ro',
    }: {
      notReady?: InMode.Value;
      invalid?: InMode.Value;
      busy?: InMode.Value;
    } = {},
): InMode.Source {

  const submit = form.aspect(InSubmit);

  return submit.read.keep.thru(
      flags => inModeValue(
          flags.busy ? busy : 'on',
          flags.ready ? 'on' : (flags.submitted ? invalid : notReady),
      ),
  );
}
