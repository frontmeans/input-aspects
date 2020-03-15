import { afterSupplied, EventSupply, onSupplied } from 'fun-events';
import { InControl } from '../control';
import { inValue } from '../controls';
import { InContainer } from './container.control';
import { inGroup } from './group.control';
import { InParents } from './parents.aspect';
import Mock = jest.Mock;

describe('InParents', () => {

  let parent: InContainer<{}>;
  let control: InControl<string>;

  beforeEach(() => {
    parent = inGroup({});
    control = inValue('value');
  });

  let parents: InParents;
  let onParents: Mock<void, [InParents.Entry[], InParents.Entry[]]>;
  let readParents: Mock<void, [InParents.All]>;
  let parentsSupply: EventSupply;
  let allParents: InParents.All;

  beforeEach(() => {
    parents = control.aspect(InParents);
    parents.on(onParents = jest.fn());
    allParents = undefined!;
    parentsSupply = parents.read(readParents = jest.fn(entries => {
      allParents = entries;
    }));
    readParents.mockClear();
  });

  it('reports all parents on receiver registration', () => {
     expect(allParents).toBeDefined();
  });

  describe('[OnEvent__symbol]', () => {
    it('is the same as `on`', () => {
      expect(onSupplied(parents)).toBe(parents.on());
    });
  });

  describe('[AfterEvent__symbol]', () => {
    it('is the same as `read`', () => {
      expect(afterSupplied(parents)).toBe(parents.read());
    });
  });

  describe('add', () => {

    let supply: EventSupply;
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
      parent.done();
      expect([...allParents]).toHaveLength(0);
      expect(onParents).toHaveBeenCalledWith([], [entry]);
      expect(readParents).toHaveBeenCalledTimes(2);
    });
    it('adds another parent entry', () => {

      const parent2 = inGroup({});
      const entry2: InParents.Entry = { parent: parent2 };
      const supply2 = parents.add(entry2);

      expect([...allParents]).toEqual([entry, entry2]);

      supply2.off();
      expect([...allParents]).toEqual([entry]);
    });
    it('rejects parent when control input is cut off', () => {

      const reason = 'test';

      control.done(reason);

      const parent2 = inGroup({});
      const entry2: InParents.Entry = { parent: parent2 };
      const whenOff = jest.fn();

      parents.add(entry2).whenOff(whenOff);

      expect(whenOff).toHaveBeenCalledWith(reason);
    });
    it('rejects parent when parent input is cut off', () => {

      const reason = 'test';
      const parent2 = inGroup({});

      parent2.done(reason);

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

      control.done(reason);
      parentsSupply.whenOff(whenOff);
      expect(whenOff).toHaveBeenCalledWith(reason);
    });
  });
});
