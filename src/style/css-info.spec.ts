import { afterThe } from 'fun-events';
import { NamespaceDef, newNamespaceAliaser } from 'namespace-aliaser';
import { immediateRenderScheduler, setRenderScheduler } from 'render-scheduler';
import { InControl } from '../control';
import { InMode } from '../data';
import { inText } from '../element';
import { InNamespaceAliaser, InputAspects__NS } from '../namespace-aliaser.aspect';
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
  let control: InControl<string>;

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
    expect(element.classList.contains('disabled@inasp')).toBe(true);
  });
  it('appends `readonly` class when read-only', () => {
    control.aspect(InMode).derive(afterThe<[InMode.Value]>('ro'));
    expect(element.classList.contains('readonly@inasp')).toBe(true);
  });
  it('appends `invalid` class when validation failed', () => {
    control.aspect(InValidation).by(afterThe<InValidation.Message[]>({ invalid: true }));
    expect(element.classList.contains('invalid@inasp')).toBe(true);
  });
  it('appends `invalid` class when input is missing', () => {
    control.aspect(InValidation).by(afterThe<InValidation.Message[]>({ missing: true }));
    expect(element.classList.contains('missing@inasp')).toBe(true);
  });
  it('appends `invalid` class when input is incomplete', () => {
    control.aspect(InValidation).by(afterThe<InValidation.Message[]>({ incomplete: true }));
    expect(element.classList.contains('incomplete@inasp')).toBe(true);
  });
  it('appends `focus` class when input gains focus', () => {
    element.focus();
    expect(element.classList.contains('has-focus@inasp')).toBe(true);
  });
  it('appends `touched` class when input touched', () => {
    element.focus();
    element.blur();
    expect(element.classList.contains('touched@inasp')).toBe(true);
  });
  it('appends `edited` class when input is edited by user', () => {
    element.value  = 'some';
    element.dispatchEvent(new KeyboardEvent('input'));
    expect(element.classList.contains('edited@inasp')).toBe(true);
  });
  it('qualifies class names with custom namespace', () => {

    const ns = new NamespaceDef('http://localhost/test/ns', 'test');

    control.aspect(InCssClasses).add(inCssInfo({ ns }));
    control.aspect(InMode).derive(afterThe<[InMode.Value]>('off'));
    expect(element.classList.contains('disabled@test')).toBe(true);
  });
  it('utilizes `InNamespaceAliases`', () => {

    const nsAlias = newNamespaceAliaser();
    const ns = new NamespaceDef('http://localhost/test/ns', InputAspects__NS.alias);

    nsAlias(ns); // reserve preferred alias
    control = control.convert(InNamespaceAliaser.to(nsAlias));
    control.aspect(InCssClasses).add(inCssInfo());
    control.aspect(InMode).derive(afterThe<[InMode.Value]>('off'));

    expect(element.classList.contains('disabled@input-aspects')).toBe(true);
    expect(element.classList.contains('disabled@inasp')).toBe(true);
  });
});
