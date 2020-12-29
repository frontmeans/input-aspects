/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import { noop } from '@proc7ts/primitives';
import { InControl } from '../../control';
import { InConverter, intoConvertedAspects } from '../../converter';
import { InMode } from '../../data';
import { inModeByForm } from '../../data/modes';
import { InElement } from '../../element.control';
import { AbstractInElement } from '../abstract-element.control';

/**
 * Form element control.
 *
 * It is connected to control to submit (form), but is not intended for submission itself, and has no value.
 *
 * It is used to update form element state. E.g. to make it read-only when {@link InSubmit.Flags.busy submitting}
 * the form.
 *
 * Form element control can be created by {@link inFormElement} function.
 *
 * @category Control
 * @typeParam TElt - A type of HTML form element.
 */
export type InFormElement<TElt extends HTMLElement = HTMLElement> = InElement<void, TElt>;

/**
 * @category Control
 */
export namespace InFormElement {

  /**
   * Form element control options.
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
     * Applied to form element control by {@link inModeByForm}.
     */
    modes?: {

      /**
       * Input mode to set when submit is not ready. E.g. when input is invalid. `on` (enabled) by default.
       */
      readonly notReady?: InMode.Value;

      /**
       * Input mode to set when submit is not ready _and_ the form is submitted. `on` (enabled) by default.
       */
      readonly invalid?: InMode.Value;

      /**
       * Input mode to set while submitting. `ro` (read-only) by default.
       */
      readonly busy?: InMode.Value;

    };

  }

}

/**
 * Creates form element control.
 *
 * @category Control
 * @param element - HTML element to create control for.
 * @param options - Form element control options.
 *
 * @returns New form element control.
 */
export function inFormElement<TElt extends HTMLElement>(
    element: TElt,
    options: InFormElement.Options,
): InFormElement<TElt> {

  const { form, aspects, modes } = options;
  const control = new AbstractInElement<void, TElt>(
      element,
      {
        aspects: [intoConvertedAspects(aspects)],
        get: noop,
        set: noop,
      },
  );

  control.supply.needs(form);
  control.aspect(InMode).derive(inModeByForm(form, modes));

  return control;
}
