import { DomEventDispatcher } from '@frontmeans/dom-events';
import { AfterEvent, EventEmitter, mapAfter, OnEvent, translateOn } from '@proc7ts/fun-events';
import { asis, Supply } from '@proc7ts/primitives';
import { InConverter } from '../converter';
import { InElement } from '../element.control';

/**
 * Abstract implementation of {@link InElement input HTML element control}.
 *
 * @category Control
 * @typeParam TValue - Input value type.
 * @typeParam TElt - A type of input HTML element.
 */
export class AbstractInElement<TValue, TElt extends HTMLElement> extends InElement<TValue, TElt> {

  readonly events: DomEventDispatcher;
  readonly input: AfterEvent<[InElement.Input<TValue>]>;
  readonly on: OnEvent<[TValue, TValue]>;
  private readonly _get: (this: AbstractInElement<TValue, TElt>) => TValue;
  private readonly _set: (this: AbstractInElement<TValue, TElt>, value: TValue) => void;
  private readonly _input: EventEmitter<[InElement.Input<TValue>, TValue]> = new EventEmitter();
  private _value: TValue;
  private _update: (value: TValue, oldValue: TValue) => void;

  /**
   * Constructs HTML input element control.
   *
   * @param element - HTML input element the constructed control is based on.
   * @param aspects - Input aspects applied by default. These are aspect converters to constructed control
   * from the {@link inValueOf same-valued one}.
   * @param get - Input value getter.
   * @param set - Input value setter.
   */
  constructor(
      readonly element: TElt,
      {
        aspects,
        get,
        set,
      }: {
        readonly aspects?: InConverter.Aspect<TValue> | readonly InConverter.Aspect<TValue>[];
        readonly get: (this: AbstractInElement<TValue, TElt>) => TValue;
        readonly set: (this: AbstractInElement<TValue, TElt>, value: TValue) => void;
      },
  ) {
    super({ aspects });

    const self = this;

    this._get = get;
    this._set = set;
    this._value = this.it;

    const doUpdate = this._update = (value: TValue, oldValue: TValue): void => update({ value }, oldValue);

    this.events = new DomEventDispatcher(element);
    this.events.supply.needs(this);
    this.listenForInput(input => update(input, this._value));

    this.on = this._input.on.do(
        translateOn((
            send,
            { value: newValue },
            oldValue,
        ) => newValue !== oldValue && send(newValue, oldValue)),
    );
    this.input = this._input.on.do(mapAfter(asis, () => ({ value: this.it })));

    function update(input: InElement.Input<TValue>, oldValue: TValue): void {
      for (;;) {
        self._value = input.value;

        // Corrections are value updates performed by update event receivers
        // The last correction is recorded and sent later, when all receivers receive current update
        let correction: [InElement.Input<TValue>, TValue] | undefined;

        // Record corrections
        self._update = (newValue: TValue, old: TValue) => {
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

  get supply(): Supply {
    return this._input.supply;
  }

  get it(): TValue {
    return this._get();
  }

  set it(value: TValue) {

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
   * @param update - Updates current value by user input and sends update event. This function is to be called by
   * input event listeners.
   */
  protected listenForInput(update: (input: InElement.Input<TValue>) => void): void {

    const onInput = (event: Event): void => update({ value: this.it, event });

    this.events.on('input')(onInput);
    this.events.on('change')(onInput);
  }

}
