import { afterEventFrom, EventInterest, onEventFrom } from 'fun-events';
import { InControl } from '../control';
import { inValue } from '../value';
import { InContainer } from './container';
import { inGroup } from './group';
import { InParents } from './parents.aspect';
import Mock = jest.Mock;

describe('InParents', () => {

  let parent: InContainer<{}>;
  let control: InControl;

  beforeEach(() => {
    parent = inGroup({});
    control = inValue('value');
  });

  let parents: InParents;
  let onParents: Mock<void, [InParents.Entry[], InParents.Entry[]]>;
  let readParents: Mock<void, [Iterable<InParents.Entry>]>;
  let allParents: InParents.All;

  beforeEach(() => {
    parents = control.aspect(InParents);
    parents.on(onParents = jest.fn());
    parents.read(readParents = jest.fn(entries => {
      allParents = entries;
    }));
    expect(readParents).toHaveBeenCalledWith(allParents);
    readParents.mockClear();
  });

  describe('[OnEvent__symbol]', () => {
    it('is the same as `on`', () => {
      expect(onEventFrom(parents)).toBe(parents.on);
    });
  });

  describe('[AfterEvent__symbol]', () => {
    it('is the same as `read`', () => {
      expect(afterEventFrom(parents)).toBe(parents.read);
    });
  });

  describe('add', () => {

    let interest: EventInterest;
    let entry: InParents.Entry;

    beforeEach(() => {
      entry = { parent };
      interest = parents.add(entry);
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
    it('removes parent when interest lost', () => {
      interest.off();
      expect([...allParents]).toHaveLength(0);
      expect(onParents).toHaveBeenCalledWith([], [entry]);
      expect(readParents).toHaveBeenCalledTimes(2);
    });
    it('adds another parent entry', () => {

      const parent2 = inGroup({});
      const entry2: InParents.Entry = { parent: parent2 };
      const interest2 = parents.add(entry2);

      expect([...allParents]).toEqual([entry, entry2]);

      interest2.off();
      expect([...allParents]).toEqual([entry]);
    });
  });
});
