import { InControl } from '../control';
import { inValue } from '../controls';
import { requireRange } from './require-range.validator';
import { InValidation } from './validation.aspect';

describe('requireRange', () => {

  let control: InControl<number>;
  let validation: InValidation<number>;

  beforeEach(() => {
    control = inValue(0);
    validation = control.aspect(InValidation);
  });

  let validationResult: InValidation.Result;

  beforeEach(() => {
    validation.read(result => validationResult = result);
  });

  it('ignores NaN value', () => {
    control.it = NaN;
    validation.by(requireRange(1, 13));
    expect(validationResult.ok).toBe(true);
  });
  it('reports too small value', () => {
    validation.by(requireRange(11));
    control.it = 10;
    expect([...validationResult]).toEqual([{ invalid: 'tooSmall', tooSmall: 11 }]);
  });
  it('reports too large value', () => {
    validation.by(requireRange(0, 5));
    control.it = 10;
    expect([...validationResult]).toEqual([{ invalid: 'tooLarge', tooLarge: 5 }]);
  });
  it('does not report valid value', () => {
    validation.by(requireRange(3, 5));
    control.it = 4;
    expect(validationResult.ok).toBe(true);
  });
});
