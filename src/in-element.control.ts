import { DomEventDispatcher, EventEmitter, eventInterest, EventInterest } from 'fun-events';
import { InAspect } from './in-aspect';
import { inAspectValue } from './in-aspect.impl';
import { InElement } from './in-element';
import { InElement__aspect } from './in-element.aspect';

declare module './in-element' {

  export namespace InElement {

    /**
     * DOM element accepting user input.
     *
     * This may be e.g. `HTMLInputElement`, `HTMLSelectElement`, or `HTMLTextAreaElement`.
     *
     * Input control can be built on top of this element using `inElt()` function.
     */
    export type Input = Element & { value: string };

  }

}

class InElementControl extends InElement {

  private readonly _on = new EventEmitter<[string, string]>();
  private readonly _interest: EventInterest;
  private _value: string;

  constructor(readonly element: InElement.Input) {
    super();
    this._value = element.value;

    const self = this;
    const events = new DomEventDispatcher(element);

    const interest = this._interest = eventInterest(reason => this._on.done(reason));

    events.on('input')(update).needs(interest);
    events.on('change')(update).needs(interest);

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
export function inElt(element: InElement.Input): InElement {
  return new InElementControl(element);
}
