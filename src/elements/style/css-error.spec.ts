/* eslint-disable jest/expect-expect */
import { css__naming, QualifiedName } from '@frontmeans/namespace-aliaser';
import { immediateRenderScheduler, setRenderScheduler } from '@frontmeans/render-scheduler';
import { afterThe } from '@proc7ts/fun-events';
import { Supply } from '@proc7ts/primitives';
import { itsElements, overArray } from '@proc7ts/push-iterator';
import { InNamespaceAliaser, InputAspects__NS } from '../../aspects';
import { InControl } from '../../control';
import { InValidation } from '../../validation';
import { inText } from '../text.control';
import { InCssClasses } from './css-classes.aspect';
import { inCssError } from './css-error';

describe('inCssError', () => {
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
  });

  it('applies no classes by default', () => {
    addCssError();
    expectNoCssClasses();
  });
  it('applies `has-error` when any error present', () => {
    message({ invalid: true });
    addCssError();
    expectCssClass(['has-error', InputAspects__NS]);
  });
  it('applies marker class when any error present', () => {
    addCssError({ mark: 'has-error' });
    message({ invalid: true });
    expectCssClass('has-error');
  });
  it('applies marker classes when any error present', () => {
    addCssError({ mark: ['has-error', 'error'] });
    message({ invalid: true });
    expectCssClass('has-error');
    expectCssClass('error');
  });
  it('applies `has-error` when marker class is empty', () => {
    message({ invalid: true });
    addCssError({ mark: '' });
    expectCssClass(['has-error', InputAspects__NS]);
  });
  it('applies `has-error` when marker classes absent', () => {
    message({ invalid: true });
    addCssError({ mark: [] });
    expectCssClass(['has-error', InputAspects__NS]);
  });

  it('marks when requested error present', () => {
    message({ missing: true });
    addCssError({ when: 'missing' });
    expectCssClass(['has-error', InputAspects__NS]);
  });
  it('does not mark when requested error is absent', () => {
    message({ invalid: true });
    addCssError({ when: 'missing' });
    expectNoCssClasses();
  });
  it('marks when all requested errors present', () => {
    message({ missing: true, incomplete: true });
    addCssError({ when: ['missing', 'incomplete'] });
    expectCssClass(['has-error', InputAspects__NS]);
  });
  it('does not mark when not all requested errors present', () => {
    message({ missing: true });
    addCssError({ when: ['missing', 'incomplete'] });
    expectNoCssClasses();
  });
  it('marks when any error present and condition is empty', () => {
    message({ invalid: true });
    addCssError({ when: '' });
    expectCssClass(['has-error', InputAspects__NS]);
  });
  it('marks when any error present and conditions are empty', () => {
    message({ invalid: true });
    addCssError({ when: [] });
    expectCssClass(['has-error', InputAspects__NS]);
  });

  function addCssError(opts?: Parameters<typeof inCssError>['0']): void {
    control.aspect(InCssClasses).add(inCssError(opts));
  }

  function message(...messages: InValidation.Message[]): Supply {
    return control.aspect(InValidation).by(afterThe(...messages));
  }

  function expectNoCssClasses(): void {
    expect(element.classList).toHaveLength(0);
  }

  function expectCssClass(name: QualifiedName): void {
    expect(itsElements(overArray(element.classList)))
        .toContain(css__naming.name(name, control.aspect(InNamespaceAliaser)));
  }
});
