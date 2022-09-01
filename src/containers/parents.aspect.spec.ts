import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { afterSupplied, onSupplied } from '@proc7ts/fun-events';
import { noop } from '@proc7ts/primitives';
import { Supply } from '@proc7ts/supply';
import { Mock } from 'jest-mock';
import { InControl } from '../control';
import { inValue } from '../value.control';
import { InContainer } from './container.control';
import { inGroup } from './group.control';
import { InParents } from './parents.aspect';

describe('InParents', () => {
  let parent: InContainer<Record<string, unknown>>;
  let control: InControl<string>;

  beforeEach(() => {
    parent = inGroup<Record<string, unknown>>({});
    control = inValue('value');
  });

  let parents: InParents;
  let onParents: Mock<(added: InParents.Entry[], removed: InParents.Entry[]) => void>;
  let readParents: Mock<(parents: InParents.All) => void>;
  let parentsSupply: Supply;
  let allParents: InParents.All;

  beforeEach(() => {
    parents = control.aspect(InParents);
    parents.on((onParents = jest.fn()));
    allParents = undefined!;
    parentsSupply = parents.read(
      (readParents = jest.fn(entries => {
        allParents = entries;
      })),
    );
    readParents.mockClear();
  });

  afterEach(() => {
    Supply.onUnexpectedAbort();
  });

  it('reports all parents on receiver registration', () => {
    expect(allParents).toBeDefined();
  });

  describe('[OnEvent__symbol]', () => {
    it('is the same as `on`', () => {
      void expect(onSupplied(parents)).toBe(parents.on);
    });
  });

  describe('[AfterEvent__symbol]', () => {
    it('is the same as `read`', () => {
      void expect(afterSupplied(parents)).toBe(parents.read);
    });
  });

  describe('add', () => {
    let supply: Supply;
    let entry: InParents.Entry;

    beforeEach(() => {
      entry = { parent };
      supply = parents.add(entry);
    });

    it('updates parents list', () => {
      expect([...allParents]).toEqual([entry]);
      expect(onParents).toHaveBeenCalledWith([entry], []);
      expect(readParents).toHaveBeenCalledTimes(1);
    });
    it('does nothing when adding the same entry', () => {
      parents.add(entry);
      expect(onParents).toHaveBeenCalledTimes(1);
      expect(readParents).toHaveBeenCalledTimes(1);
    });
    it('removes parent when supply is cut off', () => {
      supply.off();
      expect([...allParents]).toHaveLength(0);
      expect(onParents).toHaveBeenCalledWith([], [entry]);
      expect(readParents).toHaveBeenCalledTimes(2);
    });
    it('removes parent when its input is cut off', () => {
      parent.supply.off();
      expect([...allParents]).toHaveLength(0);
      expect(onParents).toHaveBeenCalledWith([], [entry]);
      expect(readParents).toHaveBeenCalledTimes(2);
    });
    it('adds another parent entry', () => {
      const parent2 = inGroup<Record<string, unknown>>({});
      const entry2: InParents.Entry = { parent: parent2 };
      const supply2 = parents.add(entry2);

      expect([...allParents]).toEqual([entry, entry2]);

      supply2.off();
      expect([...allParents]).toEqual([entry]);
    });
    it('rejects parent when control input is cut off', () => {
      const reason = 'test';

      control.supply.off(reason);

      const parent2 = inGroup<Record<string, unknown>>({});
      const entry2: InParents.Entry = { parent: parent2 };
      const whenOff = jest.fn();

      parents.add(entry2).whenOff(whenOff);

      expect(whenOff).toHaveBeenCalledWith(reason);
    });
    it('rejects parent when parent input is cut off', () => {
      Supply.onUnexpectedAbort(noop);

      const reason = 'test';
      const parent2 = inGroup<Record<string, unknown>>({});

      parent2.supply.off(reason);

      const entry2: InParents.Entry = { parent: parent2 };
      const whenOff = jest.fn();

      parents.add(entry2).whenOff(whenOff);

      expect(whenOff).toHaveBeenCalledWith(reason);
    });
  });

  describe('read', () => {
    it('is cut off when input is cut off', () => {
      const reason = 'test';
      const whenOff = jest.fn();

      control.supply.off(reason);
      parentsSupply.whenOff(whenOff);
      expect(whenOff).toHaveBeenCalledWith(reason);
    });
  });
});
