import { InControl } from '../control';
import { inValue } from '../value';
import { intoFirst } from './into-first';

describe('intoFirst', () => {

  let control: InControl<string[]>;

  beforeEach(() => {
    control = inValue(['a', 'b', 'c']);
  });

  describe('without fallback', () => {

    let first: InControl<string | undefined>;

    beforeEach(() => {
      first = control.convert<string | undefined>(intoFirst);
    });

    it('extracts first item', () => {
      expect(first.it).toBe('a');
      expect(control.it).toEqual(['a', 'b', 'c']);
    });
    it('extracts `undefined` from empty array', () => {
      control.it = [];
      expect(first.it).toBeUndefined();
      expect(control.it).toHaveLength(0);
    });
    it('converts item back to single-valued array', () => {
      first.it = 'z';
      expect(first.it).toBe('z');
      expect(control.it).toEqual(['z']);
    });
    it('converts `undefined` back to empty array', () => {
      first.it = undefined;
      expect(first.it).toBeUndefined();
      expect(control.it).toHaveLength(0);
    });
    it('creates converter', () => {
      first = control.convert(intoFirst());
      control.it = ['z', 'x'];
      expect(first.it).toBe('z');
    });
  });

  describe('with fallback', () => {

    let first: InControl<string>;

    beforeEach(() => {
      first = control.convert(intoFirst('*'));
    });

    it('extracts first item', () => {
      expect(first.it).toBe('a');
      expect(control.it).toEqual(['a', 'b', 'c']);
    });
    it('extracts fallback value from empty array', () => {
      control.it = [];
      expect(first.it).toBe('*');
      expect(control.it).toHaveLength(0);
    });
    it('converts item back to single-valued array', () => {
      first.it = 'z';
      expect(first.it).toBe('z');
      expect(control.it).toEqual(['z']);
    });
  });
});
