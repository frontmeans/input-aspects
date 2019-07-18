import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectValue } from '../aspect.impl';
import { InElement } from '../element.control';
import { InMode } from '../submit';
import { InElementControl } from './element.impl';

class InRadio extends InElementControl<HTMLInputElement, boolean> {

  protected _get(): boolean {
    return this.element.checked;
  }

  protected _set(value: boolean): boolean {
    this.element.checked = value;
    return this.element.checked;
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

function applyRadioMode(radio: InRadio): InAspect.Applied<InMode> {

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
 * @return New input element control instance.
 */
export function inRadio(element: HTMLInputElement): InElement<boolean> {
  return new InRadio(element);
}
