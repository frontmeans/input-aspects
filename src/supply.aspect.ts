/**
 * @packageDocumentation
 * @module input-aspects
 */
import { eventSupply, EventSupply } from 'fun-events';
import { InAspect, InAspect__symbol } from './aspect';

/**
 * Input supply.
 *
 * This is an aspect of user input that informs on input control disposal. The control and its aspects should not be
 * used after this supply is cut off.
 *
 * Aspects releases all resources when this supply is cut off.
 *
 * Each control has its own supply. The [[InControl.done]] method cuts off this supply. While its
 * [[InControl.whenDone]] one calls a `whenOff()` method of this supply.
 *
 * An input supply of converted control depends on the input supply of the control it is converted from.
 *
 * @category Aspect
 */
export type InSupply = EventSupply;

const InSupply__aspect: InAspect<InSupply> = {
  applyTo(): InAspect.Applied<any, InSupply> {

    const convertFrom = (from: InSupply): InAspect.Applied<any, InSupply> => ({
      instance: eventSupply().needs(from),
      convertTo() {
        return convertFrom(this.instance);
      },
    });

    return convertFrom(eventSupply());
  },
};

/**
 * @category Aspect
 */
export const InSupply = {
  get [InAspect__symbol](): InAspect<InSupply> {
    return InSupply__aspect;
  },
};
