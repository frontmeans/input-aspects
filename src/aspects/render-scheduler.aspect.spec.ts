import { newManualRenderScheduler, newRenderSchedule } from '@frontmeans/render-scheduler';
import { InContainer } from '../containers';
import { InControl } from '../control';
import { inValue } from '../controls';
import { InElement } from '../element.control';
import { inText, InText } from '../elements';
import { InStyledElement } from '../elements/style';
import { InRenderScheduler } from './render-scheduler.aspect';

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

    it('assigns render scheduler', () => {
      expect(converted.aspect(InRenderScheduler)).toBe(scheduler);
    });
    it('preserves other aspects element', () => {
      expect(converted.aspect(InElement)).toBe(control.aspect(InElement));
    });
    it('assigns render scheduler along with styled element', () => {

      const styled = document.createElement('div');

      converted = control.convert(
          InStyledElement.to(styled),
          InRenderScheduler.to(scheduler),
      );

      expect(converted.aspect(InContainer)).toBeNull();
      expect(converted.aspect(InStyledElement)).toBe(styled);
      expect(converted.aspect(InRenderScheduler)).toBe(scheduler);
    });
  });
});
