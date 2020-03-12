/**
 * @packageDocumentation
 * @module input-aspects
 */
import { itsEach, mapIt } from 'a-iterable';
import {
  afterAll,
  afterEach,
  AfterEvent,
  AfterEvent__symbol,
  afterThe,
  EventKeeper, EventReceiver, EventSupply, eventSupplyOf,
  nextAfterEvent, receiveAfterEvent,
  trackValue,
  ValueTracker,
} from 'fun-events';
import { InAspect, InAspect__symbol } from '../../aspect';
import { inAspectSameOrBuild } from '../../aspect.impl';
import { InContainer } from '../../containers';
import { InControl } from '../../control';
import { InElement } from '../../element.control';
import { InFocus } from './focus.aspect';

/**
 * @internal
 */
const InStatus__aspect: InAspect<InStatus> = {

  applyTo<Value>(control: InControl<Value>): InAspect.Applied<Value, InStatus> {
    return inAspectSameOrBuild(control, InStatus, ctrl => {

      const container = ctrl.aspect(InContainer);

      return container != null ? new InContainerStatus(container) : new InControlStatus(ctrl);
    });
  },

};

/**
 * Aggregate status aspect of user input.
 *
 * Collects and reports input status flags. Like whether the input ever had focus or being altered.
 *
 * Supports input elements and containers. For the rest of input controls always sends default status flags.
 *
 * Implements `EventKeeper` interface by sending collected status flags to receivers.
 *
 * @category Aspect
 */
export abstract class InStatus implements EventKeeper<[InStatus.Flags]> {

  static get [InAspect__symbol](): InAspect<InStatus> {
    return InStatus__aspect;
  }

  /**
   * Builds `AfterEvent` keeper of input status flags.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   *
   * @returns `AfterEvent` keeper of input status flags.
   */
  abstract read(): AfterEvent<[InStatus.Flags]>;

  /**
   * Starts sending input status flags and updates to the given `receiver`
   *
   * @param receiver  Target receiver of input status flags.
   *
   * @returns Input status flags supply.
   */
  abstract read(receiver: EventReceiver<[InStatus.Flags]>): EventSupply;

  [AfterEvent__symbol](): AfterEvent<[InStatus.Flags]> {
    return this.read();
  }

  /**
   * Marks the input as touched.
   *
   * For container invokes this method for each of the nested controls.
   *
   * @param touched  Whether to mark the input as touched or not. `true` by default. When `false` the input would be
   * marked as non-edited too. Setting to `false` affects only edited flag when input has focus.
   *
   * @returns `this` aspect instance.
   */
  abstract markTouched(touched?: boolean): this;

  /**
   * Marks the input as edited by user.
   *
   * For container invokes this method for each of the nested controls.
   *
   * @param edited  Whether to mark the input as edited by user. `true` by default, in which case the input will be
   * marked as touched as well.
   *
   * @returns `this` aspect instance.
   */
  abstract markEdited(edited?: boolean): this;

}

export namespace InStatus {

  /**
   * A flags representing aggregated input status.
   */
  export interface Flags {

    /**
     * Whether the input has focus currently.
     */
    readonly hasFocus: boolean;

    /**
     * Whether the input had focus already.
     *
     * This flag can be set using `InStatus.markTouched()`.
     */
    readonly touched: boolean;

    /**
     * Whether the input has been edited by user.
     *
     * This flag can be set using `InStatus.markEdited()`.
     */
    readonly edited: boolean;

  }

}

/**
 * @internal
 */
const defaultInStatusFlags: InStatus.Flags = {
  hasFocus: false,
  touched: false,
  edited: false,
};

/**
 * @internal
 */
class InControlStatus extends InStatus {

  private readonly _flags = trackValue<InStatus.Flags>(defaultInStatusFlags);

  constructor(control: InControl<any>) {
    super();
    eventSupplyOf(this._flags).needs(control);
    this._flags.by(elementInStatusFlags(this._flags, control));
  }

