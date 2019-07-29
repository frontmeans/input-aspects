import { InControl } from '../control';
import { inValue } from '../value';
import { InData } from './data.aspect';
import { InMode } from './mode.aspect';

describe('InData', () => {

  let control: InControl<string>;
  let mode: InMode;
  let data: InData<string>;
  let lastData: InData.DataType<string> | undefined;

  beforeEach(() => {
    control = inValue('value');
    mode = control.aspect(InMode);
    data = control.aspect(InData);
    data(d => lastData = d);
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
});
