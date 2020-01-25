/**
 * @packageDocumentation
 * @module input-aspects
 */
import { noop } from 'call-thru';
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
 */
export type InSupply = EventSupply;

const InSupply__aspect: InAspect<InSupply> = {
  applyTo(): InAspect.Applied<InSupply> {
    return {
      instance: eventSupply(),
      convertTo: noop,
    };
  },
};

export const InSupply = {
  get [InAspect__symbol](): InAspect<InSupply> {
    return InSupply__aspect;
  },
};
