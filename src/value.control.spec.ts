import { newNamespaceAliaser } from '@frontmeans/namespace-aliaser';
import { newManualRenderScheduler } from '@frontmeans/render-scheduler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Supply } from '@proc7ts/supply';
import { Mock } from 'jest-mock';
import { InNamespaceAliaser, InRenderScheduler } from './aspects';
import { InControl } from './control';
import { inValue } from './value.control';

describe('InValue', () => {
  let control: InControl<string>;

  beforeEach(() => {
    control = inValue('old');
  });

  describe('aspects', () => {
    it('accepts default aspect', () => {
      const nsAlias = newNamespaceAliaser();

      control = inValue('test', { aspects: InNamespaceAliaser.to(nsAlias) });
      expect(control.aspect(InNamespaceAliaser)).toBe(nsAlias);
    });
    it('accepts default aspects', () => {
      const nsAlias = newNamespaceAliaser();
      const scheduler = newManualRenderScheduler();

      control = inValue('test', {
        aspects: [InNamespaceAliaser.to(nsAlias), InRenderScheduler.to(scheduler)],
      });
      expect(control.aspect(InNamespaceAliaser)).toBe(nsAlias);
      expect(control.aspect(InRenderScheduler)).toBe(scheduler);
    });
  });

  describe('it', () => {
    it('has initial value', () => {
      expect(control.it).toBe('old');
    });
    it('updates value', () => {
      control.it = 'new';
      expect(control.it).toBe('new');
    });
  });

  describe('read', () => {
    let receiver: Mock<(arg: string) => void>;
    let supply: Supply;

    beforeEach(() => {
      receiver = jest.fn();
      supply = control.read(receiver);
    });

    it('sends current value', () => {
      expect(receiver).toHaveBeenCalledWith('old');
    });
    it('sends updated value', () => {
      control.it = 'new';
      expect(receiver).toHaveBeenCalledWith('new');
    });
    it('receives nothing when done', () => {
      const done = jest.fn();

      supply.whenOff(done);

      control.supply.off('reason');
      expect(done).toHaveBeenCalledWith('reason');
      expect(supply.isOff).toBe(true);
    });
  });

  describe('on', () => {
    let receiver: Mock<(newValue: string, oldValue: string) => void>;
    let supply: Supply;

    beforeEach(() => {
      receiver = jest.fn();
      supply = control.on(receiver);
    });

    it('sends value update', () => {
      control.it = 'new';
      expect(receiver).toHaveBeenCalledWith('new', 'old');
      control.it = 'third';
      expect(receiver).toHaveBeenCalledWith('third', 'new');
    });
    it('receives nothing when done', () => {
      const done = jest.fn();

      supply.whenOff(done);

      control.supply.off('reason');
      expect(done).toHaveBeenCalledWith('reason');
      expect(supply.isOff).toBe(true);
    });
  });
});
