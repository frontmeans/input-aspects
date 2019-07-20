import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectValue } from '../aspect.impl';
import { InElement } from '../element.control';
import { InMode } from '../submit';
import { InElementControl } from './element.impl';

/**
 * Radio input control.
 */
export type InRadio = InElement<boolean>;

class InRadioControl extends InElementControl<boolean, HTMLInputElement> {

  constructor(element: HTMLInputElement) {
    super(
        element,
        {
          get() {
            return this.element.checked;
          },
          set(value) {
            this.element.checked = value;
          },
        },
    );
  }

  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>,
  ): InAspect.Application.Result<Instance, boolean, Kind> | undefined {
    if (aspect as InAspect<any> === InMode[InAspect__symbol]) {
      return applyRadioMode(this) as InAspect.Application.Result<Instance, boolean, Kind>;
    }
    return super._applyAspect(aspect);
  }
}

function applyRadioMode(radio: InRadioControl): InAspect.Applied<InMode> {

  const { instance: mode } = InMode[InAspect__symbol].applyTo(radio);

  mode.derive(radio.read.keep.thru_(value => value ? 'on' : '-on'));

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
 * @return New radio input control instance.
 */
export function inRadio(element: HTMLInputElement): InRadio {
  return new InRadioControl(element);
}
