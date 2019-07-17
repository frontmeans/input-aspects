import { nextArgs, nextSkip, valuesProvider } from 'call-thru';
import {
  AfterEvent,
  AfterEvent__symbol,
  afterEventFrom,
  afterEventFromAll,
  afterEventFromEach,
  afterEventOf,
  afterEventOr,
  EventEmitter,
  eventInterest,
  EventInterest,
  EventKeeper,
  EventSender,
  OnEvent,
  OnEvent__symbol,
  trackValue,
  ValueTracker
} from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectValue } from '../aspect.impl';
import { InParents } from '../container/parents.aspect';
import { InControl } from '../control';
import { InElement } from '../element';

const InMode__aspect: InAspect<InMode> = {

  applyTo<Value>(control: InControl<Value>): InAspect.Applied<InMode> {
    return inAspectValue(new InControlMode(control));
  }

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
 */
export abstract class InMode implements EventSender<[InMode.Value, InMode.Value]>, EventKeeper<[InMode.Value]> {

  static get [InAspect__symbol](): InAspect<InMode> {
    return InMode__aspect;
  }

  /**
   * An `OnEvent` registrar of actual input mode updates receivers. Sends the new mode value along with old one as
   * second parameter.
   *
   * The `[OnEvent__symbol]` property is an alias of this one.
   */
  abstract readonly on: OnEvent<[InMode.Value, InMode.Value]>;

  get [OnEvent__symbol](): OnEvent<[InMode.Value, InMode.Value]> {
    return this.on;
  }

  /**
   * An `AfterEvent` registrar of actual input mode receivers.
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
   * Derives input mode from another `source`.
   *
   * - If the `source` reports the `off` mode, then this mode would be `off`.
   * - If the `source` reports the `ro` mode, then this mode would be `ro`, unless it is `off` already.
   *
   * @param source A source to derive input mode from.
   *
   * @returns An event interest instance that disables `source` mode derivation when lost.
   */
  abstract derive(source: EventKeeper<[InMode.Value]>): EventInterest;

  /**
   * Unregisters all receivers.
   *
   * @param reason Optional reason.
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
   * - `on` when control is enabled. This is the default value.
   * - `off` when control is disabled. Such control values are never submitted.
   * - `ro` when control is read-only. Such controls can not be edited, but still can be submitted.
   */
  export type Value = 'on' | 'off' | 'ro';

}

class OwnModeTracker extends ValueTracker<InMode.Value> {

  private readonly _tracker: ValueTracker<InMode.Value>;

  constructor(element?: InElement) {
    super();
    this._tracker = trackValue(element ? actualMode(element.element) : 'on');
  }

  get on() {
    return this._tracker.on;
  }

  get it(): InMode.Value {
    return this._tracker.it;
  }

  set it(value: InMode.Value) {
    switch (value) {
      case 'off':
      case 'ro':
        break;
      default:
        value = 'on'; // Correct the value.
    }

    this._tracker.it = value;
  }

  done(reason?: any): this {
    this._tracker.done(reason);
    return this;
  }

}

class DerivedModes {

  readonly read: AfterEvent<[InMode.Value]>;
  private readonly _all = new Set<AfterEvent<[InMode.Value]>>();
  private readonly _on = new EventEmitter<[]>();

  constructor() {

    const sources: AfterEvent<[Set<AfterEvent<[InMode.Value]>>]> = afterEventOr(
        this._on.on.thru(() => this._all),
        valuesProvider(this._all),
    );

    this.read = sources.keep.dig(set => afterEventFromEach(...set).keep.thru(mergeModes));
  }

  add(source: EventKeeper<[InMode.Value]>): EventInterest {

    const src = afterEventFrom(source);
    const interest = eventInterest(() => {
      this._all.delete(src);
      this._on.send();
    });

    this._all.add(src);
    this._on.send();

    return interest;
  }

}

class InControlMode extends InMode {

  readonly own: OwnModeTracker;
  readonly read: AfterEvent<[InMode.Value]>;
  readonly on: OnEvent<[InMode.Value, InMode.Value]>;
  private readonly _derived = new DerivedModes();

  constructor(control: InControl<any>) {
    super();

    const element = control.aspect(InElement);

    this.own = new OwnModeTracker(element);
    this.derive(control.aspect(InParents).read.keep.dig_(parentsMode));

    let last: InMode.Value = 'on';

    this.read = afterEventOr<[InMode.Value]>(
        afterEventFromAll({
          derived: this._derived.read,
          own: this.own,
        }).thru(({ derived: [derived], own: [own] }) => {

          let next: InMode.Value;

          if (own === 'off' || derived === 'off') {
            next = 'off';
          } else if (derived === 'ro') {
            next = 'ro';
          } else {
            next = own;
          }

          return last === next ? nextSkip() : nextArgs(last = next);
        }),
        valuesProvider<[InMode.Value]>(last),
    );
    if (element) {
      this.read(value => applyMode(element.element, value));
    }

    let lastUpdate: InMode.Value = 'on';

    this.on = this.read.thru(value => {

      const old = lastUpdate;

      return old === value ? nextSkip() : nextArgs(lastUpdate = value, old);
    });
  }

  derive(source: EventKeeper<[InMode.Value]>): EventInterest {
    return this._derived.add(source);
  }

}

function actualMode(element: HTMLElement): InMode.Value {
  return element.getAttribute('disabled') != null
      ? 'off' : (
          element.getAttribute('readonly') != null ? 'ro' : 'on'
      );
}

function applyMode(element: HTMLElement, value: InMode.Value) {

  const old = actualMode(element);

  if (old === value) {
    return;
  }

  switch (value) {
    case 'off':
      element.setAttribute('disabled', '');
      break;
    case 'ro':
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

function parentsMode(parents: InParents.All): AfterEvent<[InMode.Value]> {

  const parentList = [...parents];

  if (!parentList.length) {
    return afterEventOf('on');
  }

  const parentModes = parentList.map(({ parent }) => parent.aspect(InMode));

  return afterEventFromEach(...parentModes).keep.thru_(mergeModes);
}

function mergeModes(...modes: [InMode.Value][]) {

  let ro = false;

  for (const [mode] of modes) {
    switch (mode) {
      case 'off':
        return 'off';
      case 'ro':
        ro = true;
        break;
    }
  }

  return ro ? 'ro' : 'on';
}
