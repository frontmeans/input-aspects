import { asis } from 'call-thru';
import { InControl } from '../control';
import { inElt } from '../element';
import { InValue } from '../value';
import { InFocus } from './focus.aspect';

describe('InFocus', () => {

  let element: HTMLInputElement;
  let control: InControl;
  let focus: InFocus;

  beforeEach(() => {
    element = document.body.appendChild(document.createElement('input'));
    control = inElt(element);
    focus = control.aspect(InFocus)!;
  });
  afterEach(() => {
    element.remove();
  });

  it('is `null` when element is absent', () => {
    expect(new InValue('').aspect(InFocus)).toBeNull();
  });
  it('is present for element', () => {
    expect(focus).toBeDefined();
  });
  it('has no focus initially', () => {

    let hasFocus: boolean | null = null;

    focus(f => hasFocus = f);
    expect(hasFocus).toBe(false);
  });
  it('has focus initially if element is active', () => {
    element.focus();

    let hasFocus: boolean | null = null;

    focus(f => hasFocus = f);
    expect(hasFocus).toBe(true);
  });
  it('has focus initially if element is active and `getRootNode()` is not implemented', () => {
    element.focus();
    (element as any).getRootNode = undefined;

    let hasFocus: boolean | null = null;

    focus(f => hasFocus = f);
    expect(hasFocus).toBe(true);
  });
  it('reflects focus gain and loss', () => {

    let hasFocus: boolean | null = null;

    focus(f => hasFocus = f);
    element.focus();
    expect(hasFocus).toBe(true);
    element.blur();
    expect(hasFocus).toBe(false);
  });

  describe('convert', () => {
    it('reuses aspect instance', () => {

      const converted = control.convert(asis, asis);

      expect(converted.aspect(InFocus)).toBe(focus);
    });
  });
});
