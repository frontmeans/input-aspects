import { AfterEvent, AfterEvent__symbol, EventKeeper, mapAfter_, trackValue } from '@proc7ts/fun-events';
import { noop } from '@proc7ts/primitives';
import { Supply, SupplyPeer } from '@proc7ts/supply';
import { InAspect, InAspect__symbol } from '../aspect';
import { InControl } from '../control';

const InRole__aspect: InAspect<InRole<any>, 'role'> = {

  applyTo<TValue>(control: InControl<TValue>): InAspect.Applied<TValue, InRole<TValue>> {
    return {
      instance: new InControlRole<TValue>(control),
      convertTo: noop,
    };
  },

};

/**
 * A role of input control.
 *
 * Contains arbitrary named roles. A special role `'default'` considered active when no other roles activated.
 *
 * Roles may be used to conditionally activate other input aspects of the control.
 *
 * @typeParam TValue - Input value type.
 */
export abstract class InRole<TValue> implements EventKeeper<[InRole.Active]> {

  static get [InAspect__symbol](): InAspect<InRole<any>, 'role'> {
    return InRole__aspect;
  }

  /**
   * An `AfterEvent` keeper of active roles.
   *
   * The `[AfterEvent__symbol]` method returns this value.
   */
  abstract readonly read: AfterEvent<[InRole.Active]>;

  [AfterEvent__symbol](): AfterEvent<[InRole.Active]> {
    return this.read;
  }

  /**
   * Adds named role to control.
   *
   * The named role becomes activate. To deactivate it the returned supply has to be cut off.
   *
   * The same role may be added multiple times. In that case the role will be deactivated once all role supplies cut
   * off.
   *
   * @param role - A name of the role to add.
   *
   * @returns A role supply. Removes the added role once cut off.
   */
  abstract add(role: string): Supply;

  /**
   * Registers an activator of the given role.
   *
   * The given activator would be issued once the given role {@link add activated}. A supply instance returned
   * by activator call will be cut off once the role deactivated.
   *
   * @param role - Target role name.
   * @param activator - Role activator.
   *
   * @returns Activator supply. Removes the registered activator once cut off.
   */
  abstract when(role: string, activator: InRole.Activator<TValue>): Supply;

}

export namespace InRole {

  /**
   * An activator signature of input control role.
   *
   * @typeParam TValue - Input value type.
   */
  export type Activator<TValue> =
  /**
   * @param control - A control the role is activate for.
   * @param role - Activated role name.
   * @param active - Active control role.
   *
   * @returns Activation supply peer. Its supply will be cut off once the role deactivated or activator removed. It is
   * expected that this supply performs deactivation once cut off.
   */
      (
          this: void,
          control: InControl<TValue>,
          role: string,
          active: Active,
      ) => SupplyPeer;

  /**
   * Active input control role.
   *
   * Contains all roles {@link InRole.add added} to control.
   *
   * Implements an `Iterable` interface by iterating over all active role names.
   */
  export interface Active extends Iterable<string> {

    /**
     * Checks whether the given role is active.
     *
     * @param role - Target role name.
     *
     * @returns `true` if the given role is {@link InRole.add added} to controller, or `false` otherwise.
     */
    has(role: string): boolean;

  }

}

class InRole$Active {

  static create(): InRole$Active {

    const result = new InRole$Active(new Map());

    result.add('default', true);

    return result;
  }

  readonly active: InRole.Active;
  private _activate: (this: void) => void = noop;
  private _defaultSupply!: Supply;

  private constructor(
      readonly roles: Map<string, InRole$Named>,
  ) {
    this.active = {
      [Symbol.iterator]() {
        return roles.keys();
      },
      has(role: string) {
        return roles.has(role);
      },
    };
  }

  modify(): InRole$Active {

    const result = new InRole$Active(this.roles);

    result._defaultSupply = this._defaultSupply;

    return result;
  }

  add(role: string, isDefault: boolean): Supply | undefined {

    const named = this.roles.get(role);

    if (named) {
      // Already active.
      ++named.active;
      return;
    }

    const supply = new Supply();

    this.roles.set(
        role,
        {
          active: 1,
          supply,
        },
    );

    if (isDefault) {
      this._defaultSupply = supply.whenOff(() => {

        const toRemove = this.roles.get(role)!;

        if (!--toRemove.active) {
          this.roles.delete(role);
        }
      });
    } else {

      const defaultSupply = this._defaultSupply;

      this.activateBy(() => defaultSupply.off());
    }

    return supply;
  }

  remove(role: string, reason: unknown): void {

    const named = this.roles.get(role)!;

    if (--named.active) {
      // Still active.
      return;
    }

    this.roles.delete(role);
    this.activateBy(() => named.supply.off(reason));
  }

  activateBy(activator: () => void): void {

    const prevActivator = this._activate;

    this._activate = () => {
      prevActivator();
      activator();
    };
  }

  activate(): void {

    const activator = this._activate;

    this._activate = noop;

    activator();
  }

}

interface InRole$Named {
  active: number;
  readonly supply: Supply;
}

class InControlRole<TValue> extends InRole<TValue> {

  private readonly _active = trackValue<InRole$Active>(InRole$Active.create());
  private readonly _activators = new Map<string, Map<Supply, InRole.Activator<TValue>>>();
  readonly read: AfterEvent<[InRole.Active]>;

  constructor(private readonly _control: InControl<TValue>) {
    super();
    this._active.on(active => active.activate());
    this._active.supply.needs(_control);
    this.read = this._active.read.do(mapAfter_(({ active }) => active));
  }

  add(role: string): Supply {

    const active = this._active.it.modify();

    this._add(active, role);
    this._active.it = active;

    return new Supply(reason => {

      const active = this._active.it.modify();

      active.remove(role, reason);
      if (!active.roles.size) {
        // No more active roles left.
        // Enable `default` role.
        this._add(active, 'default', true);
      }

      this._active.it = active;
    });
  }

  when(role: string, activator: InRole.Activator<TValue>): Supply {

    let activators = this._activators.get(role);

    if (!activators) {
      activators = new Map();
      this._activators.set(role, activators);
    }

    const supply = new Supply().needs(this._control);

    activators.set(
        supply,
        (control, role, active) => activator(control, role, active).supply.needs(supply),
    );
    supply.whenOff(() => {
      activators!.delete(supply);
      if (!activators!.size) {
        this._activators.delete(role);
      }
    });

    const named = this._active.it.roles.get(role);

    if (named) {
      // The role already active.
      // Issue activator immediately.
      named.supply.cuts(activator(this._control, role, this._active.it.active));
    }

    return supply;
  }

  private _add(active: InRole$Active, role: string, isDefault = false): void {

    const activatedSupply = active.add(role, isDefault);

    if (activatedSupply) {
      // Role activated

      const activators = this._activators.get(role);

      if (activators) {
        // Issue activators
        for (const activator of activators.values()) {
          activatedSupply.cuts(activator(this._control, role, this._active.it.active));
        }
      }
    }
  }

}

declare module '../aspect' {

  export namespace InAspect.Application {

    export interface Map<TInstance, TValue> {

      /**
       * Input role application type.
       */
      role(): InRole<TValue>;

    }

  }

}
