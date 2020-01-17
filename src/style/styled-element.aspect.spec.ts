import { InControl } from '../control';
import { InText, inText } from '../element';
import { InElement } from '../element.control';
import { inValue } from '../value';
import { InStyledElement } from './styled-element.aspect';

describe('InStyledElement', () => {
  it('is HTML element for input element control', () => {

    const element = document.createElement('input');

    expect(inText(element).aspect(InStyledElement)).toBe(element);
  });
  it('is `null` by default', () => {
    expect(inValue(1).aspect(InStyledElement)).toBeNull();
  });

  describe('to', () => {

    let input: HTMLInputElement;
    let control: InText;
    let styled: HTMLElement;
    let converted: InControl<string>;

    beforeEach(() => {
      input = document.createElement('input');
      control = inText(input);
      styled = document.createElement('div');
      converted = control.convert(InStyledElement.to(styled));
    });

    it('converts to element with the same value', () => {
      expect(converted.it).toBe(control.it);
      converted.it = 'other';
      expect(control.it).toBe(converted.it);
    });
    it('converts to element with another styled element', () => {
      expect(converted.aspect(InStyledElement)).toBe(styled);
      expect(converted.aspect(InStyledElement)).not.toBe(input);
    });
    it('preserves other aspects element', () => {
      expect(converted.aspect(InElement)).toBe(control.aspect(InElement));
    });
    it('converts to element without styled element without parameter', () => {

      const noWrapControl = converted.convert(InStyledElement.to());

      expect(noWrapControl.aspect(InStyledElement)).toBeNull();
    });
  });
});
