import { inValue } from '../value';
import { InContainer } from './container';

describe('InContainer', () => {
  it('is not available in non-container controls', () => {
    expect(inValue('some').aspect(InContainer)).toBeNull();
  });
});
