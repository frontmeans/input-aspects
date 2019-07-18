import { inCheckbox } from './checkbox';
import { InElement } from '../element.control';

describe('inCheckbox', () => {

  let checkbox: HTMLInputElement & { intermediate?: boolean };
  let control: InElement<boolean | null>;

  beforeEach(() => {
    checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    control = inCheckbox(checkbox);
  });

  describe('element.control.ts', () => {
    it('contains input element', () => {
      expect(control.element).toBe(checkbox);
    });
  });

  describe('it', () => {
    it('reflects unchecked value', () => {
      expect(control.it).toBe(false);
    });
    it('reflects checked value', () => {
      checkbox.checked = true;
      expect(control.it).toBe(true);
    });
    it('reflects intermediate value', () => {
      checkbox.intermediate = true;
      expect(control.it).toBe(null);
    });
    it('checks checkbox when set to `true`', () => {
      control.it = true;
      expect(checkbox.checked).toBe(true);
      expect(checkbox.intermediate).toBe(false);
    });
    it('un-checks checkbox when set to `false`', () => {
      control.it = true;
      control.it = false;
      expect(checkbox.checked).toBe(false);
      expect(checkbox.intermediate).toBe(false);
    });
    it('makes checkbox state intermediate when set to `null`', () => {
      control.it = null;
      expect(checkbox.checked).toBe(false);
      expect(checkbox.intermediate).toBe(true);
    });
  });
});
