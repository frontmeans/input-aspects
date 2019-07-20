import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectValue } from '../aspect.impl';
import { InElement } from '../element.control';
import { InMode } from '../submit';
import { InElementControl } from './element.impl';

/**
 * Radio button input control.
 *
 * @typeparam Value Input value type. `boolean` by default.
 */
export type InRadio<Value = boolean> = InElement<Value>;

export namespace InRadio {

  /**
   * Possible radio button control values corresponding to different check states.
   *
   * @typeparam Value Radio button input value type.
   */
  export interface Values<Value> {

    /**
     * Control value of checked radio button.
     */
    checked: Value;

    /**
     * Control value of unchecked radio button.
     */
    unchecked: Value;

  }

}

class InRadioControl<Value> extends InElementControl<Value, HTMLInputElement> {

  constructor(
      element: HTMLInputElement,
      {
        checked = true as unknown as Value,
        unchecked = false as unknown as Value,
      }: Partial<InRadio.Values<Value>> = {}
  ) {
    super(
        element,
        {
          get() {
            return this.element.checked ? checked : unchecked;
          },
          set(value) {
            this.element.checked = value === checked;
          },
        },
    );
  }

  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>,
  ): InAspect.Application.Result<Instance, Value, Kind> | undefined {
    if (aspect as InAspect<any> === InMode[InAspect__symbol]) {
      return applyRadioMode(this) as InAspect.Application.Result<Instance, Value, Kind>;
    }
    return super._applyAspect(aspect);
  }
}

function applyRadioMode<Value>(radio: InRadioControl<Value>): InAspect.Applied<InMode> {

  const { instance: mode } = InMode[InAspect__symbol].applyTo(radio);

  mode.derive(radio.read.keep.thru_(() => radio.element.checked ? 'on' : '-on'));

  return inAspectValue(mode);
}

/**
 * Creates input control for the given radio button element.
 *
 * This control has `true` value when radio is checked, or `false` otherwise.
 *
 * Sets input mode to `-on` when radio is not checked. Thus making control data `undefined`.
 *
 * @param element Target radio button element.
 *
 * @return New radio button input control instance.
 */
export function inRadio(element: HTMLInputElement): InRadio;

/**
 * Creates input control for the given radio button element with custom control values.
 *
 * Sets input mode to `-on` when radio is not checked. Thus making control data `undefined`.
 *
 * @typeparam Value Input value type.
 * @param element Target radio button element.
 * @param values All possible values of radio button control.
 *
 * @return New radio button input control instance.
 */
export function inRadio<Value>(element: HTMLInputElement, values: InRadio.Values<Value>): InRadio<Value>;

export function inRadio<Value>(element: HTMLInputElement, values?: InRadio.Values<Value>): InRadio<Value> {
  return new InRadioControl<Value>(element, values);
}
