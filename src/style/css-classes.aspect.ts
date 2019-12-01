/**
 * @module input-aspects
 */
import { filterIt, itsEach, mapIt, overEntries } from 'a-iterable';
import { noop, valueProvider } from 'call-thru';
import {
  afterEach,
  AfterEvent,
  AfterEvent__symbol,
  afterEventBy,
  afterThe,
  EventKeeper,
  eventSupply,
  EventSupply,
  isEventKeeper,
  trackValue,
  ValueTracker,
} from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { InControl } from '../control';
import { InStyledElement } from './styled-element.aspect';

const InCssClasses__aspect: InAspect<InCssClasses> = {

  applyTo(control: InControl<any>): InAspect.Applied<InCssClasses> {
    return {
      instance: new InControlCssClasses(control),
      convertTo: noop,
    };
  },

};

/**
 * An aspect of the user input representing CSS classes to apply to styled element.
 *
 * Implements an `EventKeeper` interface by reporting all CSS classes applied to styled element.
 *
 * @category Aspect
 */
export abstract class InCssClasses implements EventKeeper<[InCssClasses.Map]> {

  static get [InAspect__symbol](): InAspect<InCssClasses> {
    return InCssClasses__aspect;
  }

  /**
   * An `AfterEvent` keeper of CSS classes applied to styled element.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[InCssClasses.Map]>;

  get [AfterEvent__symbol](): AfterEvent<[InCssClasses.Map]> {
    return this.read;
  }

  /**
   * Appends CSS classes from the given `source` to styled element.
   *
   * @param source  A source of CSS class names.
   *
   * @returns CSS class names supply. Removes `source` CSS classes from styled element once cut off.
   */
  abstract add(source: InCssClasses.Source): EventSupply;

  /**
   * Removes all CSS class sources and stops applying CSS classes to styled element.
   *
   * @param reason  An optional reason.
   *
   * @returns `this` instance.
   */
  abstract done(reason?: any): this;

}

export namespace InCssClasses {

  /**
   * A source of CSS class names for input control.
   *
   * This is either an event keeper of CSS class names map, or a function returning one and accepting target input
   * control as the only parameter.
   */
  export type Source =
      | EventKeeper<[InCssClasses.Map]>
      | ((control: InControl<any>) => EventKeeper<[InCssClasses.Map]>);

  /**
   * A map CSS class names to apply to styled element.
   *
   * The keys of this map are class names tpo apply.
   * - When the value is `true` corresponding class name will be added.
   * - When the value is `false` corresponding class name will not be added.
   * - The `undefined` value is ignored.
   */
  export interface Map {
    readonly [name: string]: boolean | undefined;
  }

}

const UnsubscribeReason__symbol = /*#__PURE__*/ Symbol('reason');

interface UnsubscribeReason {
  readonly [UnsubscribeReason__symbol]?: any;
}

function isUnsubscribeReason(reason: any): reason is UnsubscribeReason {
  return reason && typeof reason === 'object' && UnsubscribeReason__symbol in reason;
}

class InControlCssClasses extends InCssClasses {

  readonly read: AfterEvent<[InCssClasses.Map]>;
  private readonly _sources: ValueTracker<[Map<AfterEvent<[InCssClasses.Map]>, EventSupply>]> =
      trackValue([new Map()]);

  constructor(private readonly _control: InControl<any>) {
    super();
    this.read = this._sources.read.keep.dig_(
        ([sources]) => sources.size ? afterEach(...sources.keys()) : afterThe(),
    ).keep.thru((...classes) => {

      const result: { [name: string]: boolean | undefined } = {};

      classes.forEach(([map]) => {
        itsEach(
            overEntries(map),
            ([name, flag]) => {
              if (flag != null) {
                result[name] = flag;
              }
            },
        );
      });

      return result;
    });

    const element = _control.aspect(InStyledElement);

    if (element) {

      const { classList } = element;
      const applied = new Set<string>();

      this.read(map => {

        const toRemove = new Set<string>(applied);
        const toAdd = new Set<string>(
            mapIt(
                filterIt(
                    overEntries(map),
                    ([name, flag]) => !!flag && !toRemove.delete(name as string),
                ),
                ([name]) => name as string,
            ),
        );

        toRemove.forEach(name => {
          classList.remove(name);
          applied.delete(name);
        });
        toAdd.forEach(name => {
          classList.add(name);
          applied.add(name);
        });
      });
    }
  }

  add(source: InCssClasses.Source): EventSupply {

    const keeper = inCssClassesSource(source)(this._control);
    const classesSupply = eventSupply();
    const src = afterEventBy<[InCssClasses.Map]>(receiver => {

      const supply = keeper[AfterEvent__symbol]({
        receive(context, ...event) {
          receiver.receive(context, ...event);
        },
      });

      receiver.supply.whenOff(reason => {
        classesSupply.off({ [UnsubscribeReason__symbol]: reason });
      });
      classesSupply.needs(supply).whenOff(reason => {
        if (isUnsubscribeReason(reason)) {
          supply.off(reason[UnsubscribeReason__symbol]);
        }
      });
    }).share();

    const [sources] = this._sources.it;

    sources.set(src, classesSupply);
    classesSupply.whenOff(reason => {
      if (!isUnsubscribeReason(reason)) {
        sources.delete(src);
        this._sources.it = [sources];
      }
    });

    this._sources.it = [sources];

    return classesSupply;
  }

  done(reason?: any): this {
    itsEach(
        this._sources.it[0].values(),
        supply => supply.off(reason),
    );
    this._sources.done(reason);
    return this;
  }

}

function inCssClassesSource(source: InCssClasses.Source): (control: InControl<any>) => EventKeeper<[InCssClasses.Map]> {
  if (isEventKeeper(source)) {
    return valueProvider(source);
  }
  return source;
}
