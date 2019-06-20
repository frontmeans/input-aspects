import { asis } from 'call-thru';
import { EventInterest } from 'fun-events';
import { InAspect, InAspect__symbol } from './in-aspect';
import { InControl } from './in-control';
import { InValue } from './in-value';
import Mock = jest.Mock;

describe('InControl', () => {

  let control: InControl;
  type ConverterGenerator = InControl.ConverterGenerator<string, number>;

  beforeEach(() => {
    control = new InValue('old');
  });

  let TestAspect: InAspect<'default', () => string> & InAspect.Key<'default', () => string>;

  beforeEach(() => {
    TestAspect = {
      get [InAspect__symbol]() {
        return this;
      },
      applyTo<V>(ctr: InControl<V>) {
        return applied(ctr, '');
      },
    };

    function applied<V>(ctr: InControl<V>, suffix: string): InAspect.Applied<() => string, V> {
      return {
        instance: () => `${ctr.it}${suffix}`,
        convertTo<C>(target: InControl<C>) {
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

  describe('convert', () => {

    let converted: InControl<number>;
    let set: (from: string) => number;
    let get: (from: number) => string;

    beforeEach(() => {
      set = from => from.length;
      get = from => '*'.repeat(from);
      converted = control.convert(set, get);
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

      const converted2 = converted.convert(asis, asis);

      expect(converted2.aspect(TestAspect)()).toBe('3!!');
      control.it = 'other';
      expect(converted2.aspect(TestAspect)()).toBe('5!!');
    });
    it('converts with converter generator', () => {

      const by = jest.fn<ReturnType<ConverterGenerator>, Parameters<ConverterGenerator>>(() => [set, get]);

      converted = control.convert(by);
      expect(by).toHaveBeenCalledWith(control, converted);
      expect(converted.it).toBe(3);

      converted.it = 5;
      expect(control.it).toBe('*****');
    });

    describe('on', () => {

      let receiver: Mock;
      let interest: EventInterest;
      let convertedReceiver: Mock;
      let convertedInterest: EventInterest;

      beforeEach(() => {
        interest = control.on(receiver = jest.fn());
        convertedInterest = converted.on(convertedReceiver = jest.fn());
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

        convertedInterest.whenDone(done);

        control.done('reason');
        expect(done).toHaveBeenCalledWith('reason');
      });
      it('is done when converted is done', () => {

        const done = jest.fn();

        convertedInterest.whenDone(done);

        control.done('reason');
        expect(done).toHaveBeenCalledWith('reason');
      });
    });
  });
});
