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
import { InElement } from './element';

class InText extends InElement {

  readonly input: AfterEvent<[InElement.Input<string>]>;
  readonly on: OnEvent<[string, string]>;
  readonly events: DomEventDispatcher;
  private readonly _input: EventEmitter<[InElement.Input<string>, string]> = new EventEmitter();
  private readonly _interest: EventInterest;
  private _value: string;
  // noinspection TypeScriptFieldCanBeMadeReadonly
  private _update: (value: string, oldValue: string) => void;

  constructor(readonly element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
    super();
    this._value = element.value;
    this._update = update;
    this.input = afterEventFrom<[InElement.Input<string>]>(
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

    function send(input: InElement.Input<string>, oldValue: string) {
      for (;;) {
        self._value = input.value;

        // Corrections are value updates performed by update event receivers
        // The last correction is recorded and sent later, when all receivers receive current update
        let correction: [InElement.Input<string>, string] | undefined;

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

}

/**
 * Constructs control for the given textual input element.
 *
 * Note that this won't work for files, checkboxes, or radio buttons.
 *
 * @param element Target text input element. Either `<input>`, `<textarea>`, or `<select>`.
 *
 * @return New input element control instance.
 */
export function inText(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): InElement {
  return new InText(element);
}
