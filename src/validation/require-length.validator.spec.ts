import { InControl } from '../control';
import { InValue } from '../value';
import { requireLength } from './require-length.validator';
import { InValidation } from './validation.aspect';

describe('requireLength', () => {

  let control: InControl<string>;
  let validation: InValidation<string>;

  beforeEach(() => {
    control = new InValue('');
    validation = control.aspect(InValidation);
  });

  let validationResult: InValidation.Result;

  beforeEach(() => {
    validation.read(result => validationResult = result);
  });

  it('ignores empty value', () => {
    validation.by(requireLength(13));
    expect(validationResult.ok).toBe(true);
  });
  it('reports too short value', () => {
    validation.by(requireLength(13));
    control.it = '123456';
    expect([...validationResult]).toEqual([{ incomplete: 'tooShort', tooShort: 13 }]);
  });
  it('reports too long value', () => {
    validation.by(requireLength(0, 5));
    control.it = '123456';
    expect([...validationResult]).toEqual([{ invalid: 'tooLong', tooLong: 5 }]);
  });
  it('does not report valid value', () => {
    validation.by(requireLength(3, 5));
    control.it = '1234';
    expect(validationResult.ok).toBe(true);
  });
});
