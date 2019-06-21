import { InControl } from '../control';
import { InValue } from '../value';
import { requirePresent } from './require-present.validator';
import { InValidation } from './validation.aspect';
import Mock = jest.Mock;

describe('requirePresent', () => {

  let control: InControl<string>;
  let validation: InValidation<string>;

  beforeEach(() => {
    control = new InValue('');
    validation = control.aspect(InValidation);
    validation.by(requirePresent);
  });

  let receiver: Mock<void, [InValidation.Result]>;

  beforeEach(() => {
    validation.read(receiver = jest.fn());
  });

  it('reports missing value', () => {
    expect([...lastResult()]).toEqual([{ missing: 'missing' }]);
  });
  it('does not report when value is present', () => {
    control.it = ' ';
    expect(lastResult().ok).toBe(true);
  });

  function lastResult(): InValidation.Result {
    expect(receiver).toHaveBeenCalled();

    const calls = receiver.mock.calls;

    return calls[calls.length - 1][0];
  }
});
