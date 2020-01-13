import { afterSupplied, afterThe, EventSupply, trackValue, ValueTracker } from 'fun-events';
import {
  immediateRenderScheduler,
  ManualRenderScheduler,
  newManualRenderScheduler,
  setRenderScheduler,
} from 'render-scheduler';
import { InControl } from '../control';
import { inText, InText } from '../element';
import { inValue } from '../value';
import { InCssClasses } from './css-classes.aspect';

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
    let sourceSupply: EventSupply;

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

      const source2 = jest.fn(() => afterThe({ class2: true }));

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
      source.done(reason);

      expect(sourceDone).toHaveBeenCalledWith(reason);
      expect(classMap).toEqual({});
      expect(element.classList.contains('class1')).toBe(false);
    });
  });

  describe('applyTo', () => {

    let element2: Element;
    let scheduler: ManualRenderScheduler;
    let supply: EventSupply;

    beforeEach(() => {
      cssClasses.add(afterThe({ class2: true }));
      element2 = document.createElement('other');
      scheduler = newManualRenderScheduler();

      const schedule = scheduler();

      supply = cssClasses.applyTo(element2, schedule);
    });

    it('applies CSS classes in the given schedule', () => {
      expect(element2.classList.contains('class2')).toBe(false);

      scheduler.render();
      expect(element2.classList.contains('class2')).toBe(true);
    });
    it('applies CSS classes in dedicated schedule by default', () => {
      setRenderScheduler(scheduler);

      const element3 = document.createElement('third');

      cssClasses.applyTo(element3);
      scheduler.render();
      expect(element3.classList.contains('class2')).toBe(true);
    });
    it('removes applied CSS classes once supply is cut off', () => {
      scheduler.render();
      expect(element.classList.contains('class2')).toBe(true);
      expect(element2.classList.contains('class2')).toBe(true);

      supply.off();
      scheduler.render();
      expect(element.classList.contains('class2')).toBe(true);
      expect(element2.classList.contains('class2')).toBe(false);
    });
  });

  describe('done', () => {

    let source: ValueTracker<InCssClasses.Map>;
    let supply: EventSupply;

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

      valueClasses.read.once(classesReceiver);

      expect(classesReceiver).toHaveBeenCalledWith({ class1: true });
    });
  });
});
