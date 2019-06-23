import { DomEventDispatcher, EventEmitter, eventInterest, EventInterest } from 'fun-events';
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

}

class InElementControl extends InElement {

  readonly events: DomEventDispatcher;
  private readonly _on = new EventEmitter<[string, string]>();
  private readonly _interest: EventInterest;
  private _value: string;

  constructor(readonly element: InElement.Element) {
    super();
    this.events = new DomEventDispatcher(element);
    this._value = element.value;

    const self = this;
    const interest = this._interest = eventInterest(reason => this._on.done(reason));

    this.events.on('input')(update).needs(interest);
    this.events.on('change')(update).needs(interest);

    function update() {

      const old = self._value;
      const value = self.it;

      if (value !== old) {
        self._value = value;
        self._on.send(value, old);
      }
    }
  }

  get on() {
    return this._on.on;
  }

  get it(): string {
    return this.element.value;
  }

  set it(value: string) {

    const old = this.it;

    if (value !== old) {
      this._value = value;
      this.element.value = value;
      this._on.send(value, old);
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
