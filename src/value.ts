import { trackValue, ValueTracker } from 'fun-events';
import { InControl } from './control';

/**
 * Simple input control implementation.
 *
 * Does not handle actual user input. Instead maintains the value set programmatically.
 *
 * @typeparam Value Input value type.
 */
export class InValue<Value> extends InControl<Value> {

  /**
   * @internal
   */
  private readonly _it: ValueTracker<Value>;

  /**
   * Constructs simple input control.
   *
   * @param value Initial input value.
   */
  constructor(value: Value) {
    super();
    this._it = trackValue(value);
  }

  get on() {
    return this._it.on;
  }

  get it(): Value {
    return this._it.it;
  }

  set it(value: Value) {
    this._it.it = value;
  }

  done(reason?: any): this {
    this._it.done(reason);
    return this;
  }

}
