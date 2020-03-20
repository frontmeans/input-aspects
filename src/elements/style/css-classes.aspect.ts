/**
 * @packageDocumentation
 * @module @proc7ts/input-aspects
 */
import { filterIt, itsEach, ObjectEntry, overEntries } from '@proc7ts/a-iterable';
import { noop } from '@proc7ts/call-thru';
import { DeltaSet } from '@proc7ts/delta-set';
import {
  afterEach,
  AfterEvent,
  AfterEvent__symbol,
  afterEventBy,
  afterSupplied,
  EventKeeper,
  EventNotifier,
  EventReceiver,
  eventSupply,
  EventSupply,
  eventSupplyOf,
  isEventKeeper,
  nextAfterEvent,
  trackValue,
  ValueTracker,
} from '@proc7ts/fun-events';
import { css__naming, isQualifiedName, QualifiedName } from '@proc7ts/namespace-aliaser';
import { RenderSchedule } from '@proc7ts/render-scheduler';
import { InAspect, InAspect__symbol } from '../../aspect';
import { InNamespaceAliaser, InRenderScheduler } from '../../aspects';
import { InControl } from '../../control';
import { InStyledElement } from './styled-element.aspect';

/**
 * @internal
 */
const InCssClasses__aspect: InAspect<InCssClasses> = {

  applyTo(control: InControl<any>): InAspect.Applied<any, InCssClasses> {
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
   * Builds an `AfterEvent` keeper of CSS classes to be applied to styled element.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   *
   * @returns `AfterEvent` keeper of CSS classes map.
   */
  abstract read(): AfterEvent<[InCssClasses.Map]>;

  /**
   * Starts sending CSS classes for styled element and updates to the given `receiver`.
   *
   * @param receiver  Target receiver of CSS classes map.
   *
   * @returns CSS classes supply.
   */
  abstract read(receiver: EventReceiver<[InCssClasses.Map]>): EventSupply;

  [AfterEvent__symbol](): AfterEvent<[InCssClasses.Map]> {
    return this.read();
  }

  /**
   * Builds an `AfterEvent` keeper of added and removed CSS classes.
   *
   * Sends current CSS classes as added ones on receiver registration.
   *
   * @returns `AfterEvent` keeper of added and removed classes.
   */
  abstract track(): AfterEvent<[readonly string[], readonly string[]]>;

  /**
   * Starts sending current, added and removed CSS classes to the given `receiver`
   *
   * Sends current CSS classes as added ones on receiver registration.
   *
   * @param receiver  Target receiver of added and removed CSS classes.
   *
   * @returns CSS classes supply.
   */
  abstract track(receiver: EventReceiver<[readonly string[], readonly string[]]>): EventSupply;

  /**
   * Appends CSS classes from the given `source` to styled element.
   *
   * @param source  A source of CSS class names.
   *
   * @returns CSS class names supply. Removes `source` CSS classes from styled element once cut off.
   */
  abstract add(source: InCssClasses.Source): EventSupply;

  /**
   * Converts arbitrary CSS classes source to their {@link InCssClasses.Spec specifiers}.
   *
   * @param source  A source of CSS classes names.
   *
   * @returns An `AfterEvent` keeper of CSS class name specifiers.
   */
  abstract specs(source: InCssClasses.Source): AfterEvent<InCssClasses.Spec[]>;

  /**
   * Resolves arbitrary CSS classes source to {@link InCssClasses.Map map of class names}.
   *
   * @param source  A source of CSS classes names.
   *
   * @returns An `AfterEvent` keeper of CSS class names map.
   */
  abstract resolve(source: InCssClasses.Source): AfterEvent<[InCssClasses.Map]>;

  /**
   * Applies CSS classes to the given styled element.
   *
   * @param element  Target element to apply CSS classes to.
   * @param schedule  DOM render schedule to add CSS class updates to. A new schedule is constructed by
   * {@link InRenderScheduler input render scheduler} by default.
   *
   * @returns CSS classes supply that stops their application and removes already applied ones once cut off.
   */
  abstract applyTo(element: InStyledElement, schedule?: RenderSchedule): EventSupply;

  /**
   * Removes all CSS class sources and stops applying CSS classes to styled elements.
   *
   * @param reason  An optional reason.
   *
   * @returns `this` instance.
   */
  abstract done(reason?: any): this;

}

export namespace InCssClasses {

  /**
   * A source of CSS class names for styled element.
   *
   * This is either an event keeper of CSS class names, or a function returning one and accepting target input
   * control as the only parameter.
   */
  export type Source =
      | EventKeeper<Spec[]>
      | ((this: void, control: InControl<any>) => EventKeeper<Spec[]>);

  /**
   * A specifier of CSS classes for styled element.
   *
   * This is either a single (potentially qualified) class name, or a {@link Map map of class names}.
   *
   * Qualified names are converted to simple ones by [[InNamespaceAliaser]] aspect.
   */
  export type Spec =
      | QualifiedName
      | Map;

  /**
   * A map of CSS class names for styled element.
   *
   * The keys of this map are class names to apply.
   * - When the value is `true` corresponding class name will be added.
   * - When the value is `false` corresponding class name will not be added.
   * - The `undefined` value is ignored.
   */
  export type Map = {
    readonly [name in string]?: boolean;
  };

}

/**
 * @internal
 */
const UnsubscribeReason__symbol = (/*#__PURE__*/ Symbol('reason'));

/**
 * @internal
 */
interface UnsubscribeReason {
  readonly [UnsubscribeReason__symbol]?: any;
}

/**
 * @internal
 */
function isUnsubscribeReason(reason: any): reason is UnsubscribeReason {
  return reason && typeof reason === 'object' && UnsubscribeReason__symbol in reason;
}

/**
 * @internal
 */
class InControlCssClasses extends InCssClasses {

  private readonly _sources: ValueTracker<[Map<AfterEvent<[InCssClasses.Map]>, EventSupply>]> = trackValue([new Map()]);
  private _schedule?: RenderSchedule;

  constructor(private readonly _control: InControl<any>) {
    super();

    const element = _control.aspect(InStyledElement);

    if (element) {
      this.applyTo(element, this.schedule);
    }

    eventSupplyOf(_control).whenOff(reason => this.done(reason));
  }

  get schedule(): RenderSchedule {
    return this._schedule || (this._schedule = controlSchedule(
        this._control,
        this._control.aspect(InStyledElement)!,
    ));
  }

  read(): AfterEvent<[InCssClasses.Map]>;
  read(receiver: EventReceiver<[InCssClasses.Map]>): EventSupply;
  read(receiver?: EventReceiver<[InCssClasses.Map]>): AfterEvent<[InCssClasses.Map]> | EventSupply {
    return (this.read = this._sources.read().tillOff(this._control).keepThru_(
        ([sources]) => nextAfterEvent(afterEach(...sources.keys())),
        (...classes) => {

          const result: { [name: string]: boolean } = {};

          classes.forEach(([map]) => mergeInCssClassesMap(map, result));

          return result;
        },
    ).F)(receiver);
  }

  track(): AfterEvent<[readonly string[], readonly string[]]>;
  track(receiver: EventReceiver<[readonly string[], readonly string[]]>): EventSupply;
  track(
      receiver?: EventReceiver<[readonly string[], readonly string[]]>,
  ): AfterEvent<[readonly string[], readonly string[]]> | EventSupply {
    return (this.track = afterEventBy<[readonly string[], readonly string[]]>(receiver => {
      receiver.supply.needs(this._control);

      const classes = new DeltaSet<string>();
      const emitter = new EventNotifier<[readonly string[], readonly string[]]>();
      let classesSent = false;
      const sendClasses = (): void => {
        classesSent = true;
        classes.redelta(
            (add, remove) => emitter.send(add, remove),
        ).undelta();
      };

      emitter.on(receiver);

      return this.read(map => {

        const remove = new Set(classes);
        const add: string[] = [];

        itsEach(
            filterIt<ObjectEntry<InCssClasses.Map>>(
                overEntries<InCssClasses.Map>(map),
                ([, flag]) => !!flag,
            ),
            ([name]) => {
              if (!remove.delete(name)) {
                add.push(name);
              }
            },
        );

        if (!classesSent || add.length || remove.size) {
          classes.delta(add, remove);
          sendClasses();
        }
      });
    }).F)(receiver);
  }

  specs(source: InCssClasses.Source): AfterEvent<InCssClasses.Spec[]> {
    return afterSupplied(isEventKeeper(source) ? source : source(this._control));
  }

  resolve(source: InCssClasses.Source): AfterEvent<[InCssClasses.Map]> {

    const nsAlias = this._control.aspect(InNamespaceAliaser);

    return this.specs(source).keepThru(
        (...names) => {

          const result: { [name: string]: boolean } = {};

          names.forEach(name => {
            if (isQualifiedName(name)) {
              result[css__naming.name(name, nsAlias)] = true;
            } else {
              mergeInCssClassesMap(name, result);
            }
          });

          return result;
        },
    );
  }

  add(source: InCssClasses.Source): EventSupply {

    const inSupply = eventSupplyOf(this._control);

    if (inSupply.isOff) {
      return inSupply;
    }

    const classesSupply = eventSupply();
    const src = afterEventBy<[InCssClasses.Map]>(receiver => {

      const supply = this.resolve(source).to({
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

    return classesSupply.needs(inSupply);
  }

  applyTo(
      element: Element,
      schedule: RenderSchedule = controlSchedule(this._control, element),
  ): EventSupply {

    const { classList } = element;
    const classes = new DeltaSet<string>();
    const updateClasses = (): void => {
      classes.redelta((add, remove) => {
        classList.remove(...remove);
        classList.add(...add);
      }).undelta();
    };

    return this.track((add, remove) => {
      classes.delta(add, remove);
      schedule(updateClasses);
    }).whenOff(() => {
      if (classes.size) {
        classes.clear();
        schedule(updateClasses);
      }
    });
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

/**
 * @internal
 */
function mergeInCssClassesMap(map: InCssClasses.Map, result: { [name: string]: boolean }): void {
  itsEach(
      overEntries(map),
      ([name, flag]) => {
        if (flag != null) {
          result[name] = flag;
        }
      },
  );
}

/**
 * @internal
 */
function controlSchedule(control: InControl<any>, node: Node | undefined): RenderSchedule {
  return control.aspect(InRenderScheduler)({ node });
}
