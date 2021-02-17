import { newNamespaceAliaser } from '@frontmeans/namespace-aliaser';
import { Supply } from '@proc7ts/primitives';
import { knownInAspect } from '../applied-aspect';
import { InAspect, InAspect__symbol } from '../aspect';
import { InNamespaceAliaser } from '../aspects';
import { intoInteger } from '../conversion';
import { InElement } from '../element.control';
import { inValue } from '../value.control';
import { InText, inText } from './text.control';
import Mock = jest.Mock;

describe('InText', () => {

  let input: HTMLInputElement;
  let control: InText;

  beforeEach(() => {
    input = document.createElement('input');
    input.value = 'old';
    control = inText(input);
  });

  it('accepts default aspects', () => {

    const nsAlias = newNamespaceAliaser();

    control = inText(input, { aspects: InNamespaceAliaser.to(nsAlias) });
    expect(control.aspect(InNamespaceAliaser)).toBe(nsAlias);
  });

  describe('element', () => {
    it('contains input element', () => {
      expect(control.element).toBe(input);
    });
  });

  describe('aspect', () => {
    it('is available as aspect of itself', () => {
      expect(control.aspect(InElement)).toBe(control);
    });
    it('is available as aspect of converted control with the same value', () => {

      const converted = control.convert();

      expect(converted.aspect(InElement)).toBe(control);
    });
    it('is not available as aspect of converted control with another value', () => {

      const converted = control.convert(intoInteger());

      expect(converted.aspect(InElement)).toBeNull();
    });
    it('is not available as aspect of non-element control', () => {
      expect(inValue('some').aspect(InElement)).toBeNull();
    });
    it('is not available as aspect of converted non-element control', () => {
      expect(inValue('some').convert().aspect(InElement)).toBeNull();
    });
    it('retrieves arbitrary aspect', () => {

      const aspect: InAspect.Key<string, any> & InAspect<string, any> = {
        get [InAspect__symbol]() {
          return this;
        },
        applyTo() {
          return knownInAspect('abc');
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
    let changesSupply: Supply;
    let inputReceiver: Mock;
    let inputSupply: Supply;

    beforeEach(() => {
      changesSupply = control.on(changesReceiver = jest.fn());
      inputSupply = control.input(inputReceiver = jest.fn());
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

      changesSupply.whenOff(changesDone);
      inputSupply.whenOff(inputDone);
      control.supply.off('some');
      expect(changesDone).toHaveBeenCalledWith('some');
      expect(inputDone).toHaveBeenCalledWith('some');

      input.value = 'new';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      expect(changesReceiver).not.toHaveBeenCalled();
      expect(inputReceiver).not.toHaveBeenCalled();
    });
  });
});
