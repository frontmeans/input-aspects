import { InControl } from '../control';
import { inText, InText } from '../element';
import { InElement } from '../element.control';
import { intoWrapper } from './into-wrapper';
import { InStyledElement } from './styled-element.aspect';

describe('intoWrapper', () => {

  let input: HTMLInputElement;
  let control: InText;
  let wrapper: HTMLElement;
  let wrapperControl: InControl<string>;

  beforeEach(() => {
    input = document.createElement('input');
    control = inText(input);
    wrapper = document.createElement('div');
    wrapperControl = control.convert(intoWrapper(wrapper));
  });

  it('converts to element with the same value', () => {
    expect(wrapperControl.it).toBe(control.it);
    wrapperControl.it = 'other';
    expect(control.it).toBe(wrapperControl.it);
  });
  it('converts to element with another styled element', () => {
    expect(wrapperControl.aspect(InStyledElement)).toBe(wrapper);
    expect(wrapperControl.aspect(InStyledElement)).not.toBe(input);
  });
  it('preserves input element', () => {
    expect(wrapperControl.aspect(InElement)).toBe(control.aspect(InElement));
  });
  it('converts to element without styled element without parameter', () => {

    const noWrapControl = wrapperControl.convert(intoWrapper());

    expect(noWrapControl.aspect(InStyledElement)).toBeNull();
  });
  it('converts to element without styled element when used as converter', () => {

    const noWrapControl = wrapperControl.convert(intoWrapper);

    expect(noWrapControl.aspect(InStyledElement)).toBeNull();
  });
});
