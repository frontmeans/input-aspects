import { InData } from '../submit';
import { InElement } from '../element.control';
import { inRadio } from './radio';

describe('inRadio', () => {

  let radio: HTMLInputElement;
  let control: InElement<boolean>;
  let data: boolean | undefined;

  beforeEach(() => {
    radio = document.createElement('input');
    radio.type = 'radio';
    control = inRadio(radio);
    control.aspect(InData)(d => data = d);
  });

  describe('element.control.ts', () => {
    it('contains input element', () => {
      expect(control.element).toBe(radio);
    });
  });

  describe('it', () => {
    it('reflects unchecked value', () => {
      expect(control.it).toBe(false);
      expect(data).toBeUndefined();
    });
    it('reflects checked value', () => {
      radio.checked = true;
      radio.dispatchEvent(new KeyboardEvent('input'));
      expect(control.it).toBe(true);
      expect(data).toBe(true);
    });
    it('checks radio when set to `true`', () => {
      control.it = true;
      expect(radio.checked).toBe(true);
      expect(data).toBe(true);
    });
    it('un-checks radio when set to `false`', () => {
      control.it = true;
      radio.dispatchEvent(new KeyboardEvent('input'));
      control.it = false;
      radio.dispatchEvent(new KeyboardEvent('input'));
      expect(radio.checked).toBe(false);
      expect(data).toBeUndefined();
    });
  });
});
