import { afterEventFrom, EventInterest, trackValue, ValueTracker } from 'fun-events';
import { inText, InText } from '../element';
import { inValue } from '../value';
import { InCssClasses } from './css-classes.aspect';

describe('InCssClasses', () => {

  let element: HTMLInputElement;
  let control: InText;
  let cssClasses: InCssClasses;
  let classMap: InCssClasses.Map;

  beforeEach(() => {
    element = document.createElement('input');
    control = inText(element);
    cssClasses = control.aspect(InCssClasses);
    cssClasses.read(map => classMap = map);
  });

  it('is empty by default', () => {
    expect(classMap).toEqual({});
  });

  describe('[AfterEvent__symbol]', () => {
    it('is the same as `read`', () => {
      expect(afterEventFrom(cssClasses)).toBe(cssClasses.read);
    });
  });

  describe('add', () => {

    let source: ValueTracker<InCssClasses.Map>;
    let interest: EventInterest;

    beforeEach(() => {
      source = trackValue({ class1: true });
      interest = cssClasses.add(source);
    });

    it('appends CSS classes', () => {
      expect(classMap).toEqual({ class1: true });
      expect(element.classList.contains('class1')).toBe(true);
    });
    it('combines CSS classes from different sources', () => {

      const source2 = trackValue({ class2: true });

      cssClasses.add(source2);
      expect(classMap).toEqual({ class1: true, class2: true });
      expect(element.classList.contains('class1')).toBe(true);
      expect(element.classList.contains('class2')).toBe(true);
    });
    it('overwrites CSS classes by most recent source', () => {

      const source2 = trackValue({ class1: false, class2: true });

      cssClasses.add(source2);
      expect(classMap).toEqual({ class1: false, class2: true });
      expect(element.classList.contains('class1')).toBe(false);
      expect(element.classList.contains('class2')).toBe(true);
    });
    it('ignores `undefined` CSS classes', () => {

      const source2 = trackValue({ class1: undefined, class2: true });

      cssClasses.add(source2);
      expect(classMap).toEqual({ class1: true, class2: true });
      expect(element.classList.contains('class1')).toBe(true);
      expect(element.classList.contains('class2')).toBe(true);
    });
    it('removes CSS classes when source removed', () => {
      interest.off();
      expect(classMap).toEqual({});
      expect(element.classList.contains('class1')).toBe(false);
    });
    it('removes CSS classes when source exhausted', () => {

      const reason = 'some reason';
      const sourceDone = jest.fn();

      interest.whenDone(sourceDone);
      source.done(reason);

      expect(sourceDone).toHaveBeenCalledWith(reason);
      expect(classMap).toEqual({});
      expect(element.classList.contains('class1')).toBe(false);
    });
  });

  describe('done', () => {

    let source: ValueTracker<InCssClasses.Map>;
    let interest: EventInterest;

    beforeEach(() => {
      source = trackValue({ class1: true });
      interest = cssClasses.add(source);
    });

    it('removes all CSS classes', () => {

      const reason = 'some reason';
      const sourceDone = jest.fn();

      interest.whenDone(sourceDone);
      cssClasses.done(reason);

      expect(sourceDone).toHaveBeenCalledWith(reason);
      expect(classMap).toEqual({});
      expect(element.classList.contains('class1')).toBe(false);
    });
  });

  describe('without element', () => {
    it('still present', () => {

      const control2 = inValue('value');

      expect(control2.aspect(InCssClasses)).toBeDefined();
    });
  });
});
