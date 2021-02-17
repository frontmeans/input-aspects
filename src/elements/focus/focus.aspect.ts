import { OnEvent, trackValue, ValueTracker } from '@proc7ts/fun-events';
import { noop, Supply } from '@proc7ts/primitives';
import { builtInAspect } from '../../applied-aspect';
import { InAspect, InAspect__symbol } from '../../aspect';
import { InControl } from '../../control';
import { InElement } from '../../element.control';

/**
 * @internal
 */
const InFocus__aspect: InAspect<InFocus | null> = {

  applyTo<TValue>(control: InControl<TValue>): InAspect.Applied<TValue, InFocus | null> {
    return builtInAspect(control, InFocus, ctrl => {

      const element = ctrl.aspect(InElement);

      return element && new InControlFocus(element);
    });
  },

};

/**
 * Input focus aspect.
 *
 * This is a value tracker of element focus flag. Or `null` when {@link InElement} aspect is absent.
 *
 * @category Aspect
 */
export abstract class InFocus extends ValueTracker<boolean> {

  static get [InAspect__symbol](): InAspect<InFocus | null> {
    return InFocus__aspect;
  }

}

/**
 * @internal
 */
class InControlFocus extends InFocus {

  private readonly _it: ValueTracker<boolean>;

  constructor(inElement: InElement<any>) {
    super();

    const { element, events } = inElement;
    const owner: DocumentOrShadowRoot = element.getRootNode
        ? element.getRootNode() as unknown as DocumentOrShadowRoot
        : element.ownerDocument;

    this._it = trackValue(owner.activeElement === element);
    this.supply.needs(inElement);

    events.on('focus')(() => this._it.it = true);
    events.on('blur')(() => this._it.it = false);
    this.on({
      receive(ctx, newValue) {
        ctx.onRecurrent(noop);
        if (newValue) {
          element.focus();
        } else {
          element.blur();
        }
      },
    });
  }

  get supply(): Supply {
    return this._it.supply;
  }

  get it(): boolean {
    return this._it.it;
  }

  set it(value: boolean) {
    this._it.it = value;
  }

  get on(): OnEvent<[boolean, boolean]> {
    return this._it.on;
  }

}
