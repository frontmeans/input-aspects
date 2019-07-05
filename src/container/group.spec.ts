import { afterEventFrom, onEventFrom } from 'fun-events';
import { InControl } from '../control';
import { intoFallback } from '../conversion';
import { InValidation } from '../validation';
import { inValue } from '../value';
import { InContainer } from './container';
import { inGroup, InGroup, InGroupControls } from './group';
import { InParents } from './parents.aspect';
import Mock = jest.Mock;

describe('InGroup', () => {

  interface TestModel {
    ctrl1: string;
    ctrl2?: string;
    ctrl3?: number;
  }

  let ctrl1: InControl<string>;
  let ctrl2: InControl<string | undefined>;
  let ctrl3: InControl<number | undefined>;
  let group: InGroup<TestModel>;

  beforeEach(() => {
    ctrl1 = inValue('some');
    ctrl2 = inValue('other').convert(intoFallback(''));
    ctrl3 = inValue(99).convert(intoFallback(0));
    group = inGroup<TestModel>({ ctrl1: ctrl1.it, ctrl2: ctrl2.it })
        .setup(({ controls }) => controls.set({ ctrl1, ctrl2 }));
  });

  it('supports aspects', () => {
    expect(group.aspect(InValidation)).toBeDefined();
  });

  it('is available as aspect of itself', () => {
    expect(group.aspect(InContainer)).toBe(group);
  });

  describe('controls', () => {

    let onModelUpdate: Mock<void, [TestModel, TestModel]>;
    let onUpdate: Mock<void, Parameters<InGroupControls<TestModel>['on']>>;
    let readSnapshot: Mock<void, [InGroup.Snapshot<TestModel>]>;
    let lastSnapshot: InGroup.Snapshot<TestModel>;

    beforeEach(() => {
      group.on(onModelUpdate = jest.fn());
      group.controls.on(onUpdate = jest.fn());
      group.controls.read(readSnapshot = jest.fn(snapshot => {
        lastSnapshot = snapshot;
      }));
      expect(readSnapshot).toHaveBeenCalledWith(lastSnapshot);
      readSnapshot.mockClear();
    });

    it('contain initial controls', () => {
      expect([...lastSnapshot]).toEqual([ctrl1, ctrl2]);
      expect([...lastSnapshot.entries()]).toEqual([['ctrl1', ctrl1], ['ctrl2', ctrl2]]);
      expect(lastSnapshot.get('ctrl1')).toBe(ctrl1);
      expect(lastSnapshot.get('ctrl2')).toBe(ctrl2);
      expect(lastSnapshot.get('ctrl3')).toBeUndefined();
    });

    it('updates the model by control', () => {
      ctrl2.it = undefined;
      expect(group.it).toEqual({ ctrl1: 'some' });
    });

    describe('set', () => {
      it('adds control', () => {
        group.controls.set('ctrl3', ctrl3);
        expect([...lastSnapshot]).toEqual([ctrl1, ctrl2, ctrl3]);
        expect([...lastSnapshot.entries()]).toEqual([['ctrl1', ctrl1], ['ctrl2', ctrl2], ['ctrl3', ctrl3]]);
        expect(lastSnapshot.get('ctrl1')).toBe(ctrl1);
        expect(lastSnapshot.get('ctrl2')).toBe(ctrl2);
        expect(lastSnapshot.get('ctrl3')).toBe(ctrl3);
        expect(onUpdate).toHaveBeenCalledWith([['ctrl3', ctrl3]], []);
        expect(readSnapshot).toHaveBeenCalledTimes(1);
        expect(parentsOf(ctrl3)).toEqual([[group, 'ctrl3']]);
      });
      it('replaces control', () => {

        const ctrl4 = inValue('third');

        group.controls.set('ctrl1', ctrl4);

        expect([...lastSnapshot]).toEqual([ctrl4, ctrl2]);
        expect([...lastSnapshot.entries()]).toEqual([['ctrl1', ctrl4], ['ctrl2', ctrl2]]);
        expect(lastSnapshot.get('ctrl1')).toBe(ctrl4);
        expect(lastSnapshot.get('ctrl2')).toBe(ctrl2);
        expect(lastSnapshot.get('ctrl3')).toBeUndefined();
        expect(onUpdate).toHaveBeenCalledWith([['ctrl1', ctrl4]], [['ctrl1', ctrl1]]);
        expect(readSnapshot).toHaveBeenCalledTimes(1);
        expect(parentsOf(ctrl1)).toHaveLength(0);
        expect(parentsOf(ctrl4)).toEqual([[group, 'ctrl1']]);
      });
      it('does not replace control with itself', () => {
        group.controls.set('ctrl1', ctrl1);

        expect([...lastSnapshot]).toEqual([ctrl1, ctrl2]);
        expect([...lastSnapshot.entries()]).toEqual([['ctrl1', ctrl1], ['ctrl2', ctrl2]]);
        expect(lastSnapshot.get('ctrl1')).toBe(ctrl1);
        expect(lastSnapshot.get('ctrl2')).toBe(ctrl2);
        expect(lastSnapshot.get('ctrl3')).toBeUndefined();
        expect(onUpdate).not.toHaveBeenCalled();
        expect(readSnapshot).not.toHaveBeenCalled();
      });
      it('updates container model', () => {

        const ctrl4 = inValue('third');

        group.controls.set('ctrl1', ctrl4);
        expect(group.it).toEqual({ ctrl1: 'third', ctrl2: 'other' });
        expect(onModelUpdate).toHaveBeenCalledWith(
            { ctrl1: 'third', ctrl2: 'other' },
            { ctrl1: 'some', ctrl2: 'other' });
      });
      it('sets multiple controls', () => {

        const ctrl4 = inValue('third');

        group.controls.set({
          ctrl1: ctrl4,
          ctrl3,
        });
        expect([...lastSnapshot]).toEqual([ctrl4, ctrl2, ctrl3]);
        expect([...lastSnapshot.entries()]).toEqual([['ctrl1', ctrl4], ['ctrl2', ctrl2], ['ctrl3', ctrl3]]);
        expect(lastSnapshot.get('ctrl1')).toBe(ctrl4);
        expect(lastSnapshot.get('ctrl2')).toBe(ctrl2);
        expect(lastSnapshot.get('ctrl3')).toBe(ctrl3);
        expect(onUpdate).toHaveBeenCalledWith([['ctrl1', ctrl4], ['ctrl3', ctrl3]], [['ctrl1', ctrl1]]);
        expect(readSnapshot).toHaveBeenCalledTimes(1);
      });
    });

    describe('remove', () => {
      it('removes control', () => {
        group.controls.remove('ctrl2');
        expect([...lastSnapshot]).toEqual([ctrl1]);
        expect([...lastSnapshot.entries()]).toEqual([['ctrl1', ctrl1]]);
        expect(lastSnapshot.get('ctrl1')).toBe(ctrl1);
        expect(lastSnapshot.get('ctrl2')).toBeUndefined();
        expect(lastSnapshot.get('ctrl3')).toBeUndefined();
        expect(onUpdate).toHaveBeenCalledWith([], [['ctrl2', ctrl2]]);
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(readSnapshot).toHaveBeenCalledTimes(1);
        expect(parentsOf(ctrl2)).toHaveLength(0);
      });
      it('does nothing when there is no such control', () => {
        group.controls.remove(('ctrl3'));
        expect(onUpdate).not.toHaveBeenCalled();
      });
      it('does not update container model', () => {
        group.controls.remove('ctrl2');
        expect(group.it).toEqual({ ctrl1: 'some', ctrl2: 'other' });
        expect(onModelUpdate).not.toHaveBeenCalled();
      });
    });

    describe('[OnEvent__symbol]', () => {
      it('is the same as `on`', () => {
        expect(onEventFrom(group.controls)).toBe(group.controls.on);
      });
    });

    describe('[AfterEvent__symbol]', () => {
      it('is the same as `read`', () => {
        expect(afterEventFrom(group.controls)).toBe(group.controls.read);
      });
    });
  });

  describe('it', () => {
    it('contains initial model', () => {
      expect(group.it).toEqual({ ctrl1: 'some', ctrl2: 'other' });
    });
    it('updates existing control values', () => {

      const newValue = { ctrl1: 'some2', ctrl2: 'other2' };

      group.it = newValue;
      expect(group.it).toBe(newValue);
      expect(ctrl1.it).toBe(newValue.ctrl1);
      expect(ctrl2.it).toBe(newValue.ctrl2);
    });
    it('updates missing control model', () => {

      const newValue: TestModel = { ctrl1: 'some2', ctrl2: 'other2', ctrl3: 13 };

      group.it = newValue;
      expect(group.it).toBe(newValue);
      expect(ctrl1.it).toBe(newValue.ctrl1);
      expect(ctrl2.it).toBe(newValue.ctrl2);
    });
    it('resets control with missing values', () => {

      const newValue: TestModel = { ctrl1: 'some2' };

      group.it = newValue;
      expect(group.it).toBe(newValue);
      expect(ctrl1.it).toBe(newValue.ctrl1);
      expect(ctrl2.it).toBeUndefined();
    });
  });

  describe('done', () => {
    it('removes all controls', () => {
      group.done();

      let lastSnapshot!: InGroup.Snapshot<TestModel>;

      group.controls.read(snapshot => lastSnapshot = snapshot);

      // noinspection JSUnusedAssignment
      expect([...lastSnapshot]).toHaveLength(0);
    });
    it('stops model updates', () => {
      group.done();
      ctrl1.it = '123';
      expect(group.it).toEqual({ ctrl1: 'some', ctrl2: 'other' });
    });
  });

  function parentsOf(control: InControl<any>): InParents.Entry[] {

    let parents: InParents.Entry[] = [];

    control.aspect(InParents).read.once(p => parents = [...p]);

    return parents;
  }

});
