import { asis, noop } from '@proc7ts/call-thru';
import { afterThe } from '@proc7ts/fun-events';
import { InControl } from '../../control';
import { inValue } from '../../controls';
import { InSubmit, InSubmitRejectedError } from '../../submit.aspect';
import { InMode } from '../mode.aspect';
import { inModeByForm } from './mode-by-form';

describe('inModeByForm', () => {

  let form: InControl<string>;
  let submit: InSubmit<string>;
  let submitFlags: InSubmit.Flags;
  let control: InControl<string>;
  let mode: InMode;
  let modeValue: InMode.Value;

  beforeEach(() => {
    form = inValue('form');
    submit = form.aspect(InSubmit);
    submit.read(f => submitFlags = f);
    control = inValue('control');
    mode = control.aspect(InMode);
    mode.read(v => modeValue = v);
  });

  it('preserves `on` mode by default', () => {
    mode.derive(inModeByForm(form));
    expect(modeValue).toBe('on');
    expect(submitFlags).toEqual({ ready: true, submitted: false, busy: false });
  });
  it('makes read-only while busy by default', async () => {
    mode.derive(inModeByForm(form));

    let resolve: () => void = noop;
    const submitted = new Promise(r => resolve = r);
    const promise = submit.submit(() => submitted);

    expect(modeValue).toBe('ro');
    expect(submitFlags).toEqual({ ready: true, submitted: true, busy: true });

    resolve();
    await promise;

    expect(modeValue).toBe('on');
    expect(submitFlags).toEqual({ ready: true, submitted: true, busy: false });
  });
  it('sets to specified value while busy', async () => {
    mode.derive(inModeByForm(form, { busy: 'off' }));

    const submit = new Submit();

    expect(modeValue).toBe('off');
    expect(submitFlags).toEqual({ ready: true, submitted: true, busy: true });

    await submit.success();

    expect(modeValue).toBe('on');
    expect(submitFlags).toEqual({ ready: true, submitted: true, busy: false });
  });
  it('remains enabled when not ready by default', () => {
    mode.derive(inModeByForm(form));
    form.aspect(InMode).derive(afterThe('off'));

    expect(modeValue).toBe('on');
    expect(submitFlags).toEqual({ ready: false, submitted: false, busy: false });
  });
  it('sets to specified value when not ready', () => {
    mode.derive(inModeByForm(form, { notReady: 'off' }));
    form.aspect(InMode).derive(afterThe('off'));

    expect(modeValue).toBe('off');
    expect(submitFlags).toEqual({ ready: false, submitted: false, busy: false });
  });
  it('remains enabled when not ready and submitted by default', async () => {
    mode.derive(inModeByForm(form));
    form.aspect(InMode).derive(afterThe('off'));

    const submit = new Submit();

    expect(modeValue).toBe('ro');
    expect(submitFlags).toEqual({ ready: false, submitted: true, busy: true });

    const error = await submit.failure();

    expect(error).toBeInstanceOf(InSubmitRejectedError);
    expect(modeValue).toBe('on');
    expect(submitFlags).toEqual({ ready: false, submitted: true, busy: false });
  });
  it('sets to specified value when not ready and submitted', async () => {
    mode.derive(inModeByForm(form, { invalid: 'off' }));
    form.aspect(InMode).derive(afterThe('off'));

    const submit = new Submit();

    expect(modeValue).toBe('off');
    expect(submitFlags).toEqual({ ready: false, submitted: true, busy: true });

    const error = await submit.failure();

    expect(error).toBeInstanceOf(InSubmitRejectedError);
    expect(modeValue).toBe('off');
    expect(submitFlags).toEqual({ ready: false, submitted: true, busy: false });
  });

  class Submit {

    private resolve: (response: string) => void = noop;
    private readonly promise: Promise<string>;

    constructor() {

      const submitted = new Promise<string>(resolve => this.resolve = resolve);

      this.promise = submit.submit(() => submitted);
    }

    async success(): Promise<void> {
      this.resolve('success');
      await this.promise;
    }

    async failure(): Promise<any> {
      this.resolve('success');
      return this.promise.then(
          result => Promise.reject(new Error(`Unexpected result received: ${result}`)),
          asis,
      );
    }

  }
});
