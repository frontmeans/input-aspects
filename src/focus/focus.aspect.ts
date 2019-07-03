import { EventEmitter, ValueTracker } from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectNull, inAspectValue } from '../aspect.impl';
import { InControl } from '../control';
import { InElement } from '../element';

const InFocus__aspect: InAspect<InFocus | null> = {

  applyTo<Value>(control: InControl<Value>): InAspect.Applied<InFocus | null> {

    const element = control.aspect(InElement);

    if (!element) {
      return inAspectNull;
    }

    return inAspectValue(new InControlFocus(element));
  },

};

/**
 * Input focus aspect.
 *
 * This is a value tracker of element focus flag. Or `null` when [[InElement]] aspect is absent.
 */
export abstract class InFocus extends ValueTracker<boolean> {

  static get [InAspect__symbol](): InAspect<InFocus | null> {
    return InFocus__aspect;
  }

}

class InControlFocus extends InFocus {

  private readonly _on = new EventEmitter<[boolean, boolean]>();

  constructor(private readonly _element: InElement) {
    super();

    const events = _element.events;

    events.on('focus')(() => this._on.send(true, false));
    events.on('blur')(() => this._on.send(false, true));
  }

  get on() {
    return this._on.on;
  }

  get it(): boolean {

    const element = this._element.element;
    const owner: DocumentOrShadowRoot | null =
        element.getRootNode ? element.getRootNode() as any : element.ownerDocument;

    return !!owner && owner.activeElement === element;
  }

  set it(value: boolean) {
    if (this.it !== value) {

      const element = this._element.element;

      if (value) {
        element.focus();
      } else {
        element.blur();
      }
    }
  }

  done(reason?: any): this {
    this._on.done(reason);
    return this;
  }

}
