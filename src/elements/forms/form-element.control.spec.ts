import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { noop } from '@proc7ts/primitives';
import { InControl } from '../../control';
import { InMode } from '../../data';
import { InSubmit } from '../../submit.aspect';
import { inValue } from '../../value.control';
import { inFormElement, InFormElement } from './form-element.control';

describe('inFromElement', () => {
  let element: HTMLFormElement;
  let form: InControl<string>;
  let control: InFormElement<HTMLFormElement>;

  beforeEach(() => {
    element = document.createElement('form');
    form = inValue('form');
    control = inFormElement(element, { form });
  });

  it('depends on form', () => {
    const reason = 'test reason';

    form.supply.off(reason);

    const whenDone = jest.fn();

    control.supply.whenOff(whenDone);
    expect(whenDone).toHaveBeenCalledWith(reason);
  });

  describe('mode', () => {
    let mode: InMode.Value;

    beforeEach(() => {
      control.aspect(InMode).read(m => (mode = m));
    });

    it('reflects form submit status', async () => {
      let resolve: () => void = noop;
      const submitter = new Promise<void>(r => (resolve = r));
      const promise = form.aspect(InSubmit).submit(() => submitter);

      expect(mode).toBe('ro');

      resolve();
      await promise;
      expect(mode).toBe('on');
    });
  });
});
