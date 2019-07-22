import { inText } from '../element';
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
});
