import { asis, nextArgs, nextSkip } from 'call-thru';
import {
  AfterEvent,
  afterSupplied,
  DomEventDispatcher,
  EventEmitter,
  eventSupply,
  EventSupply,
  OnEvent,
} from 'fun-events';
import { InElement } from '../element.control';

export class InElementControl<Value, Elt extends HTMLElement> extends InElement<Value, Elt> {

  readonly input: AfterEvent<[InElement.Input<Value>]>;
  readonly on: OnEvent<[Value, Value]>;
  readonly events: DomEventDispatcher;
  private readonly _get: (this: InElementControl<Value, Elt>) => Value;
  private readonly _set: (this: InElementControl<Value, Elt>, value: Value) => void;
  private readonly _input: EventEmitter<[InElement.Input<Value>, Value]> = new EventEmitter();
  private readonly _supply: EventSupply;
  private _value: Value;
  // noinspection TypeScriptFieldCanBeMadeReadonly
  private _update: (value: Value, oldValue: Value) => void;

  constructor(
      readonly element: Elt,
      {
        get,
        set,
      }: {
        get: (this: InElementControl<Value, Elt>) => Value;
        set: (this: InElementControl<Value, Elt>, value: Value) => void;
      },
  ) {
    super();
    this._get = get;
    this._set = set;
    this._value = this.it;
    this._update = update;
    this.input = afterSupplied<[InElement.Input<Value>]>(
        this._input.on.thru(asis),
        () => [{ value: this.it }],
    );
    this.on = this._input.on.thru(
        ({ value: newValue }, oldValue) => newValue === oldValue ? nextSkip() : nextArgs(newValue, oldValue),
    );

    this.events = new DomEventDispatcher(element);

    const self = this;
    const supply = this._supply = eventSupply(reason => this._input.done(reason));

    this.events.on('input')(onInput).needs(supply);
    this.events.on('change')(onInput).needs(supply);

    function onInput(event: Event) {
      send({ value: self.it, event }, self._value);
    }

    function update(value: Value, oldValue: Value) {
      send({ value }, oldValue);
    }

    function send(input: InElement.Input<Value>, oldValue: Value) {
      for (;;) {
        self._value = input.value;

        // Corrections are value updates performed by update event receivers
        // The last correction is recorded and sent later, when all receivers receive current update
        let correction: [InElement.Input<Value>, Value] | undefined;

        // Record corrections
        self._update = (newValue: Value, old: Value) => {
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

  get it(): Value {
    return this._get();
  }

  set it(value: Value) {

    const oldValue = this.it;

    if (value !== oldValue) {
      this._set(value);
      this._update(this._get(), oldValue);
    }
  }

  done(reason?: any): this {
    this._supply.off(reason);
    return this;
  }

}
