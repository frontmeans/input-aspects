import {
  immediateRenderScheduler,
  ManualRenderScheduler,
  newManualRenderScheduler,
  RenderSchedule,
  setRenderScheduler,
} from '@frontmeans/render-scheduler';
import { afterSupplied, afterThe, onceAfter, trackValue, ValueTracker } from '@proc7ts/fun-events';
import { Supply } from '@proc7ts/supply';
import { InControl } from '../../control';
import { inValue } from '../../value.control';
import { inText, InText } from '../text.control';
import { InCssClasses } from './css-classes.aspect';
import Mock = jest.Mock;

describe('InCssClasses', () => {
  beforeEach(() => {
    setRenderScheduler(immediateRenderScheduler);
  });
  afterEach(() => {
    setRenderScheduler();
  });

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
      expect(afterSupplied(cssClasses)).toBe(cssClasses.read);
    });
  });

  describe('add', () => {

    let source: ValueTracker<InCssClasses.Map>;
    let sourceSupply: Supply;

    beforeEach(() => {
      source = trackValue({ class1: true });
      sourceSupply = cssClasses.add(source);
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
    it('appends CSS classes from source function', () => {

      const source2 = jest.fn((_control: InControl<any>) => afterThe({ class2: true }));

      cssClasses.add(source2);
      expect(classMap).toEqual({ class1: true, class2: true });
      expect(element.classList.contains('class1')).toBe(true);
      expect(element.classList.contains('class2')).toBe(true);
      expect(source2).toHaveBeenCalledWith(control);
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
      sourceSupply.off();
      expect(classMap).toEqual({});
      expect(element.classList.contains('class1')).toBe(false);
    });
    it('removes CSS classes when source supply is cut off', () => {

      const reason = 'some reason';
      const sourceDone = jest.fn();

      sourceSupply.whenOff(sourceDone);
      source.supply.off(reason);

      expect(sourceDone).toHaveBeenCalledWith(reason);
      expect(classMap).toEqual({});
      expect(element.classList.contains('class1')).toBe(false);
    });
    it('removes CSS classes when input supply is cut off', () => {

      const reason = 'some reason';
      const sourceDone = jest.fn();

      sourceSupply.whenOff(sourceDone);
      control.supply.off(reason);
      expect(sourceDone).toHaveBeenCalledWith(reason);
      expect(classMap).toEqual({});
      expect(element.classList.contains('class1')).toBe(false);
    });
    it('does not add CSS classes when input supply is cut off', () => {

      const reason = 'some reason';
      const sourceDone = jest.fn();

      control.supply.off(reason);
      cssClasses.add(afterThe({ 'never-added': true })).whenOff(sourceDone);

      expect(sourceDone).toHaveBeenCalledWith(reason);
      expect(classMap).toEqual({});
      expect(element.classList.contains('never-added')).toBe(false);
    });
  });

  describe('track', () => {

    let source: ValueTracker<InCssClasses.Map>;
    let sourceSupply: Supply;
    let mockReceiver: Mock<void, [string[], string[]]>;

    beforeEach(() => {
      source = trackValue({ class1: true });
      sourceSupply = cssClasses.add(source);
      cssClasses.track(mockReceiver = jest.fn());
    });

    it('reports initial classes as added', () => {
      expect(mockReceiver).toHaveBeenLastCalledWith(['class1'], []);

      const mockReceiver2 = jest.fn();

      cssClasses.track(mockReceiver2);
      expect(mockReceiver2).toHaveBeenLastCalledWith(['class1'], []);
    });
    it('reports new classes', () => {
      source.it = { class1: true, class2: true, class3: true, class4: false };
      expect(mockReceiver).toHaveBeenLastCalledWith(['class2', 'class3'], []);
    });
    it('does not report unmodified classes', () => {
      mockReceiver.mockClear();
      source.it = { ...source.it };
      expect(mockReceiver).not.toHaveBeenCalled();
    });
    it('reports classes removal', () => {
      sourceSupply.off();
      expect(mockReceiver).toHaveBeenCalledWith([], ['class1']);
    });
    it('does not report missing classes removal', () => {
      source.it = {};
      mockReceiver.mockClear();
      sourceSupply.off();
      expect(mockReceiver).not.toHaveBeenCalled();
    });
  });

  describe('applyTo', () => {

    let source: ValueTracker<InCssClasses.Map>;
    let scheduler: ManualRenderScheduler;
    let mockSchedule: Mock<void, Parameters<RenderSchedule>>;
    let target: Element;
    let targetSupply: Supply;

    beforeEach(() => {
      source = trackValue<InCssClasses.Map>({ class2: true });
      cssClasses.add(source);
      target = document.createElement('other');
      scheduler = newManualRenderScheduler();
      mockSchedule = jest.fn(scheduler());
      targetSupply = cssClasses.applyTo(target, mockSchedule);
    });

    it('applies CSS classes in the given schedule', () => {
      expect(target.classList.contains('class2')).toBe(false);

      scheduler.render();
      expect(target.classList.contains('class2')).toBe(true);
    });

    describe('default scheduler', () => {
      beforeEach(() => {
        setRenderScheduler(scheduler);
      });
      afterEach(() => {
        setRenderScheduler();
      });

      it('is used by default', () => {

        const element3 = document.createElement('third');

        cssClasses.applyTo(element3);
        scheduler.render();
        expect(element3.classList.contains('class2')).toBe(true);
      });
    });

    it('does not schedule unchanged classes update', () => {
      mockSchedule.mockClear();
      source.it = { ...source.it };
      expect(mockSchedule).not.toHaveBeenCalled();
    });
    it('removes applied CSS classes once supply is cut off', () => {
      scheduler.render();
      expect(target.classList.contains('class2')).toBe(true);
      expect(element.classList.contains('class2')).toBe(true);

      targetSupply.off();
      scheduler.render();
      expect(target.classList.contains('class2')).toBe(false);
      expect(element.classList.contains('class2')).toBe(true);
    });
    it('does not schedule missing CSS classes removal once supply is cut off', () => {
      source.it = {};
      mockSchedule.mockClear();

      targetSupply.off();
      expect(mockSchedule).not.toHaveBeenCalled();
    });
    it('batches multiple CSS classes updates', () => {
      source.it = { class3: true };
      source.it = { class3: true, class4: true };
      scheduler.render();
      expect(target.classList.contains('class2')).toBe(false);
      expect(target.classList.contains('class3')).toBe(true);
      expect(target.classList.contains('class4')).toBe(true);
    });
  });

  describe('done', () => {

    let source: ValueTracker<InCssClasses.Map>;
    let supply: Supply;

    beforeEach(() => {
      source = trackValue({ class1: true });
      supply = cssClasses.add(source);
    });

    it('removes all CSS classes', () => {

      const reason = 'some reason';
      const sourceDone = jest.fn();

      supply.whenOff(sourceDone);
      cssClasses.done(reason);

      expect(sourceDone).toHaveBeenCalledWith(reason);
      expect(classMap).toEqual({});
      expect(element.classList.contains('class1')).toBe(false);
    });
  });

  describe('without element', () => {

    let valueControl: InControl<string>;
    let valueClasses: InCssClasses;

    beforeEach(() => {
      valueControl = inValue('value');
      valueClasses = valueControl.aspect(InCssClasses);
    });

    it('still present', () => {
      expect(valueClasses).toBeDefined();
    });
    it('reports added CSS classes', () => {

      const source = trackValue<InCssClasses.Map>({ class1: true });

      valueClasses.add(source);

      const classesReceiver = jest.fn();

      valueClasses.read.do(onceAfter)(classesReceiver);

      expect(classesReceiver).toHaveBeenCalledWith({ class1: true });
    });
  });
});
