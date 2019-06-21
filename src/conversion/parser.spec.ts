import { InControl } from '../control';
import { InValue } from '../value';
import { intoParsedBy } from './parser';

describe('intoParsedBy', () => {

  let textControl: InControl<string>;
  let parsedControl: InControl<number>;

  beforeEach(() => {
    textControl = new InValue('old');
    parsedControl = textControl.convert(intoParsedBy(text => text.length, value => '*'.repeat(value)));
  });

  it('parses value', () => {
    expect(parsedControl.it).toBe(3);
    textControl.it = 'other';
    expect(parsedControl.it).toBe(5);
  });
  it('formats value', () => {
    parsedControl.it = 4;
    expect(textControl.it).toBe('****');
  });
  it('formats value when formatter omitted', () => {
    parsedControl = textControl.convert(intoParsedBy(text => text.length));
    parsedControl.it = 13;
    expect(textControl.it).toBe('13');
  });
});
