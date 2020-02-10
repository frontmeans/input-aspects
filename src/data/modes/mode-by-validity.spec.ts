import { afterThe } from 'fun-events';
import { InControl } from '../../control';
import { inValue } from '../../controls';
import { InValidation } from '../../validation';
import { InMode } from '../mode.aspect';
import { inModeByValidity } from './mode-by-validity';

describe('inModeByValidity', () => {

  let form: InControl<any>;
  let validation: InValidation<any>;
  let mode: InMode;
  let modeValue: InMode.Value;

  beforeEach(() => {
    form = inValue('form');
    validation = form.aspect(InValidation);
    mode = form.aspect(InMode);
    mode.read(m => modeValue = m);
  });

  it('is enabled for valid form', () => {
    mode.derive(inModeByValidity());
    expect(modeValue).toBe('on');
  });
  it('is set to not submittable on validation errors by default', () => {
    mode.derive(inModeByValidity());
    validation.by(afterThe({ invalid: true }));
    expect(modeValue).toBe('-on');
  });
  it('is set to custom value on validation errors', () => {
    mode.derive(inModeByValidity({ invalid: 'off' }));
    validation.by(afterThe({ invalid: true }));
    expect(modeValue).toBe('off');
  });
  it('is enabled on submit errors by default', () => {
    mode.derive(inModeByValidity());
    validation.by(afterThe({ submit: true, invalid: true }));
    expect(modeValue).toBe('on');
  });
  it('is enabled on custom ignored errors', () => {
    mode.derive(inModeByValidity({ ignore: ['custom'] }));
    validation.by(afterThe({ custom: true, invalid: true }));
    expect(modeValue).toBe('on');
  });
});
