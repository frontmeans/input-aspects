import { InSupply } from './supply.aspect';
import { inValue } from './value';

describe('InSupply', () => {
  describe('converted', () => {
    it('depends on original one', () => {

      const control = inValue('test');
      const converted = control.convert();
      const reason = 'test';
      const whenDone = jest.fn();

      control.done(reason);
      converted.whenDone(whenDone);
      expect(whenDone).toHaveBeenCalledWith(reason);
    });
  });

  describe('original', () => {
    it('does not depends on converted one', () => {

      const control = inValue('test');
      const converted = control.convert();

      converted.done();
      expect(control.aspect(InSupply).isOff).toBe(false);
    });
  });
});
