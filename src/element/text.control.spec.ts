import { asis } from 'call-thru';
import { EventInterest } from 'fun-events';
import { InAspect__symbol } from '../aspect';
import { inAspectValue } from '../aspect.impl';
import { inValue } from '../value';
import { InElement } from '../element.control';
import { inText } from './text.control';
import Mock = jest.Mock;

describe('inText', () => {

  let input: HTMLInputElement;
  let control: InElement;

  beforeEach(() => {
    input = document.createElement('input');
    input.value = 'old';
    control = inText(input);
  });

  describe('element.control.ts', () => {
    it('contains input element', () => {
      expect(control.element).toBe(input);
    });
  });

  describe('aspect', () => {
    it('is available as aspect of itself', () => {
      expect(control.aspect(InElement)).toBe(control);
    });
    it('is available as aspect of converted control', () => {

      const converted = control.convert(asis, asis);

      expect(converted.aspect(InElement)).toBe(control);
    });
    it('is not available as aspect of non-element control', () => {
      expect(inValue('some').aspect(InElement)).toBeNull();
    });
    it('is not available as aspect of converted non-element control', () => {
      expect(inValue('some').convert(asis, asis).aspect(InElement)).toBeNull();
    });
    it('retrieves arbitrary aspect', () => {

      const aspect = {
        get [InAspect__symbol]() {
          return this;
        },
        applyTo() {
          return inAspectValue('abc');
        },
      };

      expect(control.aspect(aspect)).toBe('abc');
    });
  });

  describe('it', () => {
    it('reflects input value', () => {
      expect(control.it).toBe('old');
    });
    it('reflects input value changes', () => {
      input.value = 'new';
      expect(control.it).toBe('new');
    });
    it('updates input value', () => {
      control.it = 'new';
      expect(input.value).toBe('new');
    });
  });

  describe('input', () => {

    let changesReceiver: Mock;
    let changesInterest: EventInterest;
    let inputReceiver: Mock;
    let inputInterest: EventInterest;

    beforeEach(() => {
      changesInterest = control.on(changesReceiver = jest.fn());
      inputInterest = control.input(inputReceiver = jest.fn());
    });

    it('sends initial value', () => {
      expect(inputReceiver).toHaveBeenLastCalledWith({ value: 'old' });
    });
    it('sends update on input event', () => {

      const event = new Event('input', { bubbles: true });

      input.value = 'new';
      input.dispatchEvent(event);
      expect(changesReceiver).toHaveBeenLastCalledWith('new', 'old');
      expect(inputReceiver).toHaveBeenLastCalledWith({ value: 'new', event });
    });
    it('sends update on change event', () => {

      const event = new Event('change', { bubbles: true });

      input.value = 'new';
      input.dispatchEvent(event);
      expect(changesReceiver).toHaveBeenLastCalledWith('new', 'old');
      expect(inputReceiver).toHaveBeenLastCalledWith({ value: 'new', event });
    });
    it('does not send update for unchanged value', () => {

      const event = new Event('input', { bubbles: true });

      input.dispatchEvent(event);
      expect(changesReceiver).not.toHaveBeenCalled();
      expect(inputReceiver).toHaveBeenLastCalledWith({ value: 'old', event });
    });
    it('sends update on value change', () => {
      control.it = 'new';
      expect(changesReceiver).toHaveBeenLastCalledWith('new', 'old');
      expect(inputReceiver).toHaveBeenLastCalledWith({ value: 'new' });
    });
    it('does not send update on unchanged value', () => {
      inputReceiver.mockClear();
      control.it = 'old';
      expect(changesReceiver).not.toHaveBeenCalled();
      expect(inputReceiver).not.toHaveBeenCalled();
    });
    it('sends update when value changed by receiver', () => {
      control.on(value => {
        if (!value.endsWith('!')) {
          control.it = value + '!';
        }
      });

      const event = new Event('input', { bubbles: true });

      input.value = 'new';
      input.dispatchEvent(event);
      expect(changesReceiver).toHaveBeenLastCalledWith('new!', 'new');
      expect(inputReceiver).toHaveBeenLastCalledWith({ value: 'new!', event });
    });
    it('stops sending updates when done', () => {
      inputReceiver.mockClear();

      const changesDone = jest.fn();
      const inputDone = jest.fn();

      changesInterest.whenDone(changesDone);
      inputInterest.whenDone(inputDone);
      control.done('some');
      expect(changesDone).toHaveBeenCalledWith('some');
      expect(inputDone).toHaveBeenCalledWith('some');

      input.value = 'new';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      expect(changesReceiver).not.toHaveBeenCalled();
      expect(inputReceiver).not.toHaveBeenCalled();
    });
  });
});
