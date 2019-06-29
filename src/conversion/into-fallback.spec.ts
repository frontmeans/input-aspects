import { InControl } from '../control';
import { inValue } from '../value';
import { intoFallback } from './into-fallback';

describe('intoFallback', () => {

  let source: InControl<number>;
  let converted: InControl<number | undefined>;

  beforeEach(() => {
    source = inValue(1);
    converted = source.convert(intoFallback(0));
  });

  it('retains initial value', () => {
    expect(source.it).toBe(1);
    expect(converted.it).toBe(1);
  });
  it('retains original value', () => {
    source.it = 2;
    expect(source.it).toBe(2);
    expect(converted.it).toBe(2);
  });
  it('retains definite value assigned to converted control', () => {
    converted.it = 2;
    expect(source.it).toBe(2);
    expect(converted.it).toBe(2);
  });
  it('replaces `undefined` value assigned to converted control with fallback one', () => {
    converted.it = undefined;
    expect(source.it).toBe(0);
    expect(converted.it).toBeUndefined();
  });
  it('replaces `null` value assigned to converted control with fallback one', () => {
    converted.it = null!;
    expect(source.it).toBe(0);
    expect(converted.it).toBeNull();
  });
});
