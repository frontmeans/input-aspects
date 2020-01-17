/**
 * @module input-aspects
 */
import { NamespaceAliaser, newNamespaceAliaser } from 'namespace-aliaser';
import { InAspect, InAspect__symbol } from './aspect';
import { inAspectValue } from './aspect.impl';
import { InConverter } from './converter';

/**
 * Namespace aliaser aspect.
 *
 * Used by other aspect to generate unique names.
 *
 * Creates new namespace aliaser and reuses it across converted controls unless overridden e.g. by
 * [[InNamespaceAliaser.to]] converter.
 *
 * @category Aspect
 */
export type InNamespaceAliaser = NamespaceAliaser;

/**
 * @internal
 */
const InNamespaceAliaser__aspect: InAspect<InNamespaceAliaser> = {

  applyTo() {
    return inAspectValue(newNamespaceAliaser());
  },

};

export const InNamespaceAliaser = {

  get [InAspect__symbol](): InAspect<InNamespaceAliaser> {
    return InNamespaceAliaser__aspect;
  },

  /**
   * Creates input control aspect converter that assigns the given namespace aliaser to converted control.
   *
   * @param nsAlias  Target namespace aliaser.
   *
   * @returns Input control aspect converter.
   */
  to<Value>(nsAlias: InNamespaceAliaser): InConverter.Aspect<any, Value> {
    return {
      applyAspect<Instance, Kind extends InAspect.Application.Kind>(
          aspect: InAspect<any, any>,
      ): InAspect.Applied<InAspect.Application.Instance<Instance, Value, Kind>> | undefined {
        return aspect === InNamespaceAliaser__aspect
            ? inAspectValue(nsAlias) as InAspect.Application.Result<Instance, Value, Kind>
            : undefined;
      },
    };
  },

};
