import { describe, expect, it, jest } from '@jest/globals';
import { requireNothing } from './require-nothing.validator';

describe('requireNothing', () => {
  it('sends empty messages', () => {
    const receiver = jest.fn();

    requireNothing()(receiver);
    expect(receiver).toHaveBeenCalledWith(...([] as unknown[] as [unknown, unknown[]]));
  });
});
