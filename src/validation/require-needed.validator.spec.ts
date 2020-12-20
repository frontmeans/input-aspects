import { afterThe, onceOn } from '@proc7ts/fun-events';
import { inValue } from '../controls';
import { requireNeeded } from './require-needed.validator';
import { InValidation } from './validation.aspect';
import { inValidator } from './validator';

describe('requireNeeded', () => {

  let validate: (...messages: InValidation.Message[]) => InValidation.Message[];

  beforeEach(() => {

    const control = inValue('test');

    validate = (...messages) => {

      const validator = inValidator<string>(requireNeeded(afterThe(...messages)));
      let result: InValidation.Message[] = [];

      validator(control).do(onceOn)(
          (...filtered) => result = filtered,
      );

      return result;
    };
  });

  describe('when `missing` message present', () => {
    it('filters out `incomplete` and `invalid` messages', () => {
      expect(
          validate(
              { missing: 1 },
              { incomplete: 2 },
              { invalid: 3 },
              { some: 4 },
          ),
      ).toEqual([
        { missing: 1 },
        { some: 4 },
      ]);
    });
    it('does not filter out `incomplete` or `invalid` messages having `despiteMissing`', () => {
      expect(
          validate(
              { missing: 1 },
              { incomplete: 2, despiteMissing: true },
              { invalid: 3, despiteMissing: true },
              { some: 4 },
          ),
      ).toEqual([
        { missing: 1 },
        { incomplete: 2, despiteMissing: true },
        { invalid: 3, despiteMissing: true },
        { some: 4 },
      ]);
    });
  });

  describe('when `incomplete` message present', () => {
    it('filters out `invalid` messages', () => {
      expect(
          validate(
              { incomplete: 1 },
              { invalid: 2 },
              { some: 3 },
          ),
      ).toEqual([
        { incomplete: 1 },
        { some: 3 },
      ]);
    });
    it('does not filter out `invalid` messages having `despiteIncomplete`', () => {
      expect(
          validate(
              { incomplete: 1 },
              { invalid: 2, despiteIncomplete: true },
              { some: 3 },
          ),
      ).toEqual([
        { incomplete: 1 },
        { invalid: 2, despiteIncomplete: true },
        { some: 3 },
      ]);
    });
  });

  describe('in all other cases', () => {
    it('does not filter out messages', () => {
      expect(
          validate(
              { invalid: 1 },
              { some: 2 },
          ),
      ).toEqual([
        { invalid: 1 },
        { some: 2 },
      ]);
    });
  });
});
