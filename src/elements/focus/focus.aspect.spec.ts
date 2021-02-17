import { InControl } from '../../control';
import { intoInteger } from '../../conversion';
import { inValue } from '../../value.control';
import { inText } from '../text.control';
import { InFocus } from './focus.aspect';

describe('InFocus', () => {

  let element: HTMLInputElement;
  let control: InControl<string>;

  beforeEach(() => {
    element = document.body.appendChild(document.createElement('input'));
    control = inText(element);
  });
  afterEach(() => {
    element.remove();
  });

  it('is `null` for non-element control', () => {
    expect(inValue('').aspect(InFocus)).toBeNull();
  });
  it('is defined for element', () => {
    expect(control.aspect(InFocus)).toBeDefined();
  });
  it('has no focus initially', () => {

    const focus = control.aspect(InFocus)!;

    let hasFocus: boolean | null = null;

    expect(focus.it).toBe(false);
    focus.read(f => hasFocus = f);
    expect(hasFocus).toBe(false);
  });
  it('has focus initially if element is active', () => {
    element.focus();

    const focus = control.aspect(InFocus)!;
    let hasFocus: boolean | null = null;

    expect(focus.it).toBe(true);
    focus.read(f => hasFocus = f);
    expect(hasFocus).toBe(true);
  });
  it('has focus initially if element is active and `getRootNode()` is not implemented', () => {
    element.focus();
    (element as any).getRootNode = undefined;

    const focus = control.aspect(InFocus)!;
    let hasFocus: boolean | null = null;

    expect(focus.it).toBe(true);
    focus.read(f => hasFocus = f);
    expect(hasFocus).toBe(true);
  });

  describe('on', () => {

    let focus: InFocus;

    beforeEach(() => {
      focus = control.aspect(InFocus)!;
    });

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

    let focus: InFocus;

    beforeEach(() => {
      focus = control.aspect(InFocus)!;
    });

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

    let focus: InFocus;

    beforeEach(() => {
      focus = control.aspect(InFocus)!;
    });

    it('reuses aspect instance', () => {

      const converted = control.convert();

      expect(converted.aspect(InFocus)).toBe(focus);
    });
    it('does not convert to control with another value', () => {

      const converted = control.convert(intoInteger());

      expect(converted.aspect(InFocus)).toBeNull();
    });
  });

  describe('done', () => {

    let focus: InFocus;

    beforeEach(() => {
      focus = control.aspect(InFocus)!;
    });

    it('stops sending events', () => {

      const receiver = jest.fn();
      const done = jest.fn();

      focus.read(receiver).whenOff(done);
      receiver.mockClear();

      const reason = 'some reason';

      focus.supply.off(reason);
      expect(done).toHaveBeenCalledWith(reason);
    });
    it('stops sending events when input cut off', () => {

      const receiver = jest.fn();
      const done = jest.fn();

      focus.read(receiver).whenOff(done);
      receiver.mockClear();

      const reason = 'some reason';

      control.supply.off(reason);
      expect(done).toHaveBeenCalledWith(reason);
    });
  });
});
