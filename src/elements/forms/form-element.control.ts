import { noop } from 'call-thru';
import { eventSupplyOf } from 'fun-events';
import { InControl } from '../../control';
import { InConverter, intoConvertedAspects } from '../../converter';
import { InMode } from '../../data';
import { inModeByForm } from '../../data/modes';
import { InElement } from '../../element.control';
import { InElementControl } from '../element.impl';

/**
 * Form element control.
 *
 * It is connected to control to submit, but is not intended for submission itself and has no value.
 *
 * It is used to update form element state. E.g. to make it read-only when submit is in progress.
 *
 * Form element control can be created using [[inFormElement]] function.
 *
 * @category Control
 * @typeparam Elt  A type of HTML form element.
 */
export type InFormElement<Elt extends HTMLElement = HTMLElement> = InElement<void, Elt>;

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
     * Additional
     */
    readonly aspects?: InConverter.Aspect<void> | readonly InConverter.Aspect<void>[];

    modes: {
      readonly notReady?: InMode.Value;
      readonly invalid?: InMode.Value;
      readonly busy?: InMode.Value;
    };
  }

}

export function inFormElement<Elt extends HTMLElement>(
    element: Elt,
    options: InFormElement.Options,
): InControl<void> {

  const { form, aspects } = options;
  const control = new InElementControl<void, Elt>(
      element,
      {
        aspects: [intoConvertedAspects(aspects)],
        get: noop,
        set: noop,
      },
  );

  eventSupplyOf(control).needs(form);
  control.aspect(InMode).derive(inModeByForm(form));

  return control;
}
