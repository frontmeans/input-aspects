/**
 * @packageDocumentation
 * @module @proc7ts/input-aspects
 */
import { flatMapIt } from '@proc7ts/a-iterable';
import { nextArgs, NextCall, nextSkip } from '@proc7ts/call-thru';
import {
  afterAll,
  afterEach,
  AfterEvent,
  AfterEvent__symbol,
  afterSent,
  afterSupplied,
  EventEmitter,
  EventKeeper,
  EventReceiver,
  EventSender,
  eventSupply,
  EventSupply,
  EventSupply__symbol,
  eventSupplyOf,
  isEventKeeper,
  nextAfterEvent,
  OnEvent,
  OnEvent__symbol,
  OnEventCallChain,
  trackValue,
  ValueTracker,
} from '@proc7ts/fun-events';
import { valuesProvider } from '@proc7ts/primitives';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectSameOrBuild } from '../aspect.impl';
import { InParents } from '../containers';
import { InParentsAspect } from '../containers/parents.aspect.impl';
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
   * Creates an `OnEvent` sender of input mode updates.
   *
   * Sends a new mode value along with old one as second parameter.
   *
   * The `[OnEvent__symbol]` property is an alias of this one.
   *
   * @returns `OnEvent` sender of input mode updates.
   */
  abstract on(): OnEvent<[InMode.Value, InMode.Value]>;

  /**
   * Starts sending input mode updates to the given `receiver`
   *
   * Sends a new mode value along with old one as second parameter.
   *
   * @param receiver  Target input mode updates receiver.
   *
   * @returns Input mode updates supply.
   */
  abstract on(receiver: EventReceiver<[InMode.Value, InMode.Value]>): EventSupply;

  [OnEvent__symbol](): OnEvent<[InMode.Value, InMode.Value]> {
    return this.on();
  }

  /**
   * Builds an `AfterEvent` keeper of input mode.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   *
   * @returns `AfterEvent` keeper of input mode.
   */
  abstract read(): AfterEvent<[InMode.Value]>;

  /**
   * Starts sending input mode and updates to the given `receiver`.
   *
   * @param receiver  Target receiver of input mode.
   *
   * @returns Input mode supply.
   */
  abstract read(receiver: EventReceiver<[InMode.Value]>): EventSupply;

  [AfterEvent__symbol](): AfterEvent<[InMode.Value]> {
    return this.read();
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
  abstract derive(source: InMode.Source): EventSupply;

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

  /**
   * A source of input mode.
   *
   * This is either an event keeper of {@link Value mode value}, or a function returning one and accepting target input
   * control as the only parameter.
   */
  export type Source =
      | EventKeeper<[InMode.Value]>
      | ((this: void, control: InControl<any>) => EventKeeper<[InMode.Value]>);

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

  on(): OnEvent<[InMode.Value, InMode.Value]>;
  on(receiver: EventReceiver<[InMode.Value, InMode.Value]>): EventSupply;
  on(receiver?: EventReceiver<[InMode.Value, InMode.Value]>): OnEvent<[InMode.Value, InMode.Value]> | EventSupply {
    return (this.on = this._tracker.on().F)(receiver);
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

    const sources: AfterEvent<[Set<AfterEvent<[InMode.Value]>>]> = afterSent(
        this._on.on().thru(() => this._all),
        valuesProvider(this._all),
    );

    this.read = sources.keepThru(
        (set: Set<AfterEvent<[InMode.Value]>>) => nextAfterEvent(afterEach(...set)),
        mergeInModes,
    );
  }

  add(source: AfterEvent<[InMode.Value]>): EventSupply {

    const supply = eventSupply(() => {
      this._all.delete(source);
      this._on.send();
    });

    this._all.add(source);
    this._on.send();

    return supply;
  }

}

/**
 * @internal
 */
class InControlMode extends InMode {

  readonly own: OwnModeTracker;
  private readonly _derived = new DerivedInModes();

  constructor(private readonly _control: InControl<any>) {
    super();

    const element = _control.aspect(InElement);

    this.own = new OwnModeTracker(element);
    eventSupplyOf(this.own).needs(_control);
    this.derive(_control.aspect(InParentsAspect).read().keepThru_(parentsInMode));
    if (element) {
      this.read(value => applyInMode(element.element, value));
    }
  }

  read(): AfterEvent<[InMode.Value]>;
  read(receiver: EventReceiver<[InMode.Value]>): EventSupply;
  read(receiver?: EventReceiver<[InMode.Value]>): AfterEvent<[InMode.Value]> | EventSupply {

    let last: InMode.Value = 'on';

    return (this.read = afterSent<[InMode.Value]>(
            afterAll({
              derived: this._derived.read,
              own: this.own,
            }).thru(
                ({
                  derived: [derived],
                  own: [own],
                }) => {

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
                },
            ),
            valuesProvider<[InMode.Value]>(last),
        ).F
    )(receiver);
  }

  on(): OnEvent<[InMode.Value, InMode.Value]>;
  on(receiver: EventReceiver<[InMode.Value, InMode.Value]>): EventSupply;
  on(receiver?: EventReceiver<[InMode.Value, InMode.Value]>): OnEvent<[InMode.Value, InMode.Value]> | EventSupply {
    let lastUpdate: InMode.Value = 'on';

    return (this.on = this.read().thru(value => {

      const old = lastUpdate;

      return old === value ? nextSkip() : nextArgs(lastUpdate = value, old);
    }).F)(receiver);
  }

  derive(source: InMode.Source): EventSupply {
    return this._derived.add(
        afterSupplied(isEventKeeper(source) ? source : source(this._control))
            .tillOff(this._control),
    ).needs(this._control);
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

  return nextAfterEvent(afterEach(...parentModes).keepThru_(mergeInModes));
}

function mergeInModes(...modes: [InMode.Value][]): InMode.Value {
  return inModeValue(...flatMapIt<InMode.Value>(modes));
}

/**
 * Merges multiple input mode values.
 *
 * @category Aspect
 * @param modes  Input mode values to merge.
 *
 * @returns Merged input mode value.
 */
export function inModeValue(...modes: InMode.Value[]): InMode.Value {

  let ro = false;
  let off = false;

  for (const mode of modes) {
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
    case 'on':
    }
  }

  return off ? (ro ? '-ro' : '-on') : (ro ? 'ro' : 'on');
}
