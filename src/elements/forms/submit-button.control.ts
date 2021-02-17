import { noop } from '@proc7ts/primitives';
import { InControl } from '../../control';
import { InConverter, intoConvertedAspects } from '../../converter';
import { InMode } from '../../data';
import { inModeByForm } from '../../data/modes';
import { InElement } from '../../element.control';
import { AbstractInElement } from '../abstract-element.control';

/**
 * Form submit button control.
 *
 * It is connected to control to submit (form) and may change submit button state depending on form submit status.
 * E.g. by disabling it when submit is {@link InSubmit.Flags.ready not ready}, or while {@link InSubmit.Flags.busy
 * submitting} the form.
 *
 * Submit button control can be created by {@link inSubmitButton} function.
 *
 * @category Control
 * @typeParam TElt - A type of submit button element.
 */
export type InSubmitButton<TElt extends HTMLElement = HTMLElement> = InElement<void, TElt>;

/**
 * @category Control
 */
export namespace InSubmitButton {

  /**
   * Submit button control options.
   */
  export interface Options {

    /**
     * Submitted control. Typically a {@link InContainer container}.
     */
    readonly form: InControl<any>;

    /**
     * Additional input aspects to apply. These are aspect converters to constructed control  from the
     * {@link inValueOf same-valued one}.
     */
    readonly aspects?: InConverter.Aspect<void> | readonly InConverter.Aspect<void>[];

    /**
     * Input modes to derive from submitted control.
     *
     * Applied to submit button control by {@link inModeByForm}.
     */
    modes?: {

      /**
       * Input mode to set when submit is not ready. E.g. when input is invalid. `on` (enabled) by default.
       */
      readonly notReady?: InMode.Value;

      /**
       * Input mode to set when submit is not ready _and_ the form is submitted. `off` (disable) by default.
       */
      readonly invalid?: InMode.Value;

      /**
       * Input mode to set while submitting. `off` (disabled) by default.
       */
      readonly busy?: InMode.Value;

    };

  }

}

/**
 * Creates submit button control.
 *
 * @category Control
 * @param element - Submit button element to create control for.
 * @param options - Submit button control options.
 *
 * @returns New submit button control.
 */
export function inSubmitButton<TElt extends HTMLElement>(
    element: TElt,
    options: InSubmitButton.Options,
): InSubmitButton<TElt> {

  const { form, aspects, modes: { notReady = 'on', invalid = 'off', busy = 'off' } = {} } = options;
  const control = new AbstractInElement<void, TElt>(
      element,
      {
        aspects: [intoConvertedAspects(aspects)],
        get: noop,
        set: noop,
      },
  );

  control.supply.needs(form);
  control.setup(InMode, mode => mode.derive(inModeByForm(form, { notReady, invalid, busy })));

  return control;
}
