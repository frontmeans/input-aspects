import { mapAfter } from '@proc7ts/fun-events';
import { knownInAspect } from '../applied-aspect';
import { InAspect, InAspect__symbol } from '../aspect';
import { InConverter } from '../converter';
import { InMode } from '../data';
import { InElement } from '../element.control';
import { AbstractInElement } from './abstract-element.control';

/**
 * Radio button input control.
 *
 * Radio buttons intended to be added to {@link InRadioGroup radio groups}.
 *
 * @category Control
 * @typeParam TValue - Input value type. `boolean` by default.
 */
export type InRadio<TValue = true> = InElement<TValue | undefined, HTMLInputElement>;

/**
 * @category Control
 */
export namespace InRadio {

  /**
   * Possible radio button control values corresponding to check states.
   *
   * @typeParam TValue - Radio button input value type.
   */
  export interface Values<TValue> {

    /**
     * Control value of checked radio button.
     */
    readonly checked: TValue;

    /**
     * Input aspects applied by default.
     *
     * These are aspect converters to constructed control from the {@link inValueOf same-valued one}.
     */
    readonly aspects?:
        | InConverter.Aspect<TValue | undefined>
        | readonly InConverter.Aspect<TValue | undefined>[]
        | undefined;

  }

}

/**
 * @internal
 */
class InRadioControl<TValue> extends AbstractInElement<TValue | undefined, HTMLInputElement> {

  constructor(
      element: HTMLInputElement,
      {
        checked = true as unknown as TValue,
        aspects,
      }: Partial<InRadio.Values<TValue>> = {},
  ) {
    super(
        element,
        {
          aspects,
          get() {
            return this.element.checked ? checked : undefined;
          },
          set(value) {
            this.element.checked = value === checked;
          },
        },
    );
  }

  protected _applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
      aspect: InAspect<TInstance, TKind>,
  ): InAspect.Application.Result<TInstance, TValue | undefined, TKind> | undefined {
    if (aspect as InAspect<any> === InMode[InAspect__symbol]) {
      return applyRadioInMode(this) as InAspect.Application.Result<TInstance, TValue | undefined, TKind>;
    }

    return super._applyAspect(aspect);
  }

}

/**
 * @internal
 */
function applyRadioInMode<TValue>(radio: InRadioControl<TValue>): InAspect.Applied<TValue, InMode> {

  const { instance: mode } = InMode[InAspect__symbol].applyTo(radio);

  mode.derive(radio.read.do(mapAfter(value => value !== undefined ? 'on' : '-on')));

  return knownInAspect(mode);
}

/**
 * Creates input control for the given radio button element.
 *
 * The created control has `true` value when radio button is checked.
 *
 * Sets input mode to `-on` when radio is not checked. Thus making control data `undefined`.
 *
 * @category Control
 * @param element - Target radio button element.
 *
 * @return New radio button input control instance.
 */
export function inRadio(element: HTMLInputElement): InRadio;

/**
 * Creates input control for the given radio button element with default aspects.
 *
 * The created control has `true` value when radio button is checked.
 *
 * Sets input mode to `-on` when radio is not checked. Thus making control data `undefined`.
 *
 * @param element - Target radio button element.
 * @param aspects - Input aspects applied by default. These are aspect converters to constructed control
 * from the {@link inValueOf same-valued one}.
 *
 * @return New radio button input control instance.
 */
export function inRadio(
    element: HTMLInputElement,
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    {
      aspects,
    }: {
      readonly aspects?:
          | InConverter.Aspect<boolean | undefined>
          | readonly InConverter.Aspect<boolean | undefined>[]
          | undefined;
    },
): InRadio;

/**
 * Creates input control for the given radio button element with custom control `values`.
 *
 * Sets input mode to `-on` when radio is not checked. Thus making control data `undefined`.
 *
 * @typeParam TValue - Input value type.
 * @param element - Target radio button element.
 * @param values - Possible values of radio button control.
 *
 * @return New radio button input control instance.
 */
export function inRadio<TValue>(element: HTMLInputElement, values: InRadio.Values<TValue>): InRadio<TValue>;

export function inRadio<TValue>(element: HTMLInputElement, values?: Partial<InRadio.Values<TValue>>): InRadio<TValue> {
  return new InRadioControl<TValue>(element, values);
}
