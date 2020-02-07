/**
 *@packageDocumentation
 *@module input-aspects
 */
import { InMode, inModeValue } from '../index';
import { InSubmit } from '../../submit.aspect';

/**
 * Creates an {@link InMode input mode} source which is updated depending on {@link InSubmit submit} status.
 *
 * This can be applied e.g. to submit button, to form element, or to input controls. The defaults best suit the latter.
 *
 * @category Aspect
 * @param submit  Input submit to evaluate a mode for. Should not be the one of the target control.
 * @param busy  Input mode to set while submitting. `ro` (read-only) by default. An `off` (disabled) value is a better
 * choice for submit button.
 * @param notReady  Input mode to set while submitting. `on` (enabled) by default. An `off` (disable) value is a better
 * choice for submit button.
 *
 * @returns A source of input mode source.
 */
export function inModeBySubmit(
    submit: InSubmit<any>,
    {
      busy = 'ro',
      notReady = 'on',
    }: {
      busy?: InMode.Value;
      notReady?: InMode.Value;
    } = {},
): InMode.Source {
  return submit.read.keep.thru(
      flags => inModeValue(
          flags.busy ? busy : 'on',
          flags.ready ? 'on' : notReady,
      ),
  );
}
