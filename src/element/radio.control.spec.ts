import { InMode } from '../submit';
import { InRadio, inRadio } from './radio.control';

describe('InRadio', () => {

  let radio: HTMLInputElement;

  beforeEach(() => {
    radio = document.createElement('input');
    radio.type = 'radio';
  });

  describe('default', () => {

    let control: InRadio;
    let mode: InMode.Value;

    beforeEach(() => {
      control = inRadio(radio);
      control.aspect(InMode).read(value => mode = value);
    });

    describe('element', () => {
      it('contains input element', () => {
        expect(control.element).toBe(radio);
      });
    });

    describe('it', () => {
      it('reflects unchecked value', () => {
        expect(control.it).toBeUndefined();
        expect(mode).toBe('-on');
      });
      it('reflects checked value', () => {
        radio.checked = true;
        radio.dispatchEvent(new KeyboardEvent('input'));
        expect(control.it).toBe(true);
        expect(mode).toBe('on');
      });
      it('checks radio when set to `true`', () => {
        control.it = true;
        expect(radio.checked).toBe(true);
        expect(mode).toBe('on');
      });
      it('un-checks radio when set to `undefined`', () => {
        control.it = true;
        radio.dispatchEvent(new KeyboardEvent('input'));
        control.it = undefined;
        radio.dispatchEvent(new KeyboardEvent('input'));
        expect(radio.checked).toBe(false);
        expect(mode).toBe('-on');
      });
    });
  });

  describe('customized', () => {

    let control: InRadio<'+'>;
    let mode: InMode.Value;

    beforeEach(() => {
      control = inRadio(radio, { checked: '+' });
      control.aspect(InMode).read(value => mode = value);
    });

    describe('element', () => {
      it('contains input element', () => {
        expect(control.element).toBe(radio);
      });
    });

    describe('it', () => {
      it('reflects unchecked value', () => {
        expect(control.it).toBeUndefined();
        expect(mode).toBe('-on');
      });
      it('reflects checked value', () => {
        radio.checked = true;
        radio.dispatchEvent(new KeyboardEvent('input'));
        expect(control.it).toBe('+');
        expect(mode).toBe('on');
      });
      it('checks radio when set to checked', () => {
        control.it = '+';
        expect(radio.checked).toBe(true);
        expect(mode).toBe('on');
      });
      it('un-checks radio when set to `undefined`', () => {
        control.it = '+';
        radio.dispatchEvent(new KeyboardEvent('input'));
        control.it = undefined;
        radio.dispatchEvent(new KeyboardEvent('input'));
        expect(radio.checked).toBe(false);
        expect(mode).toBe('-on');
      });
      it('un-checks radio when set to invalid value', () => {
        control.it = '+';
        radio.dispatchEvent(new KeyboardEvent('input'));
        control.it = '-' as any;
        radio.dispatchEvent(new KeyboardEvent('input'));
        expect(control.it).toBeUndefined();
        expect(radio.checked).toBe(false);
        expect(mode).toBe('-on');
      });
    });
  });
});
