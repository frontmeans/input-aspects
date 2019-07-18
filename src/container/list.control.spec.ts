import { EventInterest } from 'fun-events';
import { InControl } from '../control';
import { InData, InMode } from '../submit';
import { inValue } from '../value';
import { inList, InList } from './list.control';
import { InParents } from './parents.aspect';
import Mock = jest.Mock;

describe('InList', () => {

  let ctrl1: InControl;
  let ctrl2: InControl;
  let ctrl3: InControl;
  let list: InList<string>;

  beforeEach(() => {
    ctrl1 = inValue('1');
    ctrl2 = inValue('2');
    ctrl3 = inValue('3');
    list = inList(['11', '22', '33']);
  });

  let initControls: InControl<string>[];

  beforeEach(() => {
    list.controls.read.once(snapshot => initControls = [...snapshot]);
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

      list.controls.read.once(snapshot => controls = [...snapshot]);

      expect(controls).toEqual([initControls[0], initControls[1]]);
      expect(controls[0].it).toBe('111');
      expect(controls[1].it).toBe('222');
    });
    it('appends missing controls', () => {
      list.it = ['111', '222', '333', '444'];

      let controls: InControl<any>[] = [];

      list.controls.read.once(snapshot => controls = [...snapshot]);

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
    let updatesInterest: EventInterest;
    let readSnapshot: Mock<void, [InList.Snapshot<string>]>;
    let snapshotInterest: EventInterest;
    let snapshot: InList.Snapshot<string>;
    let controlValues: string[];

    beforeEach(() => {
      updatesInterest = list.controls.on(onUpdate = jest.fn());
      snapshotInterest = list.controls.read(readSnapshot = jest.fn(shot => {
        snapshot = shot;
        controlValues = [...shot].map(c => c.it);
      }));
      expect(readSnapshot).toHaveBeenCalledWith(snapshot);
      readSnapshot.mockClear();
    });

    it('contains controls initially', () => {
      expect(controlValues).toEqual(['11', '22', '33']);
      expect(snapshot.length).toBe(3);
      expect(initControls.length).toBe(3);
      expect([...snapshot.entries()]).toEqual([[0, initControls[0]], [1, initControls[1]], [2, initControls[2]]]);
      expect(snapshot.item(0)).toBe(initControls[0]);
      expect(snapshot.item(1)).toBe(initControls[1]);
      expect(snapshot.item(2)).toBe(initControls[2]);
      expect(snapshot.item(3)).toBeUndefined();
      expect(snapshot.item(-1)).toBeUndefined();
    });

    describe('set', () => {
      beforeEach(() => {
        expect(list.controls.set(1, ctrl2)).toBe(list.controls);
      });

      it('replaces control', () => {
        expect(snapshot.length).toBe(3);
        expect(snapshot.item(1)).toBe(ctrl2);
        expect([...snapshot]).toEqual([initControls[0], ctrl2, initControls[2]]);
      });
      it('sends update', () => {
        expect(onUpdate).toHaveBeenCalledWith([[1, ctrl2]], [[1, initControls[1]]]);
      });
      it('updates model', () => {
        expect(list.it).toEqual(['11', '2', '33']);
      });
      it('registers control parent', () => {
        ctrl2.aspect(InParents).read.once(parents => expect([...parents]).toEqual([{ parent: list }]));
      });
    });

    describe('remove one', () => {
      beforeEach(() => {
        expect(list.controls.remove(1)).toBe(list.controls);
      });

      it('replaces control', () => {
        expect(snapshot.length).toBe(2);
        expect([...snapshot]).toEqual([initControls[0], initControls[2]]);
      });
      it('sends update', () => {
        expect(onUpdate).toHaveBeenCalledWith([], [[1, initControls[1]]]);
      });
      it('updates model', () => {
        expect(list.it).toEqual(['11', '33']);
      });
      it('removes control parent', () => {
        initControls[1].aspect(InParents).read.once(parents => expect([...parents]).toHaveLength(0));
      });
    });

    describe('remove many', () => {
      beforeEach(() => {
        expect(list.controls.remove(1, 3)).toBe(list.controls);
      });

      it('replaces control', () => {
        expect(snapshot.length).toBe(1);
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
        expect(list.controls.add(ctrl1, ctrl2, ctrl3)).toBe(list.controls);
      });

      it('appends controls', () => {
        expect(snapshot.length).toBe(6);
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
    });

    describe('insert', () => {
      beforeEach(() => {
        expect(list.controls.insert(1, ctrl1, ctrl2)).toBe(list.controls);
      });

      it('inserts controls', () => {
        expect(snapshot.length).toBe(5);
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
    });

    describe('splice', () => {
      beforeEach(() => {
        expect(list.controls.splice(1, 2, ctrl1, ctrl2)).toBe(list.controls);
      });

      it('replaces controls', () => {
        expect(snapshot.length).toBe(3);
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

    describe('control removal', () => {
      beforeEach(() => {
        initControls[1].done();
      });

      it('removes control from list', () => {
        expect(snapshot.length).toBe(2);
        expect([...snapshot]).toEqual([initControls[0], initControls[2]]);
      });
      it('updates model', () => {
        expect(list.it).toEqual(['11', '33']);
      });
    });

    describe('read', () => {
      beforeEach(() => {
        snapshotInterest.off();
      });

      it('sends the same snapshot instance without modifications', () => {
        list.controls.read.once(shot => expect(shot).toBe(snapshot));
      });
      it('sends another snapshot instance after modifications', () => {
        list.controls.add(ctrl1);
        list.controls.add(ctrl2);
        list.controls.read.once(shot => expect(shot).not.toBe(snapshot));
      });
    });

    describe('done', () => {
      it('removes all controls', () => {
        list.done();
        list.controls.read.once(shot => expect(shot.length).toBe(0));
      });
      it('stops sending updated', () => {

        const reason = 'some reason';
        const snapshotsDone = jest.fn();
        const updatesDone = jest.fn();

        snapshotInterest.whenDone(snapshotsDone);
        updatesInterest.whenDone(updatesDone);

        list.done(reason);

        expect(snapshotsDone).toBeCalledWith(reason);
        expect(updatesDone).toBeCalledWith(reason);
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
      list.aspect(InData)(d => data = d);
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
