/**
 * @packageDocumentation
 * @module @frontmeans/input-aspects
 */
import { css__naming, isQualifiedName, QualifiedName } from '@frontmeans/namespace-aliaser';
import { RenderSchedule } from '@frontmeans/render-scheduler';
import { DeltaSet } from '@proc7ts/delta-set';
import {
  afterEach,
  AfterEvent,
  AfterEvent__symbol,
  afterEventBy,
  afterSupplied,
  digAfter_,
  EventKeeper,
  EventNotifier,
  isEventKeeper,
  mapAfter,
  mapAfter_,
  shareAfter,
  supplyAfter,
  trackValue,
} from '@proc7ts/fun-events';
import { noop, Supply } from '@proc7ts/primitives';
import { filterIt, itsEach, ObjectEntry, overEntries } from '@proc7ts/push-iterator';
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
   * An `AfterEvent` keeper of CSS classes to be applied to styled element.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[InCssClasses.Map]>;

  /**
   * An `AfterEvent` keeper of added and removed CSS classes.
   *
   * Sends current CSS classes as added ones on receiver registration.
   */
  abstract readonly track: AfterEvent<[readonly string[], readonly string[]]>;

  [AfterEvent__symbol](): AfterEvent<[InCssClasses.Map]> {
    return this.read;
  }

  /**
   * Appends CSS classes from the given `source` to styled element.
   *
   * @param source - A source of CSS class names.
   *
   * @returns CSS class names supply. Removes `source` CSS classes from styled element once cut off.
   */
  abstract add(source: InCssClasses.Source): Supply;

  /**
   * Converts arbitrary CSS classes source to their {@link InCssClasses.Spec specifiers}.
   *
   * @param source - A source of CSS classes names.
   *
   * @returns An `AfterEvent` keeper of CSS class name specifiers.
   */
  abstract specs(source: InCssClasses.Source): AfterEvent<InCssClasses.Spec[]>;

  /**
   * Resolves arbitrary CSS classes source to {@link InCssClasses.Map map of class names}.
   *
   * @param source - A source of CSS classes names.
   *
   * @returns An `AfterEvent` keeper of CSS class names map.
   */
  abstract resolve(source: InCssClasses.Source): AfterEvent<[InCssClasses.Map]>;

  /**
   * Applies CSS classes to the given styled element.
   *
   * @param element - Target element to apply CSS classes to.
   * @param schedule - DOM render schedule to add CSS class updates to. A new schedule is constructed by
   * {@link InRenderScheduler input render scheduler} by default.
   *
   * @returns CSS classes supply that stops their application and removes already applied ones once cut off.
   */
  abstract applyTo(element: InStyledElement, schedule?: RenderSchedule): Supply;

  /**
   * Removes all CSS class sources and stops applying CSS classes to styled elements.
   *
   * @param reason - An optional reason.
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
   * Qualified names are converted to simple ones by {@link InNamespaceAliaser} aspect.
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

  readonly read: AfterEvent<[InCssClasses.Map]>;
  readonly track: AfterEvent<[readonly string[], readonly string[]]>;
  private readonly _sources = trackValue<[Map<AfterEvent<[InCssClasses.Map]>, Supply>]>([new Map()]);
  private _schedule?: RenderSchedule;

  constructor(private readonly _control: InControl<any>) {
    super();

    _control.supply.whenOff(reason => this.done(reason));

    this.read = this._sources.read.do(
        supplyAfter(this._control),
        digAfter_(([sources]) => afterEach(...sources.keys())),
        mapAfter_((...classes: [InCssClasses.Map][]) => {

          const result: { [name: string]: boolean } = {};

          classes.forEach(([map]) => mergeInCssClassesMap(map, result));

          return result;
        }),
    );

    this.track = afterEventBy<[readonly string[], readonly string[]]>(receiver => {
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

  specs(source: InCssClasses.Source): AfterEvent<InCssClasses.Spec[]> {
    return afterSupplied(isEventKeeper(source) ? source : source(this._control));
  }

  resolve(source: InCssClasses.Source): AfterEvent<[InCssClasses.Map]> {

    const nsAlias = this._control.aspect(InNamespaceAliaser);

    return this.specs(source).do(
        mapAfter((...names) => {

          const result: { [name: string]: boolean } = {};

          names.forEach(name => {
            if (isQualifiedName(name)) {
              result[css__naming.name(name, nsAlias)] = true;
            } else {
              mergeInCssClassesMap(name, result);
            }
          });

          return result;
        }),
    );
  }

  add(source: InCssClasses.Source): Supply {

    const inSupply = this._control.supply;

    if (inSupply.isOff) {
      return inSupply;
    }

    const classesSupply = new Supply();
    const src = afterEventBy<[InCssClasses.Map]>(receiver => {

      const supply = this.resolve(source)({
        receive(context, ...event) {
          receiver.receive(context, ...event);
        },
      });

      receiver.supply.whenOff(reason => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        classesSupply.off({ [UnsubscribeReason__symbol]: reason });
      });
      classesSupply.needs(supply).whenOff(reason => {
        if (isUnsubscribeReason(reason)) {
          supply.off(reason[UnsubscribeReason__symbol]);
        }
      });
    }).do(shareAfter);

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
  ): Supply {

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
    this._sources.supply.off(reason);
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
