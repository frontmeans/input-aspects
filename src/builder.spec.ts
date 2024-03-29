import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { noop } from '@proc7ts/primitives';
import { knownInAspect, nullInAspect } from './applied-aspect';
import { InAspect, InAspect__symbol } from './aspect';
import { InBuilder } from './builder';
import { InControl } from './control';
import { inValue } from './value.control';

describe('InBuilder', () => {
  let builder: InBuilder<InControl<string>>;

  beforeEach(() => {
    builder = new InBuilder<InControl<string>>();
  });

  function createControl(): InControl<string> {
    return builder.build(opts => inValue('test', opts));
  }

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

    function applied<TValue>(
      ctr: InControl<TValue>,
      suffix: string,
    ): InAspect.Applied<TValue, () => string> {
      return {
        instance: () => `${ctr.it}${suffix}`,
        convertTo<TTargetValue>(target: InControl<TTargetValue>) {
          // Each conversion applies `!` suffix
          return applied(target, `${suffix}!`);
        },
      };
    }
  });

  const CustomAspect: InAspect<string | null> & InAspect.Key<string | null> = {
    get [InAspect__symbol]() {
      return this;
    },
    applyTo() {
      return nullInAspect();
    },
  };

  describe('addAspect', () => {
    it('adds aspect', () => {
      builder.addAspect(CustomAspect, {
        applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
          _aspect: InAspect<any, any>,
        ): InAspect.Application.Result<TInstance, string, TKind> | undefined {
          return knownInAspect('custom') as InAspect.Application.Result<TInstance, string, TKind>;
        },
      });

      const control = createControl();

      expect(control.aspect(CustomAspect)).toBe('custom');
    });
    it('adds aspect more than once', () => {
      builder.addAspect(CustomAspect, {
        applyAspect: noop,
      });
      builder.addAspect(CustomAspect, {
        applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
          _aspect: InAspect<any, any>,
        ): InAspect.Application.Result<TInstance, string, TKind> | undefined {
          return knownInAspect('custom') as InAspect.Application.Result<TInstance, string, TKind>;
        },
      });

      const control = createControl();

      expect(control.aspect(CustomAspect)).toBe('custom');
    });
  });

  describe('addAspects', () => {
    it('returns `this` instance', () => {
      expect(builder.addAspects()).toBe(builder);
    });
    it('adds aspects', () => {
      builder.addAspects({
        applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
          aspect: InAspect<any, any>,
        ): InAspect.Application.Result<TInstance, string, TKind> | undefined {
          if (aspect === CustomAspect) {
            return knownInAspect('custom') as InAspect.Application.Result<TInstance, string, TKind>;
          }

          return;
        },
      });

      const control = createControl();

      expect(control.aspect(CustomAspect)).toBe('custom');
    });
    it('adds aspects more than once', () => {
      builder.addAspects({
        applyAspect: noop,
      });
      builder.addAspects({
        applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
          aspect: InAspect<any, any>,
        ): InAspect.Application.Result<TInstance, string, TKind> | undefined {
          if (aspect === CustomAspect) {
            return knownInAspect('custom') as InAspect.Application.Result<TInstance, string, TKind>;
          }

          return;
        },
      });

      const control = createControl();

      expect(control.aspect(CustomAspect)).toBe('custom');
    });
    it('is applied after concrete aspect', () => {
      builder.addAspects({
        applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
          aspect: InAspect<any, any>,
        ): InAspect.Application.Result<TInstance, string, TKind> | undefined {
          if (aspect === CustomAspect) {
            return knownInAspect('common') as InAspect.Application.Result<TInstance, string, TKind>;
          }

          return;
        },
      });
      builder.addAspect(CustomAspect, {
        applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
          _aspect: InAspect<any, any>,
        ): InAspect.Application.Result<TInstance, string, TKind> | undefined {
          return knownInAspect('concrete') as InAspect.Application.Result<TInstance, string, TKind>;
        },
      });

      const control = createControl();

      expect(control.aspect(CustomAspect)).toBe('concrete');
    });
  });

  describe('setup', () => {
    it('configures control', () => {
      const setup1 = jest.fn();
      const setup2 = jest.fn();

      expect(builder.setup(setup1)).toBe(builder);
      expect(builder.setup(setup2)).toBe(builder);
      expect(setup1).not.toHaveBeenCalled();
      expect(setup2).not.toHaveBeenCalled();

      const control = createControl();

      expect(setup1).toHaveBeenCalledWith(control);
      expect(setup2).toHaveBeenCalledWith(control);
    });
    it('configures aspect', () => {
      const setup1 = jest.fn();
      const setup2 = jest.fn();

      expect(builder.setup(TestAspect, setup1)).toBe(builder);
      expect(builder.setup(TestAspect, setup2)).toBe(builder);
      expect(setup1).not.toHaveBeenCalled();
      expect(setup2).not.toHaveBeenCalled();

      const control = createControl();

      expect(setup1).toHaveBeenCalledWith(control.aspect(TestAspect), control);
      expect(setup2).toHaveBeenCalledWith(control.aspect(TestAspect), control);
    });
  });
});
