import { newNamespaceAliaser } from '@frontmeans/namespace-aliaser';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { InNamespaceAliaser } from '../aspects';
import { InCheckbox, inCheckbox } from './checkbox.control';

describe('InCheckbox', () => {
  let checkbox: HTMLInputElement & { intermediate?: boolean | undefined };

  beforeEach(() => {
    checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
  });

  it('accepts default aspects', () => {
    const nsAlias = newNamespaceAliaser();
    const control = inCheckbox(checkbox, { aspects: InNamespaceAliaser.to(nsAlias) });

    expect(control.aspect(InNamespaceAliaser)).toBe(nsAlias);
  });

  describe('default', () => {
    let control: InCheckbox;

    beforeEach(() => {
      control = inCheckbox(checkbox);
    });

    describe('element', () => {
      it('contains input element', () => {
        expect(control.element).toBe(checkbox);
      });
    });

    describe('it', () => {
      it('reflects unchecked value', () => {
        expect(control.it).toBe(false);
      });
      it('reflects checked value', () => {
        checkbox.checked = true;
        expect(control.it).toBe(true);
      });
      it('reflects intermediate value', () => {
        checkbox.intermediate = true;
        expect(control.it).toBeUndefined();
      });
      it('checks checkbox when set to `true`', () => {
        control.it = true;
        expect(checkbox.checked).toBe(true);
        expect(checkbox.intermediate).toBe(false);
      });
      it('un-checks checkbox when set to `false`', () => {
        control.it = true;
        control.it = false;
        expect(checkbox.checked).toBe(false);
        expect(checkbox.intermediate).toBe(false);
      });
      it('makes checkbox state intermediate when set to `undefined`', () => {
        control.it = undefined;
        expect(checkbox.checked).toBe(false);
        expect(checkbox.intermediate).toBe(true);
      });
    });
  });

  describe('fully customized', () => {
    let control: InCheckbox<'+' | '-' | '*'>;

    beforeEach(() => {
      checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      control = inCheckbox(checkbox, { checked: '+', unchecked: '-', intermediate: '*' });
    });

    describe('element', () => {
      it('contains input element', () => {
        expect(control.element).toBe(checkbox);
      });
    });

    describe('it', () => {
      it('reflects unchecked value', () => {
        expect(control.it).toBe('-');
      });
      it('reflects checked value', () => {
        checkbox.checked = true;
        expect(control.it).toBe('+');
      });
      it('reflects intermediate value', () => {
        checkbox.intermediate = true;
        expect(control.it).toBe('*');
      });
      it('checks checkbox when set to checked', () => {
        control.it = '+';
        expect(checkbox.checked).toBe(true);
        expect(checkbox.intermediate).toBe(false);
      });
      it('un-checks checkbox when set to unchecked', () => {
        control.it = '+';
        control.it = '-';
        expect(checkbox.checked).toBe(false);
        expect(checkbox.intermediate).toBe(false);
      });
      it('makes checkbox state intermediate when set to intermediate', () => {
        control.it = '*';
        expect(checkbox.checked).toBe(false);
        expect(checkbox.intermediate).toBe(true);
      });
      it('makes checkbox state intermediate when set to invalid value', () => {
        control.it = 'invalid' as any;
        expect(control.it).toBe('*');
        expect(checkbox.checked).toBe(false);
        expect(checkbox.intermediate).toBe(true);
      });
    });
  });

  describe('partially customized', () => {
    let control: InCheckbox<'+' | '-' | undefined>;

    beforeEach(() => {
      checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      control = inCheckbox(checkbox, { checked: '+', unchecked: '-' });
    });

    describe('element', () => {
      it('contains input element', () => {
        expect(control.element).toBe(checkbox);
      });
    });

    describe('it', () => {
      it('reflects unchecked value', () => {
        expect(control.it).toBe('-');
      });
      it('reflects checked value', () => {
        checkbox.checked = true;
        expect(control.it).toBe('+');
      });
      it('reflects intermediate value', () => {
        checkbox.intermediate = true;
        expect(control.it).toBeUndefined();
      });
      it('checks checkbox when set to checked', () => {
        control.it = '+';
        expect(checkbox.checked).toBe(true);
        expect(checkbox.intermediate).toBe(false);
      });
      it('un-checks checkbox when set to unchecked', () => {
        control.it = '+';
        control.it = '-';
        expect(checkbox.checked).toBe(false);
        expect(checkbox.intermediate).toBe(false);
      });
      it('makes checkbox state intermediate when set to `undefined`', () => {
        control.it = undefined;
        expect(checkbox.checked).toBe(false);
        expect(checkbox.intermediate).toBe(true);
      });
    });
  });
});
