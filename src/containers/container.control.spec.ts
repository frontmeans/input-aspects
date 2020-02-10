import { inValue } from '../controls';
import { InContainer } from './container.control';

describe('InContainer', () => {
  it('is not available in non-container controls', () => {
    expect(inValue('some').aspect(InContainer)).toBeNull();
  });
});