  read(): AfterEvent<[InStatus.Flags]>;
  read(receiver: EventReceiver<[InStatus.Flags]>): EventSupply;
  read(receiver?: EventReceiver<[InStatus.Flags]>): AfterEvent<[InStatus.Flags]> | EventSupply {
    return (this.read = receiveAfterEvent(this._flags.read()))(receiver);
  }

  markTouched(touched = true): this {

    const flags = this._flags.it;

    if (!touched) {
      if (flags.touched) {
        // Try to reset touched.
        // Still touched if in focus. Not edited anyway.
        this._flags.it = { ...flags, touched: flags.hasFocus, edited: false };
      }
    } else if (!flags.touched) {
      // Do not modify if already touched.
      this._flags.it = { ...flags, touched };
    }

    return this;
  }

  markEdited(edited = true): this {

    const flags = this._flags.it;

    if (edited) {
      if (!flags.edited) {
        // Touched if edited
        this._flags.it = { ...flags, touched: true, edited };
      }
    } else if (flags.edited) {
      // Assume not edited
      this._flags.it = { ...flags, edited };
    }

    return this;
  }

}

/**
 * @internal
 */
function elementInStatusFlags(
    origin: ValueTracker<InStatus.Flags>,
    control: InControl<any>,
): AfterEvent<[InStatus.Flags]> {

  const element = control.aspect(InElement);
  const focus = control.aspect(InFocus);

  return afterAll({
    hasFocus: focus || afterThe(false),
    edited: element ? element.input().keepThru(({ event }) => !!event) : afterThe(false),
  }).keepThru(
      ({ hasFocus: [hasFocus], edited: [edited] }) => updateInStatusFlags(origin.it, hasFocus, edited),
  );
}

/**
 * @internal
 */
function updateInStatusFlags(flags: InStatus.Flags, hasFocus: boolean, edited: boolean): InStatus.Flags {
  if (hasFocus) {
    flags = { ...flags, hasFocus, touched: true };
  } else {
    flags = { ...flags, hasFocus };
  }
  if (edited) {
    flags = { ...flags, edited, touched: true };
  }
  return flags;
}

/**
 * @internal
 */
class InContainerStatus extends InStatus {

  constructor(private readonly _container: InContainer<any>) {
    super();
  }

  read(): AfterEvent<[InStatus.Flags]>;
  read(receiver: EventReceiver<[InStatus.Flags]>): EventSupply;
  read(receiver?: EventReceiver<[InStatus.Flags]>): AfterEvent<[InStatus.Flags]> | EventSupply {
    return (this.read = receiveAfterEvent(containerInStatusFlags(this._container)))(receiver);
  }

  markEdited(edited?: boolean): this {
    this._container.controls.read().once(
        snapshot => itsEach(
            snapshot,
            control => control.aspect(InStatus).markEdited(edited),
        ),
    );
    return this;
  }

  markTouched(touched?: boolean): this {
    this._container.controls.read().once(
        snapshot => itsEach(
            snapshot,
            control => control.aspect(InStatus).markTouched(touched),
        ),
    );
    return this;
  }

}

/**
 * @internal
 */
function containerInStatusFlags(container: InContainer<any>): AfterEvent<[InStatus.Flags]> {
  return container.controls.read().tillOff(container).keepThru_(
      (snapshot: InContainer.Snapshot) => nextAfterEvent(afterEach(...inControlStatuses(snapshot))),
      combineInStatusFlags,
  );
}

/**
 * @internal
 */
function inControlStatuses(snapshot: InContainer.Snapshot): Iterable<InStatus> {
  return mapIt(snapshot, c => c.aspect(InStatus));
}

/**
 * @internal
 */
function combineInStatusFlags(...flags: [InStatus.Flags][]): InStatus.Flags {

  const result: { -readonly [K in keyof InStatus.Flags]: InStatus.Flags[K] } = {
    hasFocus: false,
    touched: false,
    edited: false,
  };

  itsEach(
      flags,
      (([{ hasFocus, touched, edited }]) => {
            if (touched) {
              result.touched = true;
            }
            if (hasFocus) {
              result.hasFocus = result.touched = true;
            }
            if (edited) {
              result.edited = result.touched = true;
            }
          }
      ),
  );

  return result;
}
