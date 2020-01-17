/**
 * @module input-aspects
 */
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectValue } from '../aspect.impl';
import { InMode } from '../data';
import { InElement } from '../element.control';
import { InElementControl } from './element.impl';

/**
 * Radio button input control.
 *
 * Radio buttons intended to be added to {@link InRadioGroup radio groups}.
 *
 * @category Control
 * @typeparam Value  Input value type. `boolean` by default.
 */
export type InRadio<Value = true> = InElement<Value | undefined, HTMLInputElement>;

export namespace InRadio {

  /**
   * Possible radio button control values corresponding to check states.
   *
   * @typeparam Value  Radio button input value type.
   */
  export interface Values<Value> {

    /**
     * Control value of checked radio button.
     */
    readonly checked: Value;

  }

}

/**
 * @internal
 */
class InRadioControl<Value> extends InElementControl<Value | undefined, HTMLInputElement> {

  constructor(
      element: HTMLInputElement,
      {
        checked = true as unknown as Value,
      }: Partial<InRadio.Values<Value>> = {},
  ) {
    super(
        element,
        {
          get() {
            return this.element.checked ? checked : undefined;
          },
          set(value) {
            this.element.checked = value === checked;
          },
        },
    );
  }

  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>,
  ): InAspect.Application.Result<Instance, Value | undefined, Kind> | undefined {
    if (aspect as InAspect<any> === InMode[InAspect__symbol]) {
      return applyRadioInMode(this) as InAspect.Application.Result<Instance, Value | undefined, Kind>;
    }
    return super._applyAspect(aspect);
  }
}

/**
 * @internal
 */
function applyRadioInMode<Value>(radio: InRadioControl<Value>): InAspect.Applied<InMode> {

  const { instance: mode } = InMode[InAspect__symbol].applyTo(radio);

  mode.derive(radio.read.keep.thru_(value => value !== undefined ? 'on' : '-on'));

  return inAspectValue(mode);
}

/**
 * Creates input control for the given radio button element.
 *
 * The created control has `true` value when radio button is checked.
 *
 * Sets input mode to `-on` when radio is not checked. Thus making control data `undefined`.
 *
 * @category Control
 * @param element  Target radio button element.
 *
 * @return New radio button input control instance.
 */
export function inRadio(element: HTMLInputElement): InRadio;

/**
 * Creates input control for the given radio button element with custom control `values`.
 *
 * Sets input mode to `-on` when radio is not checked. Thus making control data `undefined`.
 *
 * @typeparam Value  Input value type.
 * @param element  Target radio button element.
 * @param values  Possible values of radio button control.
 *
 * @return New radio button input control instance.
 */
export function inRadio<Value>(element: HTMLInputElement, values: InRadio.Values<Value>): InRadio<Value>;

export function inRadio<Value>(element: HTMLInputElement, values?: InRadio.Values<Value>): InRadio<Value> {
  return new InRadioControl<Value>(element, values);
}
