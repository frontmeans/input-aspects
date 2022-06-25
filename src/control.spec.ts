import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Supply } from '@proc7ts/supply';
import { Mock } from 'jest-mock';
import { knownInAspect } from './applied-aspect';
import { InAspect, InAspect__symbol } from './aspect';
import { InControl, inValueOf } from './control';
import { InConverter } from './converter';
import { InData } from './data';
import { inValue } from './value.control';

describe('InControl', () => {

  let control: InControl<string>;

  type ConversionFactory = InConverter.Factory<string, number>;

  beforeEach(() => {
    control = inValue('old');
  });

  let TestAspect: InAspect<() => string> & InAspect.Key<() => string>;

  beforeEach(() => {
    TestAspect = {
      get [InAspect__symbol]() {
        return this;
      },
      applyTo<TValue>(ctr: InControl<TValue>) {
        return applied(ctr, '');
      },
    };

    function applied<TValue>(ctr: InControl<TValue>, suffix: string): InAspect.Applied<TValue, () => string> {
      return {
        instance: () => `${ctr.it}${suffix}`,
        convertTo<TTargetValue>(target: InControl<TTargetValue>) {
          // Each conversion applies `!` suffix
          return applied(target, `${suffix}!`);
        },
      };
    }
  });

  describe('aspect', () => {
    it('retrieves aspect', () => {

      const aspect = control.aspect(TestAspect);

      expect(aspect()).toBe('old');
      control.it = 'new';
      expect(aspect()).toBe('new');
    });
    it('caches retrieved aspect', () => {
      expect(control.aspect(TestAspect)).toBe(control.aspect(TestAspect));
    });
  });

  describe('setup', () => {
    it('configures control', () => {

      const setup = jest.fn();

      expect(control.setup(setup)).toBe(control);
      expect(setup).toHaveBeenCalledWith(control);
    });
    it('configures aspect', () => {

      const setup = jest.fn();

      expect(control.setup(TestAspect, setup)).toBe(control);
      expect(setup).toHaveBeenCalledWith(control.aspect(TestAspect), control);
    });
  });

  describe('convert', () => {

    let converted: InControl<number>;
    let set: (from: string) => number;
    let get: (from: number) => string;

    beforeEach(() => {
      set = from => from.length;
      get = from => '*'.repeat(from);
      converted = control.convert({ set, get });
    });

    it('converts initial value', () => {
      expect(converted.it).toBe(3);
      expect(control.it).toBe('old');
    });
    it('updates converted control', () => {
      control.it = 'other';
      expect(converted.it).toBe(5);
      expect(control.it).toBe('other');
    });
    it('updates original value', () => {
      converted.it = 4;
      expect(control.it).toBe('****');
      expect(converted.it).toBe(4);
    });
    it('converts aspect', () => {
      expect(converted.aspect(TestAspect)()).toBe('3!');
      control.it = 'other';
      expect(converted.aspect(TestAspect)()).toBe('5!');
    });
    it('converts converted aspect', () => {

      const converted2 = converted.convert();

      expect(converted2.aspect(TestAspect)()).toBe('3!!');
      control.it = 'other';
      expect(converted2.aspect(TestAspect)()).toBe('5!!');
    });
    it('does not convert value without converters', () => {

      const converted2 = control.convert();

      expect(converted2).not.toBe(control);
      expect(converted2.it).toBe(control.it);

      control.it = 'other';
      expect(converted2.it).toBe(control.it);

      converted2.it = 'third';
      expect(converted2.it).toBe(control.it);
    });
    it('converts with conversion factory', () => {

      const by = jest.fn<ConversionFactory>(() => ({ set, get }));

      converted = control.convert(by);
      expect(by).toHaveBeenCalledWith(control, converted);
      expect(converted.it).toBe(3);

      converted.it = 5;
      expect(control.it).toBe('*****');
    });
    it('converts aspect when `applyAspect` specified', () => {

      const instance = { name: 'data' };
      const applyAspect = jest.fn<(aspect: unknown) => any>(
          (aspect: unknown) => aspect === InData[InAspect__symbol] ? knownInAspect(instance) : undefined);

      converted = control.convert({ set, get, applyAspect });
      void expect(converted.aspect(InData)).toBe(instance);
      expect(applyAspect).toHaveBeenCalledWith(InData[InAspect__symbol]);
    });
    it('converts aspect with default algorithm if `applyAspect` omitted', () => {
      converted = control.convert({ set, get });
      void expect(converted.aspect(InData)).toBeDefined();
    });
    it('converts aspect with default algorithm if `applyAspect` returns nothing', () => {

      const applyAspect = jest.fn<(aspect: unknown) => any>();

      converted = control.convert({ set, get, applyAspect });
      void expect(converted.aspect(InData)).toBeDefined();
      expect(applyAspect).toHaveBeenCalledWith(InData[InAspect__symbol]);
    });

    describe('on', () => {

      let receiver: Mock<(arg: string) => void>;
      let convertedReceiver: Mock<(value1: number, value2: number) => void>;
      let convertedSupply: Supply;

      beforeEach(() => {
        control.on(receiver = jest.fn());
        convertedSupply = converted.on(convertedReceiver = jest.fn());
      });

      it('receives updates from origin', () => {
        control.it = 'other';
        expect(convertedReceiver).toHaveBeenCalledWith(5, 3);
      });
      it('does not receive updates from origin for unchanged value', () => {
        control.it = 'new';
        expect(convertedReceiver).not.toHaveBeenCalled();
        expect(receiver).toHaveBeenCalledTimes(1);
      });
      it('sends update to origin', () => {
        converted.it = 4;
        expect(receiver).toHaveBeenCalledWith('****', 'old');
        expect(convertedReceiver).toHaveBeenCalledWith(4, 3);
      });
      it('does not send updates for unchanged value', () => {
        converted.it = 3;
        expect(receiver).not.toHaveBeenCalled();
        expect(convertedReceiver).not.toHaveBeenCalled();
      });
      it('is done when origin is done', () => {

        const done = jest.fn();

        convertedSupply.whenOff(done);

        control.supply.off('reason');
        expect(done).toHaveBeenCalledWith('reason');
      });
      it('is done when converted is done', () => {

        const done = jest.fn();

        convertedSupply.whenOff(done);

        control.supply.off('reason');
        expect(done).toHaveBeenCalledWith('reason');
      });
    });
  });
});

describe('inValueOf', () => {

  let original: InControl<string>;
  let control: InControl<string>;

  beforeEach(() => {
    original = inValue('test');
    control = inValueOf(original);
  });

  describe('it', () => {
    it('has original value', () => {
      expect(control.it).toBe('test');
    });
    it('updates original value', () => {
      control.it = 'other';
      expect(original.it).toBe('other');
    });
  });

  describe('on', () => {
    it('sends updates', () => {

      const receiver = jest.fn();

      control.on(receiver);
      original.it = 'other';
      expect(receiver).toHaveBeenCalledWith('other', 'test');
      expect(receiver).toHaveBeenCalledTimes(1);
    });
  });

  describe('[OnEvent__symbol]', () => {
    it('depends on original one', () => {

      const whenOff = jest.fn();

      control.supply.whenOff(whenOff);

      const reason = 'test reason';

      original.supply.off(reason);
      expect(whenOff).toHaveBeenCalledWith(reason);
    });
    it('is not a dependency of original one', () => {
      control.supply.off();

      expect(control.supply.isOff).toBe(true);
      expect(original.supply.isOff).toBe(false);
    });
  });
});
