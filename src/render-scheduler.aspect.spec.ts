import { newManualRenderScheduler, newRenderSchedule } from 'render-scheduler';
import { InControl } from './control';
import { InRenderScheduler } from './render-scheduler.aspect';
import { inValue } from './value';

describe('InRenderScheduler', () => {
  it('is `newRenderSchedule` by default', () => {
    expect(inValue(1).aspect(InRenderScheduler)).toBe(newRenderSchedule);
  });
  it('is preserved when converted by default', () => {

    const control = inValue(1);
    const converted = control.convert();

    expect(converted.aspect(InRenderScheduler)).toBe(control.aspect(InRenderScheduler));
  });

  describe('to', () => {

    let control: InControl<number>;

    beforeEach(() => {
      control = inValue(1);
    });

    it('replaces render scheduler when requested', () => {

      const scheduler = newManualRenderScheduler();
      const converted = control.convert(InRenderScheduler.to(scheduler));

      expect(converted.aspect(InRenderScheduler)).toBe(scheduler);
    });
  });
});
