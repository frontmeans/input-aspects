import { InControl } from '../control';
import { InValidation } from '../validation';
import { InValue } from '../value';
import { intoInteger } from './into-integer';

describe('intoInteger', () => {

  let textControl: InControl<string>;
  let intControl: InControl<number>;

  beforeEach(() => {
    textControl = new InValue('');
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
      invalid: 'not integer',
      NaN: 'not integer',
      notInteger: 'not integer',
    }]);
  });
  it('converts back from integer', () => {
    intControl.it = 321;
    expect(intControl.it).toBe(321);
    expect(textControl.it).toBe('321');
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
