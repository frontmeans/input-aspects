import { asis, nextArgs, nextSkip } from 'call-thru';
import {
  AfterEvent,
  afterSupplied,
  EventEmitter,
  EventSupply,
  EventSupply__symbol,
  eventSupplyOf,
  OnEvent,
} from 'fun-events';
import { DomEventDispatcher } from 'fun-events/dom';
import { InConverter } from '../converter';
import { InElement } from '../element.control';

/**
 * @internal
 */
export class InElementControl<Value, Elt extends HTMLElement> extends InElement<Value, Elt> {

  readonly input: AfterEvent<[InElement.Input<Value>]>;
  readonly on: OnEvent<[Value, Value]>;
  readonly events: DomEventDispatcher;
  private readonly _get: (this: InElementControl<Value, Elt>) => Value;
  private readonly _set: (this: InElementControl<Value, Elt>, value: Value) => void;
  private readonly _input: EventEmitter<[InElement.Input<Value>, Value]> = new EventEmitter();
  private _value: Value;
  // noinspection TypeScriptFieldCanBeMadeReadonly
  private _update: (value: Value, oldValue: Value) => void;

  get [EventSupply__symbol](): EventSupply {
    return eventSupplyOf(this._input);
  }

  constructor(
      readonly element: Elt,
      {
        aspects,
        get,
        set,
      }: {
        readonly aspects?: InConverter.Aspect<Value> | readonly InConverter.Aspect<Value>[];
        readonly get: (this: InElementControl<Value, Elt>) => Value;
        readonly set: (this: InElementControl<Value, Elt>, value: Value) => void;
      },
  ) {
    super({ aspects });
    this._get = get;
    this._set = set;
    this._value = this.it;

    const update = this._update = (value: Value, oldValue: Value): void => send({ value }, oldValue);

    this.input = afterSupplied<[InElement.Input<Value>]>(
        this._input.on.thru(asis),
        () => [{ value: this.it }],
    );

    this.on = this._input.on.thru(
        ({ value: newValue }, oldValue) => newValue === oldValue ? nextSkip() : nextArgs(newValue, oldValue),
    );

    this.events = new DomEventDispatcher(element);

    const self = this;
    const supply = eventSupplyOf(this);
    const onInput = (event: Event): void => send({ value: self.it, event }, self._value);

    this.events.on('input')(onInput).needs(supply);
    this.events.on('change')(onInput).needs(supply);

    function send(input: InElement.Input<Value>, oldValue: Value): void {
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

}
