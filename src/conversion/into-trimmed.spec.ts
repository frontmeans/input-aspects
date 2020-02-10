import { InControl } from '../control';
import { inValue } from '../controls';
import { intoTrimmed } from './into-trimmed';

describe('intoTrimmed', () => {

  let control: InControl<string>;
  let trimmed: InControl<string>;

  beforeEach(() => {
    control = inValue('');
    trimmed = control.convert(intoTrimmed);
  });

  it('trims original value', () => {
    control.it = ' abc  ';
    expect(trimmed.it).toBe('abc');
  });
  it('trims converted value', () => {
    trimmed.it = ' abc  ';
    expect(trimmed.it).toBe('abc');
    expect(control.it).toBe('abc');
  });
  it('creates converter', () => {
    trimmed = control.convert(intoTrimmed());
    control.it = ' abc  ';
    expect(trimmed.it).toBe('abc');
  });
});
