import { AfterEvent, afterEventBy, trackValue } from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectNull, inAspectValue } from '../aspect.impl';
import { InControl } from '../control';
import { InElement } from '../element';

const InFocus__aspect: InAspect<'default', InFocus | null> = {

  applyTo<Value>(control: InControl<Value>): InAspect.Applied<InFocus | null, Value> {

    const element = control.aspect(InElement);

    if (!element) {
      return inAspectNull;
    }

    return inAspectValue(inControlFocus(element));
  },

};

/**
 * Input focus aspect.
 *
 * This is an `AfterEvent` registrar of element focus flag receivers. Or `null` when [[InElement]] aspect is absent.
 */
export type InFocus = AfterEvent<[boolean]>;

export const InFocus: InAspect.Key<'default', InFocus | null> = {

  get [InAspect__symbol](): InAspect<'default', InFocus | null> {
    return InFocus__aspect;
  }

};

function inControlFocus({ element, events }: InElement): AfterEvent<[boolean]> {
  return afterEventBy<[boolean]>(receiver => {

    const inFocus = trackValue(hasFocus(element));

    events.on('focus')(() => inFocus.it = true);
    events.on('blur')(() => inFocus.it = false);

    return inFocus.read(receiver);
  }).share();
}

function hasFocus(element: InElement.Element): boolean {

  const owner: DocumentOrShadowRoot | null = element.getRootNode ? element.getRootNode() as any : element.ownerDocument;

  return !!owner && owner.activeElement === element;
}
