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
 * Abstract implementation of {@link InElement input HTML element control}.
 *
 * @category Control
 * @typeparam Value  Input value type.
 * @typeparam Elt  A type of input HTML element.
 */
export class AbstractInElement<Value, Elt extends HTMLElement> extends InElement<Value, Elt> {

  readonly input: AfterEvent<[InElement.Input<Value>]>;
  readonly on: OnEvent<[Value, Value]>;
  readonly events: DomEventDispatcher;
  private readonly _get: (this: AbstractInElement<Value, Elt>) => Value;
  private readonly _set: (this: AbstractInElement<Value, Elt>, value: Value) => void;
  private readonly _input: EventEmitter<[InElement.Input<Value>, Value]> = new EventEmitter();
  private _value: Value;
  // noinspection TypeScriptFieldCanBeMadeReadonly
  private _update: (value: Value, oldValue: Value) => void;

  get [EventSupply__symbol](): EventSupply {
    return eventSupplyOf(this._input);
  }

  /**
   * Constructs HTML input element control.
   *
   * @param element  HTML input element the constructed control is based on.
   * @param aspects  Input aspects applied by default. These are aspect converters to constructed control
   * from the {@link inValueOf same-valued one}.
   * @param get  Input value getter.
   * @param set  Input value setter.
   */
  constructor(
      readonly element: Elt,
      {
        aspects,
        get,
        set,
      }: {
        readonly aspects?: InConverter.Aspect<Value> | readonly InConverter.Aspect<Value>[];
        readonly get: (this: AbstractInElement<Value, Elt>) => Value;
        readonly set: (this: AbstractInElement<Value, Elt>, value: Value) => void;
      },
  ) {
    super({ aspects });

    const self = this;

    this._get = get;
    this._set = set;
    this._value = this.it;

    const doUpdate = this._update = (value: Value, oldValue: Value): void => update({ value }, oldValue);

    this.input = afterSupplied<[InElement.Input<Value>]>(
        this._input.on.thru(asis),
        () => [{ value: this.it }],
    );

    this.on = this._input.on.thru(
        ({ value: newValue }, oldValue) => newValue === oldValue ? nextSkip() : nextArgs(newValue, oldValue),
    );

    this.events = new DomEventDispatcher(element);
    eventSupplyOf(this.events).needs(this);
    this.listenForInput(input => update(input, this._value));

    function update(input: InElement.Input<Value>, oldValue: Value): void {
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
          self._update = doUpdate;
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

  /**
   * Enables reaction to input input.
   *
   * By default listens for `input` and `change` events.
   *
   * @param update  Updates current value by user input and sends update event. This function is to be called by
   * input event listeners.
   */
  protected listenForInput(update: (input: InElement.Input<Value>) => void): void {

    const onInput = (event: Event): void => update({ value: this.it, event });

    this.events.on('input')(onInput);
    this.events.on('change')(onInput);
  }

}