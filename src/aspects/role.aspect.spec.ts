import { afterSupplied } from '@proc7ts/fun-events';
import { asis, Supply } from '@proc7ts/primitives';
import { InControl } from '../control';
import { InStyledElement } from '../elements/style';
import { inValue } from '../value.control';
import { InRole } from './role.aspect';

describe('InRole', () => {

  let control: InControl<string>;
  let role: InRole<string>;

  beforeEach(() => {
    control = inValue('test');
    role = control.aspect(InRole);
  });

  it('is not convertible', async () => {
    role.add('test');

    const converted = control.convert(InStyledElement.to(document.createElement('div')));
    const convertedRole = await converted.aspect(InRole).read;

    expect(convertedRole.has('test')).toBe(false);
  });

  describe('add', () => {
    it('enables role', async () => {

      role.add('test');

      const active = await control.aspect(InRole).read;

      expect(active.has('test')).toBe(true);
      expect([...active]).toEqual(['test']);
    });
    it('disables role when all supplies cut off', async () => {

      const supply1 = role.add('test');
      const supply2 = role.add('test');

      expect((await afterSupplied(role)).has('test')).toBe(true);

      supply2.off();
      expect((await afterSupplied(role)).has('test')).toBe(true);

      supply1.off();
      expect((await afterSupplied(role)).has('test')).toBe(false);
    });
  });

  describe('when', () => {
    it('activates already enabled role', async () => {

      const activator = jest.fn(() => new Supply());

      role.add('test');

      role.when('test', activator);
      expect(activator).toHaveBeenCalledWith(control, 'test', await role.read);
    });
    it('activates the role when it is added', async () => {

      const activator = jest.fn(() => new Supply());

      role.when('test', activator);
      expect(activator).not.toHaveBeenCalled();

      role.add('test');
      expect(activator).toHaveBeenCalledWith(control, 'test', await role.read);
    });
    it('re-activates the role when it is added again', () => {

      const activator = jest.fn(() => new Supply());

      role.when('test', activator);

      role.add('test').off();
      role.add('test');

      expect(activator).toHaveBeenCalledTimes(2);
    });
    it('deactivates once the role disabled', async () => {

      const activationSupply = new Supply();

      role.when('test', () => activationSupply);
      role.add('test').off('reason');

      expect(activationSupply.isOff).toBe(true);
      expect(await activationSupply.whenDone().catch(asis)).toBe('reason');
    });
    it('deactivates when activator removed', async () => {

      const activationSupply = new Supply();
      const activatorSupply = role.when('test', () => activationSupply);

      role.add('test');
      activatorSupply.off('reason');

      expect(activationSupply.isOff).toBe(true);
      expect(await activationSupply.whenDone().catch(asis)).toBe('reason');
    });
    it('deactivates when control destroyed', async () => {

      const activationSupply = new Supply();

      role.when('test', () => activationSupply);
      role.add('test');
      control.supply.off('reason');

      expect(activationSupply.isOff).toBe(true);
      expect(await activationSupply.whenDone().catch(asis)).toBe('reason');
    });
    it('does not call removed activator', () => {

      const activator1 = jest.fn(() => new Supply());
      const activator2 = jest.fn(() => new Supply());

      const supply1 = role.when('test', activator1);
      const supply2 = role.when('test', activator2);

      supply1.off();
      role.add('test').off();

      supply2.off();
      role.add('test').off();

      expect(activator1).not.toHaveBeenCalled();
      expect(activator2).toHaveBeenCalledTimes(1);
    });
  });

  describe('default role', () => {
    it('is active by default', async () => {

      const active = await control.aspect(InRole).read;

      expect(active.has('default')).toBe(true);
      expect([...active]).toEqual(['default']);
    });
    it('becomes inactive when other role added', async () => {
      role.add('test');

      const active = await control.aspect(InRole).read;

      expect(active.has('default')).toBe(false);
      expect(active.has('test')).toBe(true);
      expect([...active]).toEqual(['test']);
    });
    it('becomes active when all other roles removed', async () => {

      const supply1 = role.add('test');
      const supply2 = role.add('test');
      const supply3 = role.add('test3');

      supply1.off();
      supply2.off();
      supply3.off();

      const active = await control.aspect(InRole).read;

      expect(active.has('default')).toBe(true);
      expect(active.has('test')).toBe(false);
      expect(active.has('test3')).toBe(false);
      expect([...active]).toEqual(['default']);
    });
    it('can be enabled explicitly', async () => {

      role.add('test1');
      role.add('default');
      role.add('test2');

      const active = await control.aspect(InRole).read;

      expect(active.has('test1')).toBe(true);
      expect(active.has('default')).toBe(true);
      expect(active.has('test2')).toBe(true);
      expect([...active]).toEqual(['test1', 'default', 'test2']);
    });
    it('becomes active when `default` role removed', async () => {

      const supply = role.add('default');

      const active1 = await control.aspect(InRole).read;

      expect(active1.has('default')).toBe(true);
      expect([...active1]).toEqual(['default']);

      supply.off();

      const active2 = await control.aspect(InRole).read;

      expect(active2.has('default')).toBe(true);
      expect([...active2]).toEqual(['default']);
    });
    it('remains active when explicitly enabled and other roles removed', async () => {

      const supply1 = role.add('default');
      const supply2 = role.add('test');
      const supply3 = role.add('default');

      supply1.off();
      supply2.off();

      const active = await control.aspect(InRole).read;

      expect(active.has('default')).toBe(true);
      expect(active.has('test')).toBe(false);
      expect([...active]).toEqual(['default']);

      supply3.off();
      expect(active.has('default')).toBe(true);
      expect(active.has('test')).toBe(false);
      expect([...active]).toEqual(['default']);
    });

    describe('when', () => {
      it('activates immediately', async () => {

        const activator = jest.fn(() => new Supply());

        role.when('default', activator);
        expect(activator).toHaveBeenCalledWith(control, 'default', await role.read);
      });
      it('deactivates when another role added', () => {

        const activationSupply = new Supply();
        const activator = jest.fn(() => activationSupply);

        role.when('default', activator);
        role.add('test');
        expect(activationSupply.isOff).toBe(true);
      });
      it('re-activates when another role removed', () => {

        const activator = jest.fn(() => new Supply());

        role.when('default', activator);
        role.add('test').off();
        expect(activator).toHaveBeenCalledTimes(2);
      });
    });
  });
});
