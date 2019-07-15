import { nextArgs, nextSkip, valuesProvider } from 'call-thru';
import {
  AfterEvent,
  AfterEvent__symbol,
  afterEventFromAll,
  afterEventFromEach,
  afterEventOf,
  afterEventOr,
  EventEmitter,
  EventKeeper,
  EventSender,
  OnEvent,
  OnEvent__symbol,
  trackValue,
  ValueTracker
} from 'fun-events';
import { InAspect, InAspect__symbol } from './aspect';
import { inAspectValue } from './aspect.impl';
import { InParents } from './container/parents.aspect';
import { InControl } from './control';
import { InElement } from './element';

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

class InModeTracker extends ValueTracker<InMode.Value> {

  private readonly _on = new EventEmitter<[InMode.Value, InMode.Value]>();

  constructor(readonly elt: InElement.Element) {
    super();
  }

  get on() {
    return this._on.on;
  }

  get it(): InMode.Value {
    return this.elt.getAttribute('disabled') != null
        ? 'off' : (
            this.elt.getAttribute('readonly') != null ? 'ro' : 'on'
        );
  }

  set it(value: InMode.Value) {

    const old = this.it;

    if (old === value) {
      return;
    }

    switch (value) {
      case 'off':
        this.elt.setAttribute('disabled', '');
        break;
      case 'ro':
        // Workaround of https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/12087679/
        this.elt.setAttribute('disabled', '');
        this.elt.removeAttribute('disabled');
        this.elt.setAttribute('readonly', '');
        break;
      default:
        value = 'on';
        if (old === value) {
          return; // Handle incorrect value.
        }
        // Workaround of https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/12087679/
        this.elt.setAttribute('disabled', '');
        this.elt.removeAttribute('disabled');
        // Workaround of https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/12087679/
        this.elt.setAttribute('readonly', '');
        this.elt.removeAttribute('readonly');
    }

    this._on.send(value, old);
  }

  done(reason?: any): this {
    this._on.done(reason);
    return this;
  }

}

class InControlMode extends InMode {

  readonly own: ValueTracker<InMode.Value>;
  readonly read: AfterEvent<[InMode.Value]>;
  readonly on: OnEvent<[InMode.Value, InMode.Value]>;

  constructor(control: InControl<any>) {
    super();

    const element = control.aspect(InElement);

    this.own = element ? new InModeTracker(element.element) : trackValue('on');

    const parents = control.aspect(InParents);

    let last: InMode.Value = 'on';

    this.read = afterEventOr(
        afterEventFromAll({
          parent: parents.read.keep.dig_(parentsMode),
          own: this.own,
        }).thru(({ parent: [parent], own: [own] }) => {

          let next: InMode.Value;

          if (own === 'off' || parent === 'off') {
            next = 'off';
          } else if (parent === 'ro') {
            next = 'ro';
          } else {
            next = own;
          }

          return last === next ? nextSkip() : nextArgs(last = next);
        }),
        valuesProvider<[InMode.Value]>(last),
    );

    let lastUpdate: InMode.Value = 'on';

    this.on = this.read.thru(value => {

      const old = lastUpdate;

      return old === value ? nextSkip() : nextArgs(lastUpdate = value, old);
    });
  }

}

function parentsMode(parents: InParents.All): AfterEvent<[InMode.Value]> {

  const parentList = [...parents];

  if (!parentList.length) {
    return afterEventOf('on');
  }

  const parentModes = parentList.map(({parent}) => parent.aspect(InMode));

  return afterEventFromEach(...parentModes).keep.thru_((...modes) => {

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
  });

}
