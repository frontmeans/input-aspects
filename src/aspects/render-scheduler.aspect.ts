/**
 * @packageDocumentation
 * @module @proc7ts/input-aspects
 */
import { newRenderSchedule, RenderScheduler } from '@proc7ts/render-scheduler';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectValue } from '../aspect.impl';
import { InConverter } from '../converter';

/**
 * Input elements render scheduler.
 *
 * It is used e.g. to schedule CSS updates. The control values and attributes are updated instantly.
 *
 * Uses the default render scheduler unless overridden e.g. by [[InRenderScheduler.to]] converter.
 *
 * @category Aspect
 */
export type InRenderScheduler = RenderScheduler;

/**
 * @internal
 */
const InRenderScheduler__aspect: InAspect<InRenderScheduler> = {

  applyTo() {
    return inAspectValue(newRenderSchedule);
  },

};

/**
 * @category Aspect
 */
export const InRenderScheduler = {

  get [InAspect__symbol](): InAspect<InRenderScheduler> {
    return InRenderScheduler__aspect;
  },

  /**
   * Creates input control aspect converter that assigns the given render scheduler to converted control.
   *
   * @param scheduler  Target DOM render scheduler.
   *
   * @returns Input control aspect converter.
   */
  to<Value>(scheduler: InRenderScheduler): InConverter.Aspect<any, Value> {
    return {
      applyAspect<Instance, Kind extends InAspect.Application.Kind>(
          aspect: InAspect<any, any>,
      ): InAspect.Applied<any, InAspect.Application.Instance<Instance, Value, Kind>> | undefined {
        return aspect === InRenderScheduler__aspect
            ? inAspectValue(scheduler) as InAspect.Application.Result<Instance, Value, Kind>
            : undefined;
      },
    };
  },

};
