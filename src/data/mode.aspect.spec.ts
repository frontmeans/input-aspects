import { afterSupplied, onceAfter, onSupplied, trackValue, ValueTracker } from '@proc7ts/fun-events';
import { Supply } from '@proc7ts/supply';
import { inGroup, InGroup } from '../containers';
import { intoInteger } from '../conversion';
import { InElement } from '../element.control';
import { inText } from '../elements';
import { InMode } from './mode.aspect';
import Mock = jest.Mock;

describe('InMode', () => {

  let element: HTMLInputElement;

  beforeEach(() => {
    element = document.body.appendChild(document.createElement('input'));
  });
  afterEach(() => {
    element.remove();
  });

  let control: InElement<string>;
  let mode: InMode;
  let onModeUpdate: Mock<void, [InMode.Value, InMode.Value]>;
  let modeUpdatesSupply: Supply;
  let readMode: Mock<void, [InMode.Value]>;
  let modeSupply: Supply;

  beforeEach(() => {
    control = inText(element);
    mode = control.aspect(InMode);
    modeUpdatesSupply = mode.on(onModeUpdate = jest.fn());
    modeSupply = mode.read(readMode = jest.fn());
    readMode.mockClear();
  });

  let onOwnUpdate: Mock<void, [InMode.Value, InMode.Value]>;
  let ownUpdatesSupply: Supply;

  beforeEach(() => {
    ownUpdatesSupply = mode.own.on(onOwnUpdate = jest.fn());
  });

  it('is reused by converted control with the same value', () => {

    const converted = control.convert();

    expect(converted.aspect(InMode)).toBe(mode);
  });
  it('is not reused by converted control with another value', () => {

    const converted = control.convert(intoInteger);

    expect(converted.aspect(InMode)).not.toBe(mode);
  });

  describe('[OnEvent__symbol]', () => {
    it('is the same as `on`', () => {
      expect(onSupplied(mode)).toBe(mode.on);
    });
  });

  describe('[AfterEvent__symbol]', () => {
    it('is the same as `read`', () => {
      expect(afterSupplied(mode)).toBe(mode.read);
    });
  });

  describe('done', () => {
    it('stops sending updates', () => {

      const reason = 'some reason';
      const updatesDone = jest.fn();
      const modeDone = jest.fn();

      modeUpdatesSupply.whenOff(updatesDone);
      modeSupply.whenOff(modeDone);

      mode.done(reason);
      expect(updatesDone).toHaveBeenCalledWith(reason);
      expect(modeDone).toHaveBeenCalledWith(reason);
    });
  });

  describe('input cut off', () => {
    it('stops sending updates', () => {

      const reason = 'some reason';
      const updatesDone = jest.fn();
      const modeDone = jest.fn();

      modeUpdatesSupply.whenOff(updatesDone);
      modeSupply.whenOff(modeDone);

      control.supply.off(reason);
      expect(updatesDone).toHaveBeenCalledWith(reason);
      expect(modeDone).toHaveBeenCalledWith(reason);
    });
  });

  describe('own', () => {
    it('is `on` by default', () => {
      expect(mode.own.it).toBe('on');
    });
    it('is `off` when element is initially disabled', () => {
      element.disabled = true;
      control = inText(element);
      mode = control.aspect(InMode);
      mode.read.do(onceAfter)(value => expect(value).toBe('off'));
    });
    it('is `ro` when element is initially read-only', () => {
      element.readOnly = true;
      control = inText(element);
      mode = control.aspect(InMode);
      mode.read.do(onceAfter)(value => expect(value).toBe('ro'));
    });
    it('disables when set to `off`', () => {
      mode.own.it = 'off';
      expect(element.disabled).toBe(true);
      expect(onOwnUpdate).toHaveBeenLastCalledWith('off', 'on');
      expect(onModeUpdate).toHaveBeenLastCalledWith('off', 'on');
      expect(readMode).toHaveBeenLastCalledWith('off');
    });
    it('does nothing when set to `off` again', () => {
      mode.own.it = 'off';
      mode.own.it = 'off';
      expect(onOwnUpdate).toHaveBeenCalledTimes(1);
      expect(onModeUpdate).toHaveBeenCalledTimes(1);
      expect(readMode).toHaveBeenCalledTimes(1);
    });
    it('makes read-only when set to `ro`', () => {
      mode.own.it = 'ro';
      expect(element.disabled).toBe(false);
      expect(element.readOnly).toBe(true);
      expect(onOwnUpdate).toHaveBeenLastCalledWith('ro', 'on');
      expect(onModeUpdate).toHaveBeenLastCalledWith('ro', 'on');
      expect(readMode).toHaveBeenLastCalledWith('ro');
    });
    it('makes read-only when set to `-ro`', () => {
      mode.own.it = '-ro';
      expect(element.disabled).toBe(false);
      expect(element.readOnly).toBe(true);
      expect(onOwnUpdate).toHaveBeenLastCalledWith('-ro', 'on');
      expect(onModeUpdate).toHaveBeenLastCalledWith('-ro', 'on');
      expect(readMode).toHaveBeenLastCalledWith('-ro');
    });
    it('makes writable when set back to `on`', () => {
      mode.own.it = 'ro';
      mode.own.it = 'on';
      expect(element.disabled).toBe(false);
      expect(element.readOnly).toBe(false);
      expect(onOwnUpdate).toHaveBeenLastCalledWith('on', 'ro');
      expect(onModeUpdate).toHaveBeenLastCalledWith('on', 'ro');
      expect(readMode).toHaveBeenLastCalledWith('on');
    });
    it('makes writable when set to `-on`', () => {
      mode.own.it = '-on';
      expect(element.disabled).toBe(false);
      expect(element.readOnly).toBe(false);
      expect(onOwnUpdate).toHaveBeenLastCalledWith('-on', 'on');
      expect(onModeUpdate).toHaveBeenLastCalledWith('-on', 'on');
      expect(readMode).toHaveBeenLastCalledWith('-on');
    });
    it('makes writable when set back to `on` via invalid value', () => {
      mode.own.it = 'ro';
      mode.own.it = 'on!' as InMode.Value;
      expect(element.disabled).toBe(false);
      expect(element.readOnly).toBe(false);
      expect(onOwnUpdate).toHaveBeenLastCalledWith('on', 'ro');
      expect(onModeUpdate).toHaveBeenLastCalledWith('on', 'ro');
      expect(readMode).toHaveBeenLastCalledWith('on');
    });
    it('does nothing when set to `on` again via invalid value', () => {
      mode.own.it = 'on!' as InMode.Value;
      expect(onOwnUpdate).not.toHaveBeenCalled();
      expect(onModeUpdate).not.toHaveBeenCalled();
      expect(readMode).not.toHaveBeenCalled();
    });

    describe('done', () => {
      it('stops sending updates', () => {

        const reason = 'some reason';
        const updatesDone = jest.fn();

        ownUpdatesSupply.whenOff(updatesDone);

        mode.done(reason);
        expect(updatesDone).toHaveBeenCalledWith(reason);
      });
    });
  });

  describe('parent mode', () => {

    let group: InGroup<{ nested: string }>;
    let groupMode: InMode;
    let readGroupMode: Mock<void, [InMode.Value]>;

    beforeEach(() => {
      group = inGroup({ nested: 'some' });
      group.controls.set('nested', control);
      groupMode = group.aspect(InMode);
      groupMode.read(readGroupMode = jest.fn());
    });

    it('is initially `on`', () => {
      expect(readGroupMode).toHaveBeenLastCalledWith('on');
    });

    describe('own', () => {
      beforeEach(() => {
        readGroupMode.mockClear();
      });

      it('is `on` by default', () => {
        expect(groupMode.own.it).toBe('on');
        expect(element.disabled).toBe(false);
        expect(element.readOnly).toBe(false);
      });
      it('disables nested controls when set to `off`', () => {
        groupMode.own.it = 'off';
        expect(readGroupMode).toHaveBeenLastCalledWith('off');
        expect(readMode).toHaveBeenLastCalledWith('off');
        expect(onModeUpdate).toHaveBeenCalledWith('off', 'on');
        expect(onOwnUpdate).not.toHaveBeenCalled();
        expect(element.disabled).toBe(true);
      });
      it('makes nested controls read-only when set to `ro`', () => {
        groupMode.own.it = 'ro';
        expect(readGroupMode).toHaveBeenLastCalledWith('ro');
        expect(readMode).toHaveBeenLastCalledWith('ro');
        expect(onModeUpdate).toHaveBeenCalledWith('ro', 'on');
        expect(onOwnUpdate).not.toHaveBeenCalled();
        expect(element.disabled).toBe(false);
        expect(element.readOnly).toBe(true);
      });
      it('makes nested controls read-only when set to `-ro`', () => {
        groupMode.own.it = '-ro';
        expect(readGroupMode).toHaveBeenLastCalledWith('-ro');
        expect(readMode).toHaveBeenLastCalledWith('-ro');
        expect(onModeUpdate).toHaveBeenCalledWith('-ro', 'on');
        expect(onOwnUpdate).not.toHaveBeenCalled();
        expect(element.disabled).toBe(false);
        expect(element.readOnly).toBe(true);
      });
      it('makes nested controls read-only when set to `ro`, unless disabled', () => {
        mode.own.it = 'off';
        readMode.mockClear();
        onModeUpdate.mockClear();
        onOwnUpdate.mockClear();
        groupMode.own.it = 'ro';
        expect(readGroupMode).toHaveBeenLastCalledWith('ro');
        expect(readMode).not.toHaveBeenCalled();
        expect(onModeUpdate).not.toHaveBeenCalled();
        expect(onOwnUpdate).not.toHaveBeenCalled();
        expect(element.disabled).toBe(true);
      });
      it('does not enable explicitly disabled nested controls', () => {
        groupMode.own.it = 'off';
        mode.own.it = 'off';
        readMode.mockClear();
        onModeUpdate.mockClear();
        onOwnUpdate.mockClear();
        groupMode.own.it = 'on';
        expect(readGroupMode).toHaveBeenLastCalledWith('on');
        expect(readMode).not.toHaveBeenCalled();
        expect(onModeUpdate).not.toHaveBeenCalled();
        expect(onOwnUpdate).not.toHaveBeenCalled();
        expect(element.disabled).toBe(true);
      });
      it('makes nested controls read-only again when enabled', () => {
        groupMode.own.it = 'off';
        mode.own.it = 'ro';
        readMode.mockClear();
        onModeUpdate.mockClear();
        onOwnUpdate.mockClear();
        groupMode.own.it = 'on';
        expect(readGroupMode).toHaveBeenLastCalledWith('on');
        expect(readMode).toHaveBeenLastCalledWith('ro');
        expect(onModeUpdate).toHaveBeenLastCalledWith('ro', 'off');
        expect(onOwnUpdate).not.toHaveBeenCalled();
        expect(element.disabled).toBe(false);
        expect(element.readOnly).toBe(true);
      });
    });
  });

  describe('derived mode', () => {

    let source: ValueTracker<InMode.Value>;
    let sourceSupply: Supply;

    beforeEach(() => {
      source = trackValue('on');
      sourceSupply = mode.derive(source);
    });

    it('is `on` by default', () => {
      expect(source.it).toBe('on');
      expect(element.disabled).toBe(false);
      expect(element.readOnly).toBe(false);
    });
    it('is disabled when source is `off`', () => {
      source.it = 'off';
      expect(readMode).toHaveBeenLastCalledWith('off');
      expect(onModeUpdate).toHaveBeenCalledWith('off', 'on');
      expect(onOwnUpdate).not.toHaveBeenCalled();
      expect(element.disabled).toBe(true);
    });
    it('is read-only when source is `ro`', () => {
      source.it = 'ro';
      expect(readMode).toHaveBeenLastCalledWith('ro');
      expect(onModeUpdate).toHaveBeenCalledWith('ro', 'on');
      expect(onOwnUpdate).not.toHaveBeenCalled();
      expect(element.disabled).toBe(false);
      expect(element.readOnly).toBe(true);
    });
    it('is read-only when source is `-ro`', () => {
      source.it = '-ro';
      expect(readMode).toHaveBeenLastCalledWith('-ro');
      expect(onModeUpdate).toHaveBeenCalledWith('-ro', 'on');
      expect(onOwnUpdate).not.toHaveBeenCalled();
      expect(element.disabled).toBe(false);
      expect(element.readOnly).toBe(true);
    });
    it('is read-only when source is `ro`, unless disabled', () => {
      mode.own.it = 'off';
      readMode.mockClear();
      onModeUpdate.mockClear();
      onOwnUpdate.mockClear();
      source.it = 'ro';
      expect(readMode).not.toHaveBeenCalled();
      expect(onModeUpdate).not.toHaveBeenCalled();
      expect(onOwnUpdate).not.toHaveBeenCalled();
      expect(element.disabled).toBe(true);
    });
    it('is not enabled by source when explicitly disabled', () => {
      source.it = 'off';
      mode.own.it = 'off';
      readMode.mockClear();
      onModeUpdate.mockClear();
      onOwnUpdate.mockClear();
      source.it = 'on';
      expect(readMode).not.toHaveBeenCalled();
      expect(onModeUpdate).not.toHaveBeenCalled();
      expect(onOwnUpdate).not.toHaveBeenCalled();
      expect(element.disabled).toBe(true);
    });
    it('is read-only again when source is re-enabled', () => {
      source.it = 'off';
      mode.own.it = 'ro';
      readMode.mockClear();
      onModeUpdate.mockClear();
      onOwnUpdate.mockClear();
      source.it = 'on';
      expect(readMode).toHaveBeenLastCalledWith('ro');
      expect(onModeUpdate).toHaveBeenLastCalledWith('ro', 'off');
      expect(onOwnUpdate).not.toHaveBeenCalled();
      expect(element.disabled).toBe(false);
      expect(element.readOnly).toBe(true);
    });
    it('is reset when no longer derived', () => {
      source.it = 'off';
      sourceSupply.off();
      expect(readMode).toHaveBeenLastCalledWith('on');
      expect(onModeUpdate).toHaveBeenCalledWith('on', 'off');
      expect(onOwnUpdate).not.toHaveBeenCalled();
      expect(element.disabled).toBe(false);
      expect(element.readOnly).toBe(false);
    });
  });
});
