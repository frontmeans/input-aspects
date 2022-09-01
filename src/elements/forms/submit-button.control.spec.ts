import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { afterThe } from '@proc7ts/fun-events';
import { asis, noop } from '@proc7ts/primitives';
import { InControl } from '../../control';
import { InMode } from '../../data';
import { InSubmit, InSubmitRejectedError } from '../../submit.aspect';
import { inValue } from '../../value.control';
import { inSubmitButton, InSubmitButton } from './submit-button.control';

describe('InSubmitButton', () => {
  let element: HTMLButtonElement;
  let form: InControl<string>;
  let control: InSubmitButton<HTMLButtonElement>;

  beforeEach(() => {
    element = document.createElement('button');
    form = inValue('form');
    control = inSubmitButton(element, { form });
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

    it('is disabled while submitting', async () => {
      let resolve: () => void = noop;
      const submitter = new Promise<void>(r => (resolve = r));
      const promise = form.aspect(InSubmit).submit(() => submitter);

      expect(mode).toBe('off');

      resolve();
      await promise;
      expect(mode).toBe('on');
    });
    it('is enabled if submit is not ready, but not submitted yet', () => {
      form.aspect(InMode).derive(afterThe('off'));

      expect(mode).toBe('on');
    });
    it('is disabled on submit if the form is not ready', async () => {
      form.aspect(InMode).derive(afterThe('off'));

      let resolve: () => void = noop;
      const submitter = new Promise<void>(r => (resolve = r));
      const promise = form.aspect(InSubmit).submit(() => submitter);

      expect(mode).toBe('off');

      resolve();

      const error = await promise.catch(asis);

      expect(error).toBeInstanceOf(InSubmitRejectedError);
      expect(mode).toBe('off');
    });
  });
});
