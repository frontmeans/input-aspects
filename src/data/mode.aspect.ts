/**
 *@packageDocumentation
 *@module input-aspects
 */
import { nextArgs, NextCall, nextSkip, valuesProvider } from 'call-thru';
import {
  afterAll,
  afterEach,
  AfterEvent,
  AfterEvent__symbol,
  afterEventBy,
  afterSupplied,
  EventEmitter,
  EventKeeper,
  EventSender,
  eventSupply,
  EventSupply,
  EventSupply__symbol,
  eventSupplyOf,
  nextAfterEvent,
  OnEvent,
  OnEvent__symbol,
  OnEventCallChain,
  trackValue,
  ValueTracker,
} from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectSameOrBuild } from '../aspect.impl';
import { InParents } from '../container';
import { InParentsAspect } from '../container/parents.aspect.impl';
import { InControl } from '../control';
import { InElement } from '../element.control';

/**
 * @internal
 */
const InMode__aspect: InAspect<InMode> = {

  applyTo<Value>(control: InControl<Value>): InAspect.Applied<Value, InMode> {
    return inAspectSameOrBuild(
        control,
        InMode,
        ctrl => new InControlMode(ctrl),
    );
  },

};

/**
 * Input mode aspect of control.
 *
 * Control can be either enabled, disabled, or readonly.
 *
 * Each control maintains its own state, while nested controls respect container ones. I.e. when container is disabled
 * all nested ones are also disabled. When container is readonly, all nested ones are also readonly, unless explicitly
 * disabled.
 *
 * When applied to input element this aspect maintains its `disabled` and `readonly` attributes (not properties!).
 *
 * Implements `EventSender` interface by sending new and old mode values on each update.
 *
 * Implements `EventKeeper` interface by sending actual mode value.
 *
 * @category Aspect
 */
export abstract class InMode implements EventSender<[InMode.Value, InMode.Value]>, EventKeeper<[InMode.Value]> {

  static get [InAspect__symbol](): InAspect<InMode> {
    return InMode__aspect;
  }

  /**
   * An `OnEvent` sender of input mode updates. Sends a new mode value along with old one as second parameter.
   *
   * The `[OnEvent__symbol]` property is an alias of this one.
   */
  abstract readonly on: OnEvent<[InMode.Value, InMode.Value]>;

  get [OnEvent__symbol](): OnEvent<[InMode.Value, InMode.Value]> {
    return this.on;
  }

  /**
   * An `AfterEvent` keeper of input mode.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[InMode.Value]>;

  get [AfterEvent__symbol](): AfterEvent<[InMode.Value]> {
    return this.read;
  }

  /**
   * Own input mode tracker.
   */
  abstract readonly own: ValueTracker<InMode.Value>;

  /**
   * Checks whether control in the given `mode` has data to submit.
   *
   * @param mode  Input control mode to check.
   *
   * @returns `true` if control in the given `mode` has data to submit, or `false` otherwise.
   */
  static hasData(mode: InMode.Value): boolean {
    return mode !== 'off' && mode[0] !== '-';
  }

  /**
   * Derives input mode from another `source`.
   *
   * If the `source` mode is disabled, this one would be disabled too. If the `source` mode is read-only, then this one
   * would be read-only, unless disabled already.
   *
   * @param source  A source to derive input mode from.
   *
   * @returns Derived input mode supply. Disables `source` mode derivation once cut off.
   */
  abstract derive(source: EventKeeper<[InMode.Value]>): EventSupply;

  /**
   * Unregisters all receivers.
   *
   * @param reason  Optional reason.
   *
   * @returns `this` instance.
   */
  done(reason?: any): this {
    this.own.done(reason);
    return this;
  }

}

export namespace InMode {

  /**
   * Possible input control mode value:
   *
   * - `on` when control is writable. This is the default.
   * - `ro` when control is read-only. Such control can not be edited, but still can be submitted.
   * - `off` when control is disabled. Such control is not submitted.
   * - `-on` when control is writable, but not submitted.
   * - `-ro` when control is read-only, but not submitted.
   */
  export type Value = 'on' | 'ro' | 'off' | '-on' | '-ro';

}

/**
 * @internal
 */
class OwnModeTracker extends ValueTracker<InMode.Value> {

  private readonly _tracker: ValueTracker<InMode.Value>;

  constructor(element: InElement<any> | null) {
    super();
    this._tracker = trackValue(element ? initialInMode(element.element) : 'on');
  }

  get on(): OnEvent<[InMode.Value, InMode.Value]> {
    return this._tracker.on;
  }

  get [EventSupply__symbol](): EventSupply {
    return eventSupplyOf(this._tracker);
  }

  get it(): InMode.Value {
    return this._tracker.it;
  }

