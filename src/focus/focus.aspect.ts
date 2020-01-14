/**
 * @module input-aspects
 */
import { noop } from 'call-thru';
import { trackValue, ValueTracker } from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectNull, inAspectValue } from '../aspect.impl';
import { InControl } from '../control';
import { InElement } from '../element.control';

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
 *
 * @category Aspect
 */
export abstract class InFocus extends ValueTracker<boolean> {

  static get [InAspect__symbol](): InAspect<InFocus | null> {
    return InFocus__aspect;
  }

}

class InControlFocus extends InFocus {

  private readonly _it: ValueTracker<boolean>;

  constructor({ element, events }: InElement<any>) {
    super();

    const owner: DocumentOrShadowRoot | null =
        element.getRootNode ? element.getRootNode() as any : element.ownerDocument;

    this._it = trackValue(!!owner && owner.activeElement === element);
    events.on('focus')(() => this._it.it = true);
    events.on('blur')(() => this._it.it = false);
    this.on({
      receive(ctx, newValue) {
        ctx.onRecurrent(noop);
        newValue ? element.focus() : element.blur();
      },
    });
  }

  get on() {
    return this._it.on;
  }

  get it(): boolean {
    return this._it.it;
  }

  set it(value: boolean) {
    this._it.it = value;
  }

  done(reason?: any): this {
    this._it.done(reason);
    return this;
  }

}
