import { eventSupplyOf } from '@proc7ts/fun-events';
import { InControl } from '../control';
import { inValueOf } from './value-of.control';
import { inValue } from './value.control';

describe('inValueOf', () => {

  let original: InControl<string>;
  let control: InControl<string>;

  beforeEach(() => {
    original = inValue('test');
    control = inValueOf(original);
  });

  describe('it', () => {
    it('has original value', () => {
      expect(control.it).toBe('test');
    });
    it('updates original value', () => {
      control.it = 'other';
      expect(original.it).toBe('other');
    });
  });

  describe('on', () => {
    it('sends updates', () => {

      const receiver = jest.fn();

      control.on(receiver);
      original.it = 'other';
      expect(receiver).toHaveBeenCalledWith('other', 'test');
      expect(receiver).toHaveBeenCalledTimes(1);
    });
  });

  describe('[OnEvent__symbol]', () => {
    it('depends on original one', () => {

      const whenOff = jest.fn();

      eventSupplyOf(control).whenOff(whenOff);

      const reason = 'test reason';

      original.done(reason);
      expect(whenOff).toHaveBeenCalledWith(reason);
    });
    it('is not a dependency of original one', () => {
      control.done();

      expect(eventSupplyOf(control).isOff).toBe(true);
      expect(eventSupplyOf(original).isOff).toBe(false);
    });
  });
});
