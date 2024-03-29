import { newManualRenderScheduler } from '@frontmeans/render-scheduler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { afterSupplied, onceAfter, onSupplied } from '@proc7ts/fun-events';
import { Mock } from 'jest-mock';
import { InAspect__symbol } from '../aspect';
import { InRenderScheduler } from '../aspects';
import { InControl } from '../control';
import { intoFallback } from '../conversion';
import { InData, InMode } from '../data';
import { InStyledElement } from '../elements/style';
import { inValue } from '../value.control';
import { InContainer } from './container.control';
import { inGroup, InGroup } from './group.control';
import { InList } from './list.control';
import { InParents } from './parents.aspect';

describe('InGroup', () => {
  interface TestModel {
    ctrl1: string;
    ctrl2?: string | undefined;
    ctrl3?: number | undefined;
  }

  let ctrl1: InControl<string>;
  let ctrl2: InControl<string | undefined>;
  let ctrl3: InControl<number | undefined>;
  let group: InGroup<TestModel>;

  beforeEach(() => {
    ctrl1 = inValue('some');
    ctrl2 = inValue('other').convert(intoFallback(''));
    ctrl3 = inValue(99).convert(intoFallback(0));
    group = inGroup<TestModel>({ ctrl1: ctrl1.it, ctrl2: ctrl2.it }).setup(({ controls }) => {
      controls.set({ ctrl1, ctrl2 });
    });
  });

  it('supports aspects', () => {
    expect(group.aspect(InList)).toBeDefined();
  });
  it('is not available in non-group controls', () => {
    expect(inValue('some').aspect(InGroup)).toBeNull();
  });
  it('is available as aspect of itself', () => {
    expect(group.aspect(InContainer)).toBe(group);
    expect(group.aspect(InGroup)).toBe(group);
    expect(InGroup[InAspect__symbol]).not.toBe(InContainer[InAspect__symbol]);
  });
  it('is available as aspect of converted control with the same value', () => {
    const converted = group.convert();

    expect(converted.aspect(InContainer)).toBe(group);
    expect(converted.aspect(InGroup)).toBe(group);
  });
  it('is not available as aspect of converted control with another value', () => {
    const converted = group.convert<string>({
      set: () => 'foo',
      get: () => ({ ctrl1: 'foo' }),
    });

    expect(converted.aspect(InContainer)).toBeNull();
    expect(converted.aspect(InGroup)).toBeNull();
  });
  it('allows to specify default aspects', () => {
    const styled = document.createElement('span');
    const scheduler = newManualRenderScheduler();

    group = inGroup<TestModel>(
      { ctrl1: '' },
      { aspects: [InStyledElement.to(styled), InRenderScheduler.to(scheduler)] },
    );
    expect(group.aspect(InStyledElement)).toBe(styled);
    expect(group.aspect(InRenderScheduler)).toBe(scheduler);
  });

  describe('controls', () => {
    let onModelUpdate: Mock<(newModel: TestModel, oldModel: TestModel) => void>;
    let onUpdate: Mock<
      (added: InGroup.Entry<TestModel>[], removed: InGroup.Entry<TestModel>[]) => void
    >;
    let readSnapshot: Mock<(model: InGroup.Snapshot<TestModel>) => void>;
    let lastSnapshot: InGroup.Snapshot<TestModel>;

    beforeEach(() => {
      group.on((onModelUpdate = jest.fn()));
      group.controls.on((onUpdate = jest.fn()));
      group.controls.read(
        (readSnapshot = jest.fn(snapshot => {
          lastSnapshot = snapshot;
        })),
      );
      readSnapshot.mockClear();
    });

    it('contain initial controls', () => {
      expect([...lastSnapshot]).toEqual([ctrl1, ctrl2]);
      expect([...lastSnapshot.entries()]).toEqual([
        ['ctrl1', ctrl1],
        ['ctrl2', ctrl2],
      ]);
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
        const supply = group.controls.set('ctrl3', ctrl3);

        expect([...lastSnapshot]).toEqual([ctrl1, ctrl2, ctrl3]);
        expect([...lastSnapshot.entries()]).toEqual([
          ['ctrl1', ctrl1],
          ['ctrl2', ctrl2],
          ['ctrl3', ctrl3],
        ]);
        expect(lastSnapshot.get('ctrl1')).toBe(ctrl1);
        expect(lastSnapshot.get('ctrl2')).toBe(ctrl2);
        expect(lastSnapshot.get('ctrl3')).toBe(ctrl3);
        expect(onUpdate).toHaveBeenCalledWith(
          [['ctrl3', ctrl3 as InControl<string | number | undefined>]],
          [],
        );
        expect(readSnapshot).toHaveBeenCalledTimes(1);
        expect(parentsOf(ctrl3)).toEqual([{ parent: group }]);

        supply.off();
        expect([...lastSnapshot]).toEqual([ctrl1, ctrl2]);
      });
      it('replaces control', () => {
        const ctrl4 = inValue('third');
        const supply = group.controls.set('ctrl1', ctrl4);

        expect([...lastSnapshot]).toEqual([ctrl4, ctrl2]);
        expect([...lastSnapshot.entries()]).toEqual([
          ['ctrl1', ctrl4],
          ['ctrl2', ctrl2],
        ]);
        expect(lastSnapshot.get('ctrl1')).toBe(ctrl4);
        expect(lastSnapshot.get('ctrl2')).toBe(ctrl2);
        expect(lastSnapshot.get('ctrl3')).toBeUndefined();
        expect(onUpdate).toHaveBeenCalledWith(
          [['ctrl1', ctrl4 as InControl<string | number | undefined>]],
          [['ctrl1', ctrl1 as InControl<string | number | undefined>]],
        );
        expect(readSnapshot).toHaveBeenCalledTimes(1);
        expect(parentsOf(ctrl1)).toHaveLength(0);
        expect(parentsOf(ctrl4)).toEqual([{ parent: group }]);

        group.controls.set('ctrl1', ctrl1);

        const whenOff = jest.fn();

        supply.whenOff(whenOff);
        expect(whenOff).toHaveBeenCalledWith(undefined);
      });
      it('replaces control with itself', () => {
        const supply1 = group.controls.set('ctrl1', ctrl1);
        const supply2 = group.controls.set('ctrl1', ctrl1);

        expect([...lastSnapshot]).toEqual([ctrl1, ctrl2]);
        expect(supply1.isOff).toBe(true);
        expect(supply2.isOff).toBe(false);
        expect(onUpdate).not.toHaveBeenCalled();
        expect(readSnapshot).not.toHaveBeenCalled();
      });
      it('updates container model', () => {
        const ctrl4 = inValue('third');

        group.controls.set('ctrl1', ctrl4);
        expect(group.it).toEqual({ ctrl1: 'third', ctrl2: 'other' });
        expect(onModelUpdate).toHaveBeenCalledWith(
          { ctrl1: 'third', ctrl2: 'other' },
          { ctrl1: 'some', ctrl2: 'other' },
        );
      });
      it('sets multiple controls', () => {
        const ctrl4 = inValue('third');
        const supply = group.controls.set({
          ctrl1: ctrl4,
          ctrl3,
        });

        expect([...lastSnapshot]).toEqual([ctrl4, ctrl2, ctrl3]);
        expect([...lastSnapshot.entries()]).toEqual([
          ['ctrl1', ctrl4],
          ['ctrl2', ctrl2],
          ['ctrl3', ctrl3],
        ]);
        expect(lastSnapshot.get('ctrl1')).toBe(ctrl4);
        expect(lastSnapshot.get('ctrl2')).toBe(ctrl2);
        expect(lastSnapshot.get('ctrl3')).toBe(ctrl3);
        expect(onUpdate).toHaveBeenCalledWith(
          [
            ['ctrl1', ctrl4 as InControl<string | number | undefined>],
            ['ctrl3', ctrl3 as InControl<string | number | undefined>],
          ],
          [['ctrl1', ctrl1 as InControl<string | number | undefined>]],
        );
        expect(readSnapshot).toHaveBeenCalledTimes(1);

        supply.off();
        expect([...lastSnapshot]).toEqual([ctrl2]);
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
        expect(onUpdate).toHaveBeenCalledWith(
          [],
          [['ctrl2', ctrl2 as InControl<string | number | undefined>]],
        );
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(readSnapshot).toHaveBeenCalledTimes(1);
        expect(parentsOf(ctrl2)).toHaveLength(0);
      });
      it('does nothing when there is no such control', () => {
        group.controls.remove('ctrl3');
        expect(onUpdate).not.toHaveBeenCalled();
      });
      it('does not update container model', () => {
        group.controls.remove('ctrl2');
        expect(group.it).toEqual({ ctrl1: 'some', ctrl2: 'other' });
        expect(onModelUpdate).not.toHaveBeenCalled();
      });
    });

    describe('clear', () => {
      it('removes all controls', () => {
        group.controls.clear();
        expect([...lastSnapshot]).toHaveLength(0);
        expect(onUpdate).toHaveBeenCalledWith(
          [],
          [
            ['ctrl1', ctrl1 as InControl<string | number | undefined>],
            ['ctrl2', ctrl2 as InControl<string | number | undefined>],
          ],
        );
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(readSnapshot).toHaveBeenCalledTimes(1);
      });
      it('does nothing when there is no controls', () => {
        group.controls.clear();
        group.controls.clear();
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(readSnapshot).toHaveBeenCalledTimes(1);
      });
    });

    describe('[OnEvent__symbol]', () => {
      it('is the same as `on`', () => {
        void expect(onSupplied(group.controls)).toBe(group.controls.on);
      });
    });

    describe('[AfterEvent__symbol]', () => {
      it('is the same as `read`', () => {
        void expect(afterSupplied(group.controls)).toBe(group.controls.read);
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
      group.supply.off();

      let lastSnapshot!: InGroup.Snapshot<TestModel>;

      group.controls.read(snapshot => (lastSnapshot = snapshot));

      // noinspection JSUnusedAssignment
      expect([...lastSnapshot]).toHaveLength(0);
    });
    it('stops model updates', () => {
      group.supply.off();
      ctrl1.it = '123';
      expect(group.it).toEqual({ ctrl1: 'some', ctrl2: 'other' });
    });
  });

  describe('InData', () => {
    let data: InData.DataType<TestModel>;

    beforeEach(() => {
      group.aspect(InData)(d => (data = d));
    });

    it('contains all data by default', () => {
      expect(data).toEqual({ ctrl1: 'some', ctrl2: 'other' });
    });
    it('has no data when group is disabled', () => {
      group.aspect(InMode).own.it = 'off';
      expect(data).toBeUndefined();
    });
    it('removes property when corresponding control is disabled', () => {
      ctrl2.aspect(InMode).own.it = 'off';
      expect(data).toEqual({ ctrl1: 'some' });
    });
    it('contains data without control', () => {
      const value: TestModel = { ctrl1: '1', ctrl2: '2', ctrl3: 3 };

      group.it = value;
      expect(data).toEqual(value);
    });
  });

  function parentsOf(control: InControl<any>): InParents.Entry[] {
    let parents: InParents.Entry[] = [];

    control.aspect(InParents).read.do(onceAfter)(p => (parents = [...p]));

    return parents;
  }
});
