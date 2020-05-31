import { EventSupply } from '@proc7ts/fun-events';
import { noop } from '@proc7ts/primitives';
import { InControl } from '../control';
import { inValue } from '../controls';
import { intoInteger } from '../conversion';
import { InData } from './data.aspect';
import { InMode } from './mode.aspect';

describe('InData', () => {

  let control: InControl<string>;
  let mode: InMode;
  let data: InData<string>;
  let dataSupply: EventSupply;
  let lastData: InData.DataType<string> | undefined;

  beforeEach(() => {
    control = inValue('value');
    mode = control.aspect(InMode);
    data = control.aspect(InData);
    dataSupply = data.to(d => lastData = d);
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
      control.done(reason);

      expect(dataDone).toHaveBeenCalledWith(reason);
    });
    it('cuts off new data supply', () => {

      const reason = 'some reason';

      control.done(reason);

      const dataDone = jest.fn();

      dataSupply = data.to(noop).whenOff(dataDone);
      expect(dataDone).toHaveBeenCalledWith(reason);
    });
  });
});
