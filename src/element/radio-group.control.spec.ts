import { EventSupply } from 'fun-events';
import { inRadioGroup, InRadioGroup } from './radio-group.control';
import { inRadio, InRadio } from './radio.control';
import Mock = jest.Mock;

describe('InRadioGroup', () => {

  type TestValue = 'a' | 'b' | 'c' | undefined;

  let control: InRadioGroup<TestValue>;
  let radioA: InRadio;
  let radioB: InRadio;
  let radioC: InRadio;

  beforeEach(() => {
    radioA = newRadio();
    radioB = newRadio();
    radioC = newRadio();
    control = inRadioGroup({ a: radioA, b: radioB, c: radioC });
  });

  let readChecked: Mock<void, [TestValue]>;
  let checkSupply: EventSupply;
  let onCheckUpdate: Mock<void, [TestValue, TestValue]>;
  let checkUpdatesSupply: EventSupply;

  beforeEach(() => {
    checkSupply = control.read(readChecked = jest.fn());
    checkUpdatesSupply = control.on(onCheckUpdate = jest.fn());
  });

  it('reflects unchecked radio buttons', () => {
    expect(control.it).toBeUndefined();
    expect(readChecked).toHaveBeenLastCalledWith(undefined);
    expect(onCheckUpdate).not.toHaveBeenCalled();
  });
  it('reflects checked radio button', () => {
    radioB.it = true;
    expect(control.it).toBe('b');
    expect(readChecked).toHaveBeenLastCalledWith('b');
    expect(onCheckUpdate).toHaveBeenLastCalledWith('b', undefined);
    expect(radioB.element.checked).toBe(true);
  });
  it('checks matching radio button', () => {
    control.it = 'c';
    expect(control.it).toBe('c');
    expect(readChecked).toHaveBeenLastCalledWith('c');
    expect(onCheckUpdate).toHaveBeenLastCalledWith('c', undefined);
    expect(radioC.it).toBe(true);
  });
  it('un-checks no longer matching radio button', () => {
    control.it = 'c';
    control.it = 'a';
    expect(control.it).toBe('a');
    expect(readChecked).toHaveBeenLastCalledWith('a');
    expect(onCheckUpdate).toHaveBeenLastCalledWith('a', 'c');
    expect(radioA.it).toBe(true);
    expect(radioC.it).toBeUndefined();
  });
  it('un-checks all radio buttons when set to `undefined`', () => {
    control.it = 'c';
    control.it = undefined;
    expect(control.it).toBeUndefined();
    expect(readChecked).toHaveBeenLastCalledWith(undefined);
    expect(onCheckUpdate).toHaveBeenLastCalledWith(undefined, 'c');
    expect(radioA.it).toBeUndefined();
    expect(radioB.it).toBeUndefined();
    expect(radioC.it).toBeUndefined();
  });
  it('un-checks all radio buttons when set to missing value', () => {
    control.it = 'c';
    control.it = 'd' as TestValue;
    expect(control.it).toBeUndefined();
    expect(readChecked).toHaveBeenLastCalledWith(undefined);
    expect(onCheckUpdate).toHaveBeenLastCalledWith(undefined, 'c');
    expect(radioA.it).toBeUndefined();
    expect(radioB.it).toBeUndefined();
    expect(radioC.it).toBeUndefined();
  });

  describe('done', () => {
    it('stops updates reporting', () => {

      const checkDone = jest.fn();
      const checkUpdatesDone = jest.fn();

      checkSupply.whenOff(checkDone);
      checkUpdatesSupply.whenOff(checkUpdatesDone);

      const reason = 'some reason';

      control.done(reason);

      expect(checkDone).toHaveBeenCalledWith(reason);
      expect(checkUpdatesDone).toHaveBeenCalledWith(reason);
    });
  });

  describe('with customized values', () => {

    let control2: InRadioGroup<'a' | 'b' | 'c' | '_'>;

    beforeEach(() => {
      control2 = inRadioGroup<'a' | 'b' | 'c' | '_'>({ a: radioA, b: radioB }, { unchecked: '_' });
    });

    it('reflects unchecked radio buttons', () => {
      expect(control2.it).toBe('_');
    });
    it('un-checks all radio button when set unchecked', () => {
      control2.it = 'c';
      control2.it = '_';
      expect(control2.it).toBe('_');
      expect(radioA.it).toBeUndefined();
      expect(radioB.it).toBeUndefined();
      expect(radioC.it).toBeUndefined();
    });
  });

  function newRadio(): InRadio {

    const input = document.createElement('input');

    input.type = 'radio';

    return inRadio(input);
  }

});
