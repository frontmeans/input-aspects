import { noop } from 'call-thru';
import { afterEventFromAll } from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { InData, InMode } from '../submit';
import { InElement } from './element';
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
    if (aspect as InAspect<any> === InData[InAspect__symbol]) {
      return applyRadioData(this) as InAspect.Application.Result<Instance, boolean, Kind>;
    }
    return super._applyAspect(aspect);
  }
}

function applyRadioData(radio: InRadio): InAspect.Applied<InData<boolean>, InData<any>> {

  const instance: InData<boolean> = afterEventFromAll({
    value: radio.read.keep.thru_(value => value || undefined),
    mode: radio.aspect(InMode),
  }).keep.thru(
      ({ value: [value], mode: [mode] }) => mode !== 'off' && value || undefined,
  );

  return {
    instance,
    convertTo: noop,
  };
}

/**
 * Creates input control for the given radio button element.
 *
 * This control has `true` value when radio is checked, or `false` otherwise.
 *
 * In contrast to other input controls its data is `undefined` when radio is not checked.
 *
 * @param element Target radio button element.
 *
 * @return New input element control instance.
 */
export function inRadio(element: HTMLInputElement): InElement<boolean> {
  return new InRadio(element);
}
