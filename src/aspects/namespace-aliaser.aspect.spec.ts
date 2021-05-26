import { newNamespaceAliaser } from '@frontmeans/namespace-aliaser';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { InControl } from '../control';
import { InElement } from '../element.control';
import { inText, InText } from '../elements';
import { inValue } from '../value.control';
import { InNamespaceAliaser } from './namespace-aliaser.aspect';

describe('InNamespaceAliaser', () => {
  it('is present by default', () => {
    expect(inValue(1).aspect(InNamespaceAliaser)).toBeDefined();
  });

  describe('to', () => {

    let input: HTMLInputElement;
    let control: InText;
    let nsAlias: InNamespaceAliaser;
    let converted: InControl<string>;

    beforeEach(() => {
      input = document.createElement('input');
      control = inText(input);
      nsAlias = newNamespaceAliaser();
      converted = control.convert(InNamespaceAliaser.to(nsAlias));
    });

    it('assigns render scheduler', () => {
      expect(converted.aspect(InNamespaceAliaser)).toBe(nsAlias);
    });
    it('preserves input element', () => {
      expect(converted.aspect(InElement)).toBe(control.aspect(InElement));
    });
  });
});
