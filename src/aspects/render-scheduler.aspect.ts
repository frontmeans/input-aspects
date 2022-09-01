import { newRenderSchedule, RenderScheduler } from '@frontmeans/render-scheduler';
import { knownInAspect } from '../applied-aspect';
import { InAspect, InAspect__symbol } from '../aspect';
import { InConverter } from '../converter';

/**
 * Input elements render scheduler.
 *
 * It is used e.g. to schedule CSS updates. The control values and attributes are updated instantly.
 *
 * Uses the default render scheduler unless overridden e.g. by {@link InRenderScheduler.to} converter.
 *
 * @category Aspect
 */
export type InRenderScheduler = RenderScheduler;

/**
 * @internal
 */
const InRenderScheduler__aspect: InAspect<InRenderScheduler> = {
  applyTo() {
    return knownInAspect(newRenderSchedule);
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
   * @typeParam TValue - Converted control value type.
   * @param scheduler - Target DOM render scheduler.
   *
   * @returns Input control aspect converter.
   */
  to<TValue>(scheduler: InRenderScheduler): InConverter.Aspect<any, TValue> {
    return {
      applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
        aspect: InAspect<any, any>,
      ):
        | InAspect.Applied<any, InAspect.Application.Instance<TInstance, TValue, TKind>>
        | undefined {
        return aspect === InRenderScheduler__aspect
          ? (knownInAspect(scheduler) as InAspect.Application.Result<TInstance, TValue, TKind>)
          : undefined;
      },
    };
  },
};
