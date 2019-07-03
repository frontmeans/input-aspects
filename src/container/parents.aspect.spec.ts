import { afterEventFrom, EventInterest, onEventFrom } from 'fun-events';
import { InControl } from '../control';
import { inValue } from '../value';
import { InContainer } from './container';
import { inGroup } from './group';
import { InParents } from './parents.aspect';
import Mock = jest.Mock;

describe('InParents', () => {

  let container: InContainer<{}>;
  let control: InControl;

  beforeEach(() => {
    container = inGroup({});
    control = inValue('value');
  });

  let parents: InParents;
  let onParents: Mock<void, [InParents.Entry[], InParents.Entry[]]>;
  let readParents: Mock<void, [InParents]>;

  beforeEach(() => {
    parents = control.aspect(InParents);
    parents.on(onParents = jest.fn());
    parents.read(readParents = jest.fn());
    expect(readParents).toHaveBeenCalledWith(parents);
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

    beforeEach(() => {
      interest = parents.add(container, 'key');
    });

    it('updates parents list', () => {
      expect([...parents]).toEqual([[container, 'key']]);
      expect(onParents).toHaveBeenCalledWith([[container, 'key']], []);
      expect(readParents).toHaveBeenCalledTimes(1);
    });
    it('does nothing when adding under the same key', () => {
      parents.add(container, 'key');
      expect(onParents).toHaveBeenCalledTimes(1);
      expect(readParents).toHaveBeenCalledTimes(1);
    });
    it('removes parent when interest lost', () => {
      interest.off();
      expect([...parents]).toHaveLength(0);
      expect(onParents).toHaveBeenCalledWith([], [[container, 'key']]);
      expect(readParents).toHaveBeenCalledTimes(2);
    });
    it('adds under different key', () => {

      const interest2 = parents.add(container, 'key2');

      expect([...parents]).toEqual([[container, 'key'], [container, 'key2']]);
      expect(onParents).toHaveBeenCalledWith([[container, 'key2']], []);
      expect(readParents).toHaveBeenCalledTimes(2);

      interest2.off();
      expect([...parents]).toEqual([[container, 'key']]);
    });
    it('adds to another container', () => {

      const container2 = inGroup({});
      const interest2 = parents.add(container2, 'key');

      expect([...parents]).toEqual([[container, 'key'], [container2, 'key']]);

      interest2.off();
      expect([...parents]).toEqual([[container, 'key']]);
    });
  });
});
