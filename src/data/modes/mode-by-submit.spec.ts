import { noop } from 'call-thru';
import { afterThe } from 'fun-events';
import { InControl } from '../../control';
import { InMode } from '../index';
import { InSubmit } from '../../submit.aspect';
import { inValue } from '../../value';
import { inModeBySubmit } from './mode-by-submit';

describe('inModeBySubmit', () => {

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
    mode.derive(inModeBySubmit(submit));
    expect(modeValue).toBe('on');
    expect(submitFlags).toEqual({ ready: true, submitted: false, busy: false });
  });
  it('makes read-only while busy by default', async () => {
    mode.derive(inModeBySubmit(submit));

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
    mode.derive(inModeBySubmit(submit, { busy: 'off' }));

    let resolve: () => void = noop;
    const submitted = new Promise(r => resolve = r);
    const promise = submit.submit(() => submitted);

    expect(modeValue).toBe('off');
    expect(submitFlags).toEqual({ ready: true, submitted: true, busy: true });

    resolve();
    await promise;

    expect(modeValue).toBe('on');
    expect(submitFlags).toEqual({ ready: true, submitted: true, busy: false });
  });
  it('remains enabled when not ready by default', () => {
    mode.derive(inModeBySubmit(submit));
    form.aspect(InMode).derive(afterThe('off'));

    expect(modeValue).toBe('on');
    expect(submitFlags).toEqual({ ready: false, submitted: false, busy: false });
  });
  it('sets to specified value when not ready', () => {
    mode.derive(inModeBySubmit(submit, { notReady: 'off' }));
    form.aspect(InMode).derive(afterThe('off'));

    expect(modeValue).toBe('off');
    expect(submitFlags).toEqual({ ready: false, submitted: false, busy: false });
  });
});
