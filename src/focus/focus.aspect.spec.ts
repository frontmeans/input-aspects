import { asis } from 'call-thru';
import { InControl } from '../control';
import { inText } from '../element';
import { inValue } from '../value';
import { InFocus } from './focus.aspect';

describe('InFocus', () => {

  let element: HTMLInputElement;
  let control: InControl<string>;
  let focus: InFocus;

  beforeEach(() => {
    element = document.body.appendChild(document.createElement('input'));
    control = inText(element);
    focus = control.aspect(InFocus)!;
  });
  afterEach(() => {
    element.remove();
  });

  it('is `null` when element is absent', () => {
    expect(inValue('').aspect(InFocus)).toBeNull();
  });
  it('is present for element', () => {
    expect(focus).toBeDefined();
  });
  it('has no focus initially', () => {

    let hasFocus: boolean | null = null;

    expect(focus.it).toBe(false);
    focus.read(f => hasFocus = f);
    expect(hasFocus).toBe(false);
  });
  it('has focus initially if element is active', () => {
    element.focus();

    let hasFocus: boolean | null = null;

    expect(focus.it).toBe(true);
    focus.read(f => hasFocus = f);
    expect(hasFocus).toBe(true);
  });
  it('has focus initially if element is active and `getRootNode()` is not implemented', () => {
    element.focus();
    (element as any).getRootNode = undefined;

    let hasFocus: boolean | null = null;

    expect(focus.it).toBe(true);
    focus.read(f => hasFocus = f);
    expect(hasFocus).toBe(true);
  });

  describe('on', () => {
    it('sends event on focus gain', () => {

      const receiver = jest.fn();

      focus.on(receiver);
      element.focus();
      expect(receiver).toHaveBeenCalledWith(true, false);
    });
    it('sends event on focus loss', () => {
      element.focus();

      const receiver = jest.fn();

      focus.on(receiver);
      element.blur();
      expect(receiver).toHaveBeenCalledWith(false, true);
    });
  });

  describe('it', () => {
    it('sets focus on element', () => {

      const focusSpy = jest.spyOn(element, 'focus');

      focus.it = true;
      expect(focusSpy).toHaveBeenCalled();
    });
    it('does not set focus on element for the second time', () => {
      element.focus();

      const focusSpy = jest.spyOn(element, 'focus');

      focus.it = true;
      expect(focusSpy).not.toHaveBeenCalled();
    });
    it('removes focus from element', () => {
      element.focus();

      const blurSpy = jest.spyOn(element, 'blur');

      focus.it = false;
      expect(blurSpy).toHaveBeenCalled();
    });
    it('does not remove focus from element for the second time', () => {

      const blurSpy = jest.spyOn(element, 'blur');

      focus.it = false;
      expect(blurSpy).not.toHaveBeenCalled();
    });
  });

  describe('convert', () => {
    it('reuses aspect instance', () => {

      const converted = control.convert(asis, asis);

      expect(converted.aspect(InFocus)).toBe(focus);
    });
  });

  describe('done', () => {
     it('stops sending events', () => {

       const receiver = jest.fn();
       const done = jest.fn();

       focus.read(receiver).whenDone(done);
       receiver.mockClear();

       const reason = 'some reason';

       expect(focus.done(reason)).toBe(focus);
       expect(done).toHaveBeenCalledWith(reason);
     });
  });
});
