import { afterSupplied } from '@proc7ts/fun-events';
import { noop, Supply } from '@proc7ts/primitives';
import { InControl } from './control';
import { inValue } from './controls';
import { intoInteger } from './conversion';
import { InMode } from './data';
import { InSubmit, InSubmitError, InSubmitRejectedError } from './submit.aspect';
import { InValidation } from './validation';
import Mock = jest.Mock;

describe('InSubmit', () => {

  let control: InControl<string>;
  let submit: InSubmit<string>;
  let flags: InSubmit.Flags;
  let flagsSupply: Supply;

  beforeEach(() => {
    control = inValue('test');
    submit = control.aspect(InSubmit);
    flagsSupply = submit.read(f => flags = f);
  });

  let validation: InValidation<string>;
  let errors: InValidation.Result;

  beforeEach(() => {
    validation = control.aspect(InValidation);
    validation.read(result => errors = result);
  });

  let submitter: Mock<Promise<string>, [string, InControl<string>]>;

  beforeEach(() => {
    submitter = jest.fn((data, _control) => Promise.resolve(data));
  });

  it('has default flags initially', () => {
    expect(flags).toEqual({ ready: true, submitted: false, busy: false });
  });
  it('is reused by converted control with the same value', () => {

    const converted = control.convert();

    expect(converted.aspect(InSubmit)).toBe(submit);
  });
  it('is not reused by converted control with another value', () => {

    const converted = control.convert(intoInteger);

    expect(converted.aspect(InSubmit)).not.toBe(submit);
  });

  describe('[AfterEvent__symbol]', () => {
    it('is the same as `read`', () => {
      expect(afterSupplied(submit)).toBe(submit.read);
    });
  });

  describe('submit', () => {
    it('returns submit result', async () => {
      submitter.mockImplementation(data => {
        expect(flags).toEqual({ ready: true, submitted: true, busy: true });
        return Promise.resolve(data);
      });

      expect(await submit.submit(submitter)).toEqual('test');
      expect(flags).toEqual({ ready: true, submitted: true, busy: false });
    });
    it('rejects if busy', async () => {

      let resolve: (value: string) => void = noop;

      submitter.mockImplementation(() => {
        expect(flags).toEqual({ ready: true, submitted: true, busy: true });
        return new Promise<string>(r => resolve = r);
      });

      const firstSubmit: Promise<string> = submit.submit(submitter);

      await ensureRejected('busy');
      expect(flags).toEqual({ ready: true, submitted: true, busy: true });

      resolve('result');

      expect(await firstSubmit).toBe('result');
      expect(flags).toEqual({ ready: true, submitted: true, busy: false });
    });
    it('rejects if input cut off', async () => {

      const reason = 'some reason';

      control.supply.off(reason);
      await ensureRejected('noInput');

      const done = jest.fn();

      flagsSupply.whenOff(done);
      expect(done).toHaveBeenCalledWith(reason);
    });
    it('rejects on validation errors', async () => {
      validation.by({ validate() { return { invalid: 'test' }; } });
      await ensureRejected('notReady');
      expect(flags).toEqual({ ready: false, submitted: true, busy: false });
    });
    it('rejects if disabled', async () => {
      control.aspect(InMode).own.it = 'off';
      await ensureRejected('notReady');
      expect(flags).toEqual({ ready: false, submitted: true, busy: false });
    });
    it('reports submit error', async () => {

      const error = { error: 'some error' };

      submitter.mockImplementation(() => {
        throw new InSubmitError(error);
      });

      await submit.submit(submitter).then(
          result => Promise.reject('Result returned: ' + result),
          (err: InSubmitError) => {
            expect(err).toBeInstanceOf(InSubmitError);
            expect([...err.errors.messages('submit')]).toEqual([{ ...error, submit: true }]);
          },
      );

      expect([...errors]).toEqual([{ ...error, submit: true }]);
      expect(flags).toEqual({ ready: true, submitted: true, busy: false });
    });
    it('reports submit failure', async () => {

      const failure = new Error('some error');

      submitter.mockImplementation(() => {
        throw failure;
      });

      await submit.submit(submitter).then(
          result => Promise.reject('Result returned: ' + result),
          err => {
            expect(err).toBe(failure);
          },
      );

      expect([...errors]).toEqual([{ submit: failure }]);
      expect(flags).toEqual({ ready: true, submitted: true, busy: false });
    });
    it('resets submit errors', async () => {
      submitter.mockImplementation(() => {
        throw new Error('');
      });
      await submit.submit(submitter).then(
          result => Promise.reject('Result returned: ' + result),
          noop,
      );

      submitter.mockImplementation(() => {
        expect(errors.ok).toBe(true);
        return Promise.resolve('result');
      });
      expect(await submit.submit(submitter)).toBe('result');
    });

    async function ensureRejected(reason: string): Promise<void> {
      await submit.submit(submitter)
          .then(result => Promise.reject('Result returned: ' + result))
          .catch((err: InSubmitRejectedError) => {
            expect(err).toBeInstanceOf(InSubmitRejectedError);
            expect([...err.errors.messages('submit')]).toEqual([
              {
                submit: 'rejected',
                rejected: reason,
                [reason]: true,
              },
            ]);
          });
    }
  });

  describe('reset', () => {
    it('resets submitted flag', async () => {
      await submit.submit(submitter);
      submit.reset();
      expect(flags).toEqual({ submitted: false, busy: false, ready: true });
    });
    it('does not reset submitted flag if not submitted yet', () => {

      const readFlags = jest.fn();

      submit.read(readFlags);
      submit.reset();

      expect(readFlags).toHaveBeenCalledTimes(1);
    });
    it('clears submit errors', async () => {
      submitter.mockImplementation(() => {
        throw new Error('');
      });
      await submit.submit(submitter).then(
          result => Promise.reject('Result returned: ' + result),
          noop,
      );

      submit.reset();
      expect(errors.ok).toBe(true);
    });
    it('does not clear absent submit errors', () => {

      const readErrors = jest.fn();

      validation.read(readErrors);
      submit.reset();

      expect(readErrors).toHaveBeenCalledTimes(1);
    });
  });
});
