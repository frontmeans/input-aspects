import { InControl } from '../control';
import { InValidation } from '../validation';
import { inValue } from '../value';
import { intoInteger } from './into-integer';

describe('intoInteger', () => {

  let textControl: InControl<string>;
  let intControl: InControl<number>;

  beforeEach(() => {
    textControl = inValue('');
    intControl = textControl.convert(intoInteger);
  });

  let validationResult: InValidation.Result;

  beforeEach(() => {
    intControl.aspect(InValidation).read(result => validationResult = result);
  });

  it('converts to integer', () => {
    textControl.it = '123';
    expect(intControl.it).toBe(123);
    expect(validationResult.ok).toBe(true);
  });
  it('converts to integer with custom radix', () => {

    const hexControl = textControl.convert(intoInteger(16));

    textControl.it = 'ff';
    expect(hexControl.it).toBe(0xff);
  });
  it('converts floats to integer', () => {
    textControl.it = '123.956';
    expect(intControl.it).toBe(123);
    expect(validationResult.ok).toBe(true);
  });
  it('reports parse error', () => {
    textControl.it = 'abc';
    expect(intControl.it).toBeNaN();
    expect(validationResult.ok).toBe(false);
    expect([...validationResult]).toEqual([{
      invalid: 'notInteger',
      NaN: 'notInteger',
      notInteger: 'notInteger',
    }]);
  });
  it('converts back from integer', () => {
    intControl.it = 321;
    expect(intControl.it).toBe(321);
    expect(textControl.it).toBe('321');
  });
  it('converts back from integer with custom radix', () => {

    const hexControl = textControl.convert(intoInteger(16));

    hexControl.it = 0xabc;
    expect(hexControl.it).toBe(0xabc);
    expect(textControl.it).toBe('abc');
  });
  it('converts back from float', () => {
    intControl.it = 321.911;
    expect(intControl.it).toBe(321);
    expect(textControl.it).toBe('321');
  });
  it('removes parse errors when converting back to text', () => {
    textControl.it = 'wrong';
    expect(validationResult.ok).toBe(false);
    intControl.it = 13;
    expect(validationResult.ok).toBe(true);
  });
});
