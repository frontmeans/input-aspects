import { requireNothing } from './require-nothing.validator';

describe('requireNothing', () => {
  it('sends empty messages', () => {

    const receiver = jest.fn();

    requireNothing().to(receiver);
    expect(receiver).toHaveBeenCalledWith();
  });
});
