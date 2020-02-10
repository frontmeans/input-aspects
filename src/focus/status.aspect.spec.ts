import { afterSupplied, EventSupply } from 'fun-events';
import { InGroup, inGroup } from '../container';
import { inValue } from '../controls';
import { intoInteger } from '../conversion';
import { inText } from '../element';
import { InElement } from '../element.control';
import { InStatus } from './status.aspect';

describe('InStatus', () => {

  let element: HTMLInputElement;
  let control: InElement<string>;
  let controlSupply: EventSupply;
  let status: InStatus;
  let flags: InStatus.Flags;

  beforeEach(() => {
    element = document.body.appendChild(document.createElement('input'));
    control = inText(element);
    status = control.aspect(InStatus);
    controlSupply = status.read(f => flags = f);
  });
  afterEach(() => {
    element.remove();
  });

  let group: InGroup<{ element: string }>;
  let groupSupply: EventSupply;
  let groupStatus: InStatus;
  let groupFlags: InStatus.Flags;

  beforeEach(() => {
    group = inGroup({ element: '' })
        .setup(({ controls }) => controls.set('element', control));
    groupStatus = group.aspect(InStatus);
    groupSupply = groupStatus.read(f => groupFlags = f);
  });

  describe('for empty group', () => {
    it('has default flags initially', () => {
      group = inGroup({ element: '' });
      group.aspect(InStatus).read(flags => groupFlags = flags);
      expect(groupFlags).toEqual({ hasFocus: false, touched: false, edited: false });
    });
    it('has default flags when last element removed', () => {
      group.controls.remove('element');
      expect(groupFlags).toEqual({ hasFocus: false, touched: false, edited: false });
    });
  });

  it('is reused by converted control with the same value', () => {

    const converted = control.convert();

    expect(converted.aspect(InStatus)).toBe(status);
  });
  it('is not reused by converted control with another value', () => {

    const converted = control.convert(intoInteger);

    expect(converted.aspect(InStatus)).not.toBe(status);
  });

  describe('read', () => {
    it('sends default flags when element is absent', () => {

      const value = inValue('some');
      const receiver = jest.fn();

      value.aspect(InStatus).read(receiver);

      expect(receiver).toHaveBeenCalledWith({ hasFocus: false, touched: false, edited: false });
    });
    it('sends default flags initially', () => {
      expect(flags).toEqual({ hasFocus: false, touched: false, edited: false });
      expect(groupFlags).toEqual({ hasFocus: false, touched: false, edited: false });
    });
    it('sets `hasFocus` and `touched` when element gains focus', () => {
      element.focus();
      expect(flags).toEqual({ hasFocus: true, touched: true, edited: false });
      expect(groupFlags).toEqual({ hasFocus: true, touched: true, edited: false });
    });
    it('resets `hasFocus`, but not `touched` when element loses focus', () => {
      element.focus();
      element.blur();
      expect(flags).toEqual({ hasFocus: false, touched: true, edited: false });
      expect(groupFlags).toEqual({ hasFocus: false, touched: true, edited: false });
    });
    it('sets `edited` and `touched` on input', () => {
      edit(false);
      expect(flags).toEqual({ hasFocus: true, touched: true, edited: true });
      expect(groupFlags).toEqual({ hasFocus: true, touched: true, edited: true });
    });
    it('resets `hasFocus` when losing focus after edit', () => {
      edit();

      expect(flags).toEqual({ hasFocus: false, touched: true, edited: true });
      expect(groupFlags).toEqual({ hasFocus: false, touched: true, edited: true });
    });
    it('is cut off once control input cut off', () => {

      const done = jest.fn();
      const reason = 'some reason';

      controlSupply.whenOff(done);
      control.done(reason);

      expect(done).toHaveBeenCalledWith(reason);
    });
    it('is cut off once group input cut off', () => {

      const done = jest.fn();
      const reason = 'some reason';

      groupSupply.whenOff(done);
      group.done(reason);

      expect(done).toHaveBeenCalledWith(reason);
    });
  });

  describe('markTouched', () => {
    it('sets `touched`', () => {
      status.markTouched(true);
      expect(flags).toEqual({ hasFocus: false, touched: true, edited: false });
      expect(groupFlags).toEqual({ hasFocus: false, touched: true, edited: false });
    });
    it('sets `touched` on nested controls', () => {
      groupStatus.markTouched(true);
      expect(flags).toEqual({ hasFocus: false, touched: true, edited: false });
      expect(groupFlags).toEqual({ hasFocus: false, touched: true, edited: false });
    });
    it('does not set `touched` if already set', () => {
      element.focus();
      element.blur();

      const receiver = jest.fn();

      status.read(receiver);
      expect(receiver).toHaveBeenCalledWith({ hasFocus: false, touched: true, edited: false });
      receiver.mockClear();

      status.markTouched();
      expect(flags).toEqual({ hasFocus: false, touched: true, edited: false });
      expect(groupFlags).toEqual({ hasFocus: false, touched: true, edited: false });
      expect(receiver).not.toHaveBeenCalled();
    });
    it('resets `touched` and `edited`', () => {
      edit();
      status.markTouched(false);
      expect(flags).toEqual({ hasFocus: false, touched: false, edited: false });
      expect(groupFlags).toEqual({ hasFocus: false, touched: false, edited: false });
    });
    it('resets `touched` and `edited` on nested controls', () => {
      edit();
      groupStatus.markTouched(false);
      expect(flags).toEqual({ hasFocus: false, touched: false, edited: false });
      expect(groupFlags).toEqual({ hasFocus: false, touched: false, edited: false });
    });
    it('does not reset `touched`, but resets `edited` when still has focus', () => {
      edit(false);
      status.markTouched(false);
      expect(flags).toEqual({ hasFocus: true, touched: true, edited: false });
    });
    it('does not reset `touched` if not set', () => {

      const receiver = jest.fn();

      status.read(receiver);
      expect(receiver).toHaveBeenCalledWith({ hasFocus: false, touched: false, edited: false });
      receiver.mockClear();

      status.markTouched(false);
      expect(flags).toEqual({ hasFocus: false, touched: false, edited: false });
      expect(receiver).not.toHaveBeenCalled();
    });
  });

  describe('markEdited', () => {
    it('sets `edited` and `touched`', () => {
      status.markEdited();
      expect(flags).toEqual({ hasFocus: false, touched: true, edited: true });
      expect(groupFlags).toEqual({ hasFocus: false, touched: true, edited: true });
    });
    it('sets `edited` and `touched` on nested controls', () => {
      groupStatus.markEdited();
      expect(groupFlags).toEqual({ hasFocus: false, touched: true, edited: true });
    });
    it('does not set `edited` if already set ', () => {
      edit();

      const receiver = jest.fn();

      status.read(receiver);
      expect(receiver).toHaveBeenCalledWith({ hasFocus: false, touched: true, edited: true });
      receiver.mockClear();

      status.markEdited();
      expect(flags).toEqual({ hasFocus: false, touched: true, edited: true });
      expect(groupFlags).toEqual({ hasFocus: false, touched: true, edited: true });
      expect(receiver).not.toHaveBeenCalled();
    });
    it('resets `edited`, but not `touched`', () => {
      edit();
      status.markEdited(false);
      expect(flags).toEqual({ hasFocus: false, touched: true, edited: false });
      expect(groupFlags).toEqual({ hasFocus: false, touched: true, edited: false });
    });
    it('resets `edited`, but not `touched` on nested controls', () => {
      edit();
      groupStatus.markEdited(false);
      expect(flags).toEqual({ hasFocus: false, touched: true, edited: false });
      expect(groupFlags).toEqual({ hasFocus: false, touched: true, edited: false });
    });
    it('does not reset `edited` if not set', () => {

      const receiver = jest.fn();

      status.read(receiver);
      expect(receiver).toHaveBeenCalledWith({ hasFocus: false, touched: false, edited: false });
      receiver.mockClear();

      status.markEdited(false);
      expect(flags).toEqual({ hasFocus: false, touched: false, edited: false });
      expect(groupFlags).toEqual({ hasFocus: false, touched: false, edited: false });
      expect(receiver).not.toHaveBeenCalled();
    });
  });

  describe('[AfterEvent__symbol]', () => {
    it('is an alias of `read`', () => {
      expect(afterSupplied(status)).toBe(status.read);
    });
  });

  function edit(blur = true): void {
    element.focus();
    element.value = 'other';
    element.dispatchEvent(new Event('input'));
    if (blur) {
      element.blur();
    }
  }
});
