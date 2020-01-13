import { afterThe } from 'fun-events';
import { immediateRenderScheduler, setRenderScheduler } from 'render-scheduler';
import { InMode } from '../data';
import { inText, InText } from '../element';
import { InValidation } from '../validation';
import { InCssClasses } from './css-classes.aspect';
import { inCssInfo } from './css-info';

describe('inCssInfo', () => {
  beforeEach(() => {
    setRenderScheduler(immediateRenderScheduler);
  });
  afterEach(() => {
    setRenderScheduler();
  });

  let element: HTMLInputElement;
  let control: InText;

  beforeEach(() => {
    element = document.createElement('input');
    control = inText(element);
    control.aspect(InCssClasses).add(inCssInfo());
  });

  it('appends no classes by default', () => {
    expect(element.classList).toHaveLength(0);
  });
  it('appends `disabled` class when disabled', () => {
    control.aspect(InMode).derive(afterThe<[InMode.Value]>('-ro'));
    expect(element.classList.contains('inap-disabled')).toBe(true);
  });
  it('appends `readonly` class when read-only', () => {
    control.aspect(InMode).derive(afterThe<[InMode.Value]>('ro'));
    expect(element.classList.contains('inap-readonly')).toBe(true);
  });
  it('appends `invalid` class when validation failed', () => {
    control.aspect(InValidation).by(afterThe<InValidation.Message[]>({ invalid: true }));
    expect(element.classList.contains('inap-invalid')).toBe(true);
  });
  it('appends `invalid` class when input is missing', () => {
    control.aspect(InValidation).by(afterThe<InValidation.Message[]>({ missing: true }));
    expect(element.classList.contains('inap-missing')).toBe(true);
  });
  it('appends `invalid` class when input is incomplete', () => {
    control.aspect(InValidation).by(afterThe<InValidation.Message[]>({ incomplete: true }));
    expect(element.classList.contains('inap-incomplete')).toBe(true);
  });
  it('appends `focus` class when input gains focus', () => {
    element.focus();
    expect(element.classList.contains('inap-has-focus')).toBe(true);
  });
  it('appends `touched` class when input touched', () => {
    element.focus();
    element.blur();
    expect(element.classList.contains('inap-touched')).toBe(true);
  });
  it('appends `edited` class when input is edited by user', () => {
    element.value  = 'some';
    element.dispatchEvent(new KeyboardEvent('input'));
    expect(element.classList.contains('inap-edited')).toBe(true);
  });
  it('applies custom prefix and suffix to class names', () => {
    control.aspect(InCssClasses).add(inCssInfo({ prefix: 'prefix-', suffix: '-suffix' }));
    control.aspect(InMode).derive(afterThe<[InMode.Value]>('off'));
    expect(element.classList.contains('prefix-disabled-suffix')).toBe(true);
  });
});
