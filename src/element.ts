import { asis, nextArgs, nextSkip } from 'call-thru';
import {
  AfterEvent,
  afterEventFrom,
  DomEventDispatcher,
  EventEmitter,
  eventInterest,
  EventInterest,
  OnEvent
} from 'fun-events';
import { InAspect, InAspect__symbol } from './aspect';
import { inAspectNull, inAspectValue } from './aspect.impl';
import { InControl } from './control';

const InElement__aspect: InAspect<'default', InElement | null> = {
  applyTo() {
    return inAspectNull;
  },
};

/**
 * HTML input element control.
 *
 * It is also available as aspect of itself and converted controls. It is not available as aspect of other controls.
 *
 * An input element control can be constructed using `inElt()` function.
 */
export abstract class InElement extends InControl {

  /**
   * HTML input element this control is based on.
   */
  abstract readonly element: InElement.Element;

  /**
   * An `AfterEvent` registrar of user input receivers.
   */
  abstract readonly input: AfterEvent<[InElement.Input]>;

  /**
   * DOM event dispatcher of this element.
   */
  abstract readonly events: DomEventDispatcher;

  static get [InAspect__symbol](): InAspect<'default', InElement | null> {
    return InElement__aspect;
  }

}

export namespace InElement {

  /**
   * HTML element accepting user input.
   *
   * This may be e.g. `HTMLInputElement`, `HTMLSelectElement`, or `HTMLTextAreaElement`.
   *
   * Input control can be built on top of this element using `inElt()` function.
   */
  export type Element = HTMLElement & { value: string };

  /**
   * User input.
   */
  export interface Input {

    /**
     * The value user entered.
     */
    value: string;

    /**
     * An event caused the value to be applied.
     *
     * The value has been applied programmatically if missing.
     */
    event?: Event;

  }

}

class InElementControl extends InElement {

  readonly input: AfterEvent<[InElement.Input]>;
  readonly on: OnEvent<[string, string]>;
  readonly events: DomEventDispatcher;
  private readonly _input: EventEmitter<[InElement.Input, string]> = new EventEmitter();
  private readonly _interest: EventInterest;
  private _value: string;
  // noinspection TypeScriptFieldCanBeMadeReadonly
  private _update: (value: string, oldValue: string) => void;

  constructor(readonly element: InElement.Element) {
    super();
    this._value = element.value;
    this._update = update;
    this.input = afterEventFrom<[InElement.Input]>(
        this._input.on.thru(asis),
        () => [{ value: this.it }]);
    this.on = this._input.on.thru(
        ({ value: newValue }, oldValue) => newValue === oldValue ? nextSkip() : nextArgs(newValue, oldValue),
    );

    this.events = new DomEventDispatcher(element);

    const self = this;
    const interest = this._interest = eventInterest(reason => this._input.done(reason));

    this.events.on('input')(onInput).needs(interest);
    this.events.on('change')(onInput).needs(interest);

    function onInput(event: Event) {
      send({ value: self.it, event }, self._value);
    }

    function update(value: string, oldValue: string) {
      send({ value }, oldValue);
    }

    function send(input: InElement.Input, oldValue: string) {
      for (;;) {
        self._value = input.value;

        // Corrections are value updates performed by update event receivers
        // The last correction is recorded and sent later, when all receivers receive current update
        let correction: [InElement.Input, string] | undefined;

        // Record corrections
        self._update = (newValue: string, old: string) => {
          // Corrections retain the event instance
          correction = [{ ...input, value: newValue }, old];
        };
        try {
          self._input.send(input, oldValue);
        } finally {
          self._update = update;
        }

        if (!correction) {
          break; // No more corrections
        }

        // Apply last correction
        // noinspection JSUnusedAssignment
        [input, oldValue] = correction;
      }
    }
  }

  get it(): string {
    return this.element.value;
  }

  set it(value: string) {

    const oldValue = this.it;

    if (value !== oldValue) {
      this.element.value = value;
      this._update(value, oldValue);
    }
  }

  done(reason?: any): this {
    this._interest.off(reason);
    return this;
  }

  protected _applyAspect<Kind extends InAspect.Application.Kind, T>(
      aspect: InAspect<Kind, T>
  ): InAspect.Application.Result<Kind, T, string> | undefined {
    return aspect === InElement__aspect as InAspect<any, any>
        ? inAspectValue(this as any) as InAspect.Application.Result<Kind, T, string>
        : undefined;
  }

}

/**
 * Constructs control for the given input element.
 *
 * @param element Target input element.
 *
 * @return New input element control instance.
 */
export function inElt(element: InElement.Element): InElement {
  return new InElementControl(element);
}
