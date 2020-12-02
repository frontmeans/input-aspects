import { EventSupply } from '@proc7ts/fun-events';
import { newManualRenderScheduler } from '@proc7ts/render-scheduler';
import { InAspect__symbol } from '../aspect';
import { InRenderScheduler } from '../aspects';
import { InControl } from '../control';
import { inValue } from '../controls';
import { InData, InMode } from '../data';
import { InContainer } from './container.control';
import { InGroup } from './group.control';
import { inList, InList } from './list.control';
import { InParents } from './parents.aspect';
import Mock = jest.Mock;

describe('InList', () => {

  let ctrl1: InControl<string>;
  let ctrl2: InControl<string>;
  let ctrl3: InControl<string>;
  let list: InList<string>;

  beforeEach(() => {
    ctrl1 = inValue('1');
    ctrl2 = inValue('2');
    ctrl3 = inValue('3');
    list = inList(['11', '22', '33']);
  });

  let initControls: InControl<string>[];

  beforeEach(() => {
    list.controls.read().once(snapshot => initControls = [...snapshot]);
  });

  it('supports aspects', () => {
    expect(list.aspect(InGroup)).toBeDefined();
  });
  it('is not available in non-list controls', () => {
    expect(inValue('some').aspect(InList)).toBeNull();
  });
  it('is available as aspect of itself', () => {
    expect(list.aspect(InContainer)).toBe(list);
    expect(list.aspect(InList)).toBe(list);
    expect(InList[InAspect__symbol]).not.toBe(InContainer[InAspect__symbol]);
  });
  it('is available as aspect of converted control with the same value', () => {

    const converted = list.convert();

    expect(converted.aspect(InContainer)).toBe(list);
    expect(converted.aspect(InList)).toBe(list);
  });
  it('is not available as aspect of converted control with another value', () => {

    const converted = list.convert<string>({
      set: () => 'foo',
      get: () => [],
    });

    expect(converted.aspect(InContainer)).toBeNull();
    expect(converted.aspect(InList)).toBeNull();
  });
  it('allows to specify default aspects', () => {

    const scheduler = newManualRenderScheduler();

    list = inList<string>(
        [],
        { aspects: InRenderScheduler.to(scheduler) },
    );
    expect(list.aspect(InRenderScheduler)).toBe(scheduler);
  });

  describe('it', () => {
    it('has initial model', () => {
      expect(list.it).toEqual(['11', '22', '33']);
    });
    it('updates control values', () => {
      list.it = ['111', '222', '333'];
      expect(initControls[0].it).toBe('111');
      expect(initControls[1].it).toBe('222');
      expect(initControls[2].it).toBe('333');
    });
    it('removes extra controls', () => {
      list.it = ['111', '222'];

      let controls: InControl<any>[] = [];

      list.controls.read().once(snapshot => controls = [...snapshot]);

      expect(controls).toEqual([initControls[0], initControls[1]]);
      expect(controls[0].it).toBe('111');
      expect(controls[1].it).toBe('222');
    });
    it('appends missing controls', () => {
      list.it = ['111', '222', '333', '444'];

      let controls: InControl<any>[] = [];

      list.controls.read().once(snapshot => controls = [...snapshot]);

      expect(controls).toEqual([...initControls, expect.any(InControl)]);
      expect(controls[0].it).toBe('111');
      expect(controls[1].it).toBe('222');
      expect(controls[2].it).toBe('333');
      expect(controls[3].it).toBe('444');
    });
    it('is updated by nested control', () => {
      initControls[1].it = 'xxx';
      expect(list.it).toEqual(['11', 'xxx', '33']);
    });
  });

  describe('controls', () => {

    let onUpdate: Mock<void, [InList.Entry<string>[], InList.Entry<string>[]]>;
    let updatesSupply: EventSupply;
    let readSnapshot: Mock<void, [InList.Snapshot<string>]>;
    let snapshotSupply: EventSupply;
    let snapshot: InList.Snapshot<string>;
    let controlValues: string[];

    beforeEach(() => {
      updatesSupply = list.controls.on(onUpdate = jest.fn());
      snapshot = undefined!;
      snapshotSupply = list.controls.read(readSnapshot = jest.fn(shot => {
        snapshot = shot;
        controlValues = [...shot].map(c => c.it);
      }));
      readSnapshot.mockClear();
    });

    it('contains controls initially', () => {
      expect(controlValues).toEqual(['11', '22', '33']);
      expect(snapshot).toHaveLength(3);
      expect(initControls).toHaveLength(3);
      expect([...snapshot.entries()]).toEqual([[0, initControls[0]], [1, initControls[1]], [2, initControls[2]]]);
      expect(snapshot.item(0)).toBe(initControls[0]);
      expect(snapshot.item(1)).toBe(initControls[1]);
      expect(snapshot.item(2)).toBe(initControls[2]);
      expect(snapshot.item(3)).toBeUndefined();
      expect(snapshot.item(-1)).toBeUndefined();
    });

    describe('set', () => {

      let supply: EventSupply;

      beforeEach(() => {
        supply = list.controls.set(1, ctrl2);
      });

      it('replaces control', () => {
        expect(snapshot).toHaveLength(3);
        expect(snapshot.item(1)).toBe(ctrl2);
        expect([...snapshot]).toEqual([initControls[0], ctrl2, initControls[2]]);
      });
      it('replaces control with itself', () => {

        const newSupply = list.controls.set(1, ctrl2);

        expect(supply.isOff).toBe(true);
        expect(newSupply.isOff).toBe(false);
        expect(snapshot).toHaveLength(3);
        expect(snapshot.item(1)).toBe(ctrl2);
        expect([...snapshot]).toEqual([initControls[0], ctrl2, initControls[2]]);

        newSupply.off();
        expect([...snapshot]).toEqual([initControls[0], initControls[2]]);
      });
      it('sends update', () => {
        expect(onUpdate).toHaveBeenCalledWith([[1, ctrl2]], [[1, initControls[1]]]);
      });
      it('updates model', () => {
        expect(list.it).toEqual(['11', '2', '33']);
      });
      it('registers control parent', () => {
        ctrl2.aspect(InParents).read().once(parents => expect([...parents]).toEqual([{ parent: list }]));
      });
      it('removes control once returned supply cut off', () => {
        supply.off();
        expect([...snapshot]).toEqual([initControls[0], initControls[2]]);
      });
      it('cuts off the supply of replaced control', () => {
        list.controls.set(1, ctrl3);
        expect([...snapshot]).toEqual([initControls[0], ctrl3, initControls[2]]);

        const whenOff = jest.fn();

        supply.whenOff(whenOff);
        expect(whenOff).toHaveBeenCalledWith(undefined);
      });
    });

    describe('remove one', () => {
      beforeEach(() => {
        list.controls.remove(1);
      });

      it('replaces control', () => {
        expect(snapshot).toHaveLength(2);
        expect([...snapshot]).toEqual([initControls[0], initControls[2]]);
      });
      it('sends update', () => {
        expect(onUpdate).toHaveBeenCalledWith([], [[1, initControls[1]]]);
      });
      it('updates model', () => {
        expect(list.it).toEqual(['11', '33']);
      });
      it('removes control parent', () => {
        initControls[1].aspect(InParents).read().once(parents => expect([...parents]).toHaveLength(0));
      });
    });

    describe('remove many', () => {
      beforeEach(() => {
        list.controls.remove(1, 3);
      });

      it('replaces control', () => {
        expect(snapshot).toHaveLength(1);
        expect([...snapshot]).toEqual([initControls[0]]);
      });
      it('sends update', () => {
        expect(onUpdate).toHaveBeenCalledWith([], [[1, initControls[1]], [2, initControls[2]]]);
      });
      it('updates model', () => {
        expect(list.it).toEqual(['11']);
      });
    });

    describe('add', () => {
      beforeEach(() => {
        list.controls.add(ctrl1, ctrl2, ctrl3);
      });

      it('appends controls', () => {
        expect(snapshot).toHaveLength(6);
        expect(snapshot.item(3)).toBe(ctrl1);
        expect(snapshot.item(4)).toBe(ctrl2);
        expect(snapshot.item(5)).toBe(ctrl3);
        expect([...snapshot]).toEqual([...initControls, ctrl1, ctrl2, ctrl3]);
      });
      it('sends update', () => {
        expect(onUpdate).toHaveBeenCalledWith([[3, ctrl1], [4, ctrl2], [5, ctrl3]], []);
      });
      it('updates model', () => {
        expect(list.it).toEqual(['11', '22', '33', '1', '2', '3']);
      });
      it('appends the same control again', () => {

        const supply1 = list.controls.add(ctrl2);
        const supply2 = list.controls.add(ctrl2);

        expect([...snapshot]).toEqual([...initControls, ctrl1, ctrl2, ctrl3, ctrl2, ctrl2]);

        supply2.off();
        expect([...snapshot]).toEqual([...initControls, ctrl1, ctrl2, ctrl3, ctrl2]);
        expect(supply1.isOff).toBe(false);

        supply1.off();
        expect([...snapshot]).toEqual([...initControls, ctrl1, ctrl2, ctrl3]);
      });
    });

    describe('insert', () => {

      let supply: EventSupply;

      beforeEach(() => {
        supply = list.controls.insert(1, ctrl1, ctrl2);
      });

      it('inserts controls', () => {
        expect(snapshot).toHaveLength(5);
        expect(snapshot.item(1)).toBe(ctrl1);
        expect(snapshot.item(2)).toBe(ctrl2);
        expect([...snapshot]).toEqual([initControls[0], ctrl1, ctrl2, initControls[1], initControls[2]]);
      });
      it('sends update', () => {
        expect(onUpdate).toHaveBeenCalledWith([[1, ctrl1], [2, ctrl2]], []);
      });
      it('updates model', () => {
        expect(list.it).toEqual(['11', '1', '2', '22', '33']);
      });
      it('removes inserted control once returned supply cut off', () => {
        supply.off();
        expect([...snapshot]).toEqual([initControls[0], initControls[1], initControls[2]]);
      });
    });

    describe('splice', () => {
      beforeEach(() => {
        list.controls.splice(1, 2, ctrl1, ctrl2);
      });

      it('replaces controls', () => {
        expect(snapshot).toHaveLength(3);
        expect(snapshot.item(1)).toBe(ctrl1);
        expect(snapshot.item(2)).toBe(ctrl2);
        expect([...snapshot]).toEqual([initControls[0], ctrl1, ctrl2]);
      });
      it('sends update', () => {
        expect(onUpdate).toHaveBeenCalledWith([[1, ctrl1], [2, ctrl2]], [[1, initControls[1]], [2, initControls[2]]]);
      });
      it('updates model', () => {
        expect(list.it).toEqual(['11', '1', '2']);
      });
    });

    describe('splice none', () => {
      it('does not send updates', () => {
        list.controls.splice(3, 5);
        expect(onUpdate).not.toHaveBeenCalled();
        expect(readSnapshot).not.toHaveBeenCalled();
      });
    });

    describe('clear', () => {
      beforeEach(() => {
        list.controls.clear();
      });

      it('removes all controls', () => {
        expect(snapshot).toHaveLength(0);
        expect([...snapshot]).toHaveLength(0);
      });
      it('sends update', () => {
        expect(onUpdate).toHaveBeenCalledWith(
            [],
            initControls.map((ctrl, i) => [i, ctrl] as const),
        );
      });
      it('updates model', () => {
        expect(list.it).toHaveLength(0);
      });
    });

    describe('control removal', () => {
      beforeEach(() => {
        initControls[1].done();
      });

      it('removes control from list', () => {
        expect(snapshot).toHaveLength(2);
        expect([...snapshot]).toEqual([initControls[0], initControls[2]]);
      });
      it('updates model', () => {
        expect(list.it).toEqual(['11', '33']);
      });
    });

    describe('read', () => {
      beforeEach(() => {
        snapshotSupply.off();
      });

      it('sends the same snapshot instance without modifications', () => {
        list.controls.read().once(shot => expect(shot).toBe(snapshot));
      });
      it('sends another snapshot instance after modifications', () => {
        list.controls.add(ctrl1);
        list.controls.add(ctrl2);
        list.controls.read().once(shot => expect(shot).not.toBe(snapshot));
      });
    });

    describe('done', () => {
      it('removes all controls', () => {
        list.done();
        list.controls.read().once(shot => expect(shot).toHaveLength(0));
      });
      it('stops sending updated', () => {

        const reason = 'some reason';
        const snapshotsDone = jest.fn();
        const updatesDone = jest.fn();

        snapshotSupply.whenOff(snapshotsDone);
        updatesSupply.whenOff(updatesDone);

        list.done(reason);

        expect(snapshotsDone).toHaveBeenCalledWith(reason);
        expect(updatesDone).toHaveBeenCalledWith(reason);
      });
      it('clears model', () => {
         list.done();
         expect(list.it).toHaveLength(0);
      });
    });
  });

  describe('InData', () => {

    let data: InData.DataType<readonly string[]>;

    beforeEach(() => {
      list.aspect(InData).to(d => data = d);
    });

    it('contains all data by default', () => {
      expect(data).toEqual(['11', '22', '33']);
    });
    it('has no data when list is disabled', () => {
      list.aspect(InMode).own.it = 'off';
      expect(data).toBeUndefined();
    });
    it('removes item when corresponding control is disabled', () => {
      initControls[1].aspect(InMode).own.it = 'off';
      expect(data).toEqual(['11', '33']);
    });
  });

});
