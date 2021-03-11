import { noop } from '@proc7ts/primitives';
import { Supply } from '@proc7ts/supply';
import { InControl } from '../control';
import { intoInteger } from '../conversion';
import { inValue } from '../value.control';
import { InData } from './data.aspect';
import { InMode } from './mode.aspect';

describe('InData', () => {

  let control: InControl<string>;
  let mode: InMode;
  let data: InData<string>;
  let dataSupply: Supply;
  let lastData: InData.DataType<string> | undefined;

  beforeEach(() => {
    control = inValue('value');
    mode = control.aspect(InMode);
    data = control.aspect(InData);
    dataSupply = data(d => lastData = d);
  });

  it('is equal to the value initially', () => {
    expect(lastData).toBe('value');
  });
  it('is updated on value change', () => {
    control.it = 'other';
    expect(lastData).toBe('other');
  });
  it('is undefined when mode is `off`', () => {
    mode.own.it = 'off';
    expect(lastData).toBeUndefined();
  });
  it('is undefined when mode is `-on`', () => {
    mode.own.it = '-on';
    expect(lastData).toBeUndefined();
  });
  it('is undefined when mode is `-ro`', () => {
    mode.own.it = '-ro';
    expect(lastData).toBeUndefined();
  });
  it('is reused by converted control with the same value', () => {

    const converted = control.convert();

    expect(converted.aspect(InData)).toBe(data);
  });
  it('is not reused by converted control with another value', () => {

    const converted = control.convert(intoInteger);

    expect(converted.aspect(InData)).not.toBe(data);
  });

  describe('input cut off', () => {
    it('cuts off the data supply', () => {

      const reason = 'some reason';
      const dataDone = jest.fn();

      dataSupply.whenOff(dataDone);
      control.supply.off(reason);

      expect(dataDone).toHaveBeenCalledWith(reason);
    });
    it('cuts off new data supply', () => {

      const reason = 'some reason';

      control.supply.off(reason);

      const dataDone = jest.fn();

      dataSupply = data(noop).whenOff(dataDone);
      expect(dataDone).toHaveBeenCalledWith(reason);
    });
  });
});
