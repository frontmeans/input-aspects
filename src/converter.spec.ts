import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { onceAfter } from '@proc7ts/fun-events';
import { noop } from '@proc7ts/primitives';
import { InAspect__symbol } from './aspect';
import { InControl } from './control';
import { InConverter, intoConvertedBy, isInAspectConversion } from './converter';
import { InData, InMode } from './data';
import { inValue } from './value.control';

describe('intoConverterBy', () => {

  let control: InControl<string>;

  beforeEach(() => {
    control = inValue('test');
  });

  it('returns no-op aspect conversion factory without parameters', () => {

    const converted = inValue('bar');
    const conversion: InConverter.Aspect.Conversion<string> = intoConvertedBy<string>()(control, converted);

    expect(isInAspectConversion(conversion)).toBe(true);
    expect(conversion.applyAspect(InMode[InAspect__symbol])).toBeUndefined();
  });
  it('returns the only converter', () => {

    const converter: InConverter.Aspect<string, string> = { applyAspect: noop };

    const converted = inValue('bar');
    const conversion: InConverter.Aspect.Conversion<string> = intoConvertedBy<string>(converter)(
        control,
        converted,
    );

    expect(conversion).toBe(converter);
  });
  it('returns aspect conversion factory for aspect converters', () => {

    const converter1: InConverter.Aspect<string, string> = { applyAspect: jest.fn() };
    const converter2: InConverter.Aspect<string, string> = { applyAspect: jest.fn() };

    const factory = intoConvertedBy<string>(converter1, converter2);
    const conversion: InConverter.Aspect.Conversion<string> = factory(control, inValue('bar'));

    expect(isInAspectConversion(conversion)).toBe(true);

    const converted = control.convert(factory);

    converted.aspect(InData).do(onceAfter)(noop);
    expect(converter1.applyAspect).toHaveBeenCalledWith(InData[InAspect__symbol]);
    expect(converter2.applyAspect).toHaveBeenCalledWith(InData[InAspect__symbol]);
  });
  it('returns value conversion factory for value and aspect converters', () => {

    const converter1: InConverter.Value<string, string> = {
      get: () => 'foo',
      set: () => 'bar',
    };
    const converter2: InConverter.Aspect<string, string> = { applyAspect: noop };

    const factory = intoConvertedBy(converter1, converter2);
    const conversion: InConverter.Value.Conversion<string, string> = factory(control, inValue('bar'));

    expect(isInAspectConversion(conversion)).toBe(false);

    const converted = control.convert(factory);

    expect(converted.it).toBe('bar');
    converted.it = 'other';
    expect(control.it).toBe('foo');
  });
});
