/**
 * @module input-aspects
 */
import { filterIt, itsEach, ObjectEntry, overEntries } from 'a-iterable';
import { noop, valueProvider } from 'call-thru';
import { DeltaSet } from 'delta-set';
import {
  afterEach,
  AfterEvent,
  AfterEvent__symbol,
  afterEventBy,
  afterThe,
  EventKeeper,
  EventNotifier,
  eventSupply,
  EventSupply,
  isEventKeeper,
  trackValue,
  ValueTracker,
} from 'fun-events';
import { RenderSchedule } from 'render-scheduler';
import { InAspect, InAspect__symbol } from '../aspect';
import { InControl } from '../control';
import { InRenderScheduler } from '../render-scheduler.aspect';
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
   * An `AfterEvent` keeper of CSS classes to be applied to styled element.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[InCssClasses.Map]>;

  get [AfterEvent__symbol](): AfterEvent<[InCssClasses.Map]> {
    return this.read;
  }

  /**
   * An `AfterEvent` keeper of added and removed CSS classes.
   *
   * Reports current CSS classes as added ones on receiver registration.
   */
  abstract readonly track: AfterEvent<[readonly string[], readonly string[]]>;

  /**
   * Appends CSS classes from the given `source` to styled element.
   *
   * @param source  A source of CSS class names.
   *
   * @returns CSS class names supply. Removes `source` CSS classes from styled element once cut off.
   */
  abstract add(source: InCssClasses.Source): EventSupply;

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
   * A source of CSS class names for input control.
   *
   * This is either an event keeper of CSS class names map, or a function returning one and accepting target input
   * control as the only parameter.
   */
  export type Source =
      | EventKeeper<[InCssClasses.Map]>
      | ((control: InControl<any>) => EventKeeper<[InCssClasses.Map]>);

  /**
   * A map of CSS class names to apply to styled element.
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

const UnsubscribeReason__symbol = /*#__PURE__*/ Symbol('reason');

interface UnsubscribeReason {
  readonly [UnsubscribeReason__symbol]?: any;
}

function isUnsubscribeReason(reason: any): reason is UnsubscribeReason {
  return reason && typeof reason === 'object' && UnsubscribeReason__symbol in reason;
}

class InControlCssClasses extends InCssClasses {

  readonly read: AfterEvent<[InCssClasses.Map]>;
  readonly track: AfterEvent<[readonly string[], readonly string[]]>;
  private readonly _sources: ValueTracker<[Map<AfterEvent<[InCssClasses.Map]>, EventSupply>]> = trackValue([new Map()]);
  private _schedule?: RenderSchedule;

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
    this.track = afterEventBy(receiver => {

      const classes = new DeltaSet<string>();
      const emitter = new EventNotifier<[readonly string[], readonly string[]]>();
      let classesSent = false;
      const sendClasses = () => {
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
    });

    const element = _control.aspect(InStyledElement);

    if (element) {
      this.applyTo(element, this.schedule);
    }
  }

  get schedule(): RenderSchedule {
    return this._schedule || (this._schedule = controlSchedule(
        this._control,
        this._control.aspect(InStyledElement)!,
    ));
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

  applyTo(
      element: Element,
      schedule: RenderSchedule = controlSchedule(this._control, element),
  ): EventSupply {

    const { classList } = element;
    const classes = new DeltaSet<string>();
    const updateClasses = () => classes.redelta((add, remove) => {
      classList.remove(...remove);
      classList.add(...add);
    }).undelta();

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

function inCssClassesSource(source: InCssClasses.Source): (control: InControl<any>) => EventKeeper<[InCssClasses.Map]> {
  if (isEventKeeper(source)) {
    return valueProvider(source);
  }
  return source;
}

function controlSchedule(control: InControl<any>, node: Node | undefined): RenderSchedule {
  return control.aspect(InRenderScheduler)({ node });
}
