import { InControl } from '../control';
import { InValue } from '../value';
import { requirePresent } from './require-present.validator';
import { InValidation } from './validation.aspect';

describe('requirePresent', () => {

  let control: InControl<string>;
  let validation: InValidation<string>;

  beforeEach(() => {
    control = new InValue('');
    validation = control.aspect(InValidation);
    validation.by(requirePresent);
  });

  let validationResult: InValidation.Result;

  beforeEach(() => {
    validation.read(result => validationResult = result);
  });

  it('reports missing value', () => {
    expect([...validationResult]).toEqual([{ missing: 'missing' }]);
  });
  it('does not report when value is present', () => {
    control.it = ' ';
    expect(validationResult.ok).toBe(true);
  });
  it('creates validator', () => {
    control = new InValue('');
    validation = control.aspect(InValidation);
    validation.by(requirePresent());
    validation.read(result => validationResult = result);

    control.it = '';
    expect(validationResult.ok).toBe(false);
    control.it = ' ';
    expect(validationResult.ok).toBe(true);
  });
});
