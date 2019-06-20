import { asis } from 'call-thru';
import { EventInterest } from 'fun-events';
import { InAspect__symbol } from './aspect';
import { inAspectValue } from './aspect.impl';
import { InElement } from './element';
import { inElt } from './element.control';
import { InValue } from './value';
import Mock = jest.Mock;

describe('InElement', () => {

  let input: HTMLInputElement;
  let inElement: InElement;

  beforeEach(() => {
    input = document.createElement('input');
    input.value = 'old';
    inElement = inElt(input);
  });

  describe('element', () => {
    it('contains input element', () => {
      expect(inElement.element).toBe(input);
    });
  });

  describe('aspect', () => {
    it('is available as aspect of itself', () => {
      expect(inElement.aspect(InElement)).toBe(inElement);
    });
    it('is available as aspect of converted control', () => {

      const converted = inElement.convert(asis, asis);

      expect(converted.aspect(InElement)).toBe(inElement);
    });
    it('is not available as aspect of non-element control', () => {

      const control = new InValue('some');

      expect(control.aspect(InElement)).toBeNull();
    });
    it('is not available as aspect of converted non-element control', () => {

      const control = new InValue('some');
      const converted = control.convert(asis, asis);

      expect(converted.aspect(InElement)).toBeNull();
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

      expect(inElement.aspect(aspect)).toBe('abc');
    });
  });

  describe('it', () => {
    it('reflects input value', () => {
      expect(inElement.it).toBe('old');
    });
    it('reflects input value changes', () => {
      input.value = 'new';
      expect(inElement.it).toBe('new');
    });
    it('updates input value', () => {
      inElement.it = 'new';
      expect(input.value).toBe('new');
    });
  });

  describe('events', () => {

    let receiver: Mock;
    let interest: EventInterest;

    beforeEach(() => {
      interest = inElement.on(receiver = jest.fn());
    });

    it('sends update on input event', () => {
      input.value = 'new';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(receiver).toHaveBeenCalledWith('new', 'old');
    });
    it('sends update on change event', () => {
      input.value = 'new';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      expect(receiver).toHaveBeenCalledWith('new', 'old');
    });
    it('does not send update for unchanged value', () => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(receiver).not.toHaveBeenCalled();
    });
    it('sends update on value change', () => {
      inElement.it = 'new';
      expect(receiver).toHaveBeenCalledWith('new', 'old');
    });
    it('does not send update on unchanged value', () => {
      inElement.it = 'old';
      expect(receiver).not.toHaveBeenCalled();
    });
    it('stops sending updates when done', () => {

      const done = jest.fn();

      interest.whenDone(done);
      inElement.done('some');
      expect(done).toHaveBeenCalledWith('some');

      input.value = 'new';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      expect(receiver).not.toHaveBeenCalled();
    });
  });
});
