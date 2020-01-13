import { newRenderSchedule, RenderScheduler } from 'render-scheduler';
import { InAspect, InAspect__symbol } from './aspect';
import { inAspectValue } from './aspect.impl';

/**
 * Input elements render scheduler.
 *
 * It is used e.g. to schedule CSS updates. The control values and attributes are updated instantly.
 *
 * Uses the default render scheduler unless overridden e.g. by [[intoWrapper]] converter.
 */
export type InRenderScheduler = RenderScheduler;

const InRenderScheduler__aspect: InAspect<InRenderScheduler> = {

  applyTo() {
    return inAspectValue(newRenderSchedule);
  },

};

export const InRenderScheduler = {

  get [InAspect__symbol](): InAspect<InRenderScheduler> {
    return InRenderScheduler__aspect;
  },

};