  set it(value: InMode.Value) {
    switch (value) {
      case 'off':
      case 'ro':
      case '-on':
      case '-ro':
        break;
      default:
        value = 'on'; // Correct the value.
    }

    this._tracker.it = value;
  }

}

/**
 * @internal
 */
class DerivedInModes {

  readonly read: AfterEvent<[InMode.Value]>;
  private readonly _all = new Set<AfterEvent<[InMode.Value]>>();
  private readonly _on = new EventEmitter<[]>();

  constructor() {

    const sources: AfterEvent<[Set<AfterEvent<[InMode.Value]>>]> = afterEventBy(
        this._on.on.thru(() => this._all),
        valuesProvider(this._all),
    );

    this.read = sources.keep.thru(
        (set: Set<AfterEvent<[InMode.Value]>>) => nextAfterEvent(afterEach(...set)),
        mergeInModes,
    );
  }

  add(source: EventKeeper<[InMode.Value]>): EventSupply {

    const src = afterSupplied(source);
    const supply = eventSupply(() => {
      this._all.delete(src);
      this._on.send();
    });

    this._all.add(src);
    this._on.send();

    return supply;
  }

}

/**
 * @internal
 */
class InControlMode extends InMode {

  readonly own: OwnModeTracker;
  readonly read: AfterEvent<[InMode.Value]>;
  readonly on: OnEvent<[InMode.Value, InMode.Value]>;
  private readonly _derived = new DerivedInModes();

  constructor(private readonly _control: InControl<any>) {
    super();

    const element = _control.aspect(InElement);

    this.own = new OwnModeTracker(element);
    eventSupplyOf(this.own).needs(_control);
    this.derive(_control.aspect(InParentsAspect).read.keep.thru_(parentsInMode));

    let last: InMode.Value = 'on';

    this.read = afterEventBy<[InMode.Value]>(
        afterAll({
          derived: this._derived.read,
          own: this.own,
        }).thru(({ derived: [derived], own: [own] }) => {

          let next: InMode.Value;

          if (own === 'off' || derived === 'off') {
            next = 'off';
          } else {

            let off = false;

            if (own[0] === '-') {
              off = true;
              own = own.substring(1) as InMode.Value;
            }
            if (derived[0] === '-') {
              off = true;
              derived = derived.substring(1) as InMode.Value;
            }
            next = derived === 'ro' ? 'ro' : own;
            if (off) {
              next = '-' + next as InMode.Value;
            }
          }

          return last === next ? nextSkip() : nextArgs(last = next);
        }),
        valuesProvider<[InMode.Value]>(last),
    ).tillOff(_control);
    if (element) {
      this.read(value => applyInMode(element.element, value));
    }

    let lastUpdate: InMode.Value = 'on';

    this.on = this.read.thru(value => {

      const old = lastUpdate;

      return old === value ? nextSkip() : nextArgs(lastUpdate = value, old);
    });
  }

  derive(source: EventKeeper<[InMode.Value]>): EventSupply {
    return this._derived.add(source).needs(this._control);
  }

}

/**
 * @internal
 */
function initialInMode(element: HTMLElement): InMode.Value {
  return element.getAttribute('disabled') != null
      ? 'off' : (
          element.getAttribute('readonly') != null ? 'ro' : 'on'
      );
}

/**
 * @internal
 */
function applyInMode(element: HTMLElement, value: InMode.Value): void {
  switch (value) {
    case 'off':
      element.setAttribute('disabled', '');
      break;
    case 'ro':
    case '-ro':
      // Workaround of https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/12087679/
      element.setAttribute('disabled', '');
      element.removeAttribute('disabled');
      element.setAttribute('readonly', '');
      break;
    default:
      // Workaround of https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/12087679/
      element.setAttribute('disabled', '');
      element.removeAttribute('disabled');
      // Workaround of https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/12087679/
      element.setAttribute('readonly', '');
      element.removeAttribute('readonly');
  }
}

/**
 * @internal
 */
function parentsInMode(parents: InParents.All): NextCall<OnEventCallChain, [InMode.Value]> {

  const parentList = Array.from(parents);

  if (!parentList.length) {
    return nextArgs('on');
  }

  const parentModes = parentList.map(({ parent }) => parent.aspect(InMode));

  return nextAfterEvent(afterEach(...parentModes).keep.thru_(mergeInModes));
}

/**
 * @internal
 */
function mergeInModes(...modes: [InMode.Value][]): InMode.Value {

  let ro = false;
  let off = false;

  for (const [mode] of modes) {
    switch (mode) {
      case 'off':
        return 'off';
      case 'ro':
        ro = true;
        break;
      case '-on':
        off = true;
        break;
      case '-ro':
        off = true;
        ro = true;
        break;
    }
  }

  return off ? (ro ? '-ro' : '-on') : (ro ? 'ro' : 'on');
}
