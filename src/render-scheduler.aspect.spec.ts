import { newManualRenderScheduler, newRenderSchedule } from 'render-scheduler';
import { InControl } from './control';
import { inText, InText } from './element';
import { InElement } from './element.control';
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

    let input: HTMLInputElement;
    let control: InText;
    let scheduler: InRenderScheduler;
    let converted: InControl<string>;

    beforeEach(() => {
      input = document.createElement('input');
      control = inText(input);
      scheduler = newManualRenderScheduler();
      converted = control.convert(InRenderScheduler.to(scheduler));
    });

    it('replaces render scheduler', () => {
      expect(converted.aspect(InRenderScheduler)).toBe(scheduler);
    });
    it('preserves input element', () => {
      expect(converted.aspect(InElement)).toBe(control.aspect(InElement));
    });
  });
});
