import { InAspect, InAspect__symbol } from './aspect';
import { InControl } from './control';
import { InConverter, intoConvertedBy } from './converter';

/**
 * @internal
 */
export const InBuilder$Impl__symbol = (/*#__PURE__*/ Symbol('InBuilder.impl'));

/**
 * @internal
 */
export class InBuilder$Impl<TControl extends InControl<TValue>, TValue> {

  private readonly _aspectsByKey = new Map<InAspect<any, any>, InConverter.Aspect.Factory<TValue>>();
  private _commonAspects: InConverter.Aspect.Factory<TValue> | undefined = undefined;

  private readonly _setupAspect = new Map<
      InAspect<any, any>,
      (aspect: InAspect.Application.Instance<any, TValue, any>, control: TControl) => void>();

  private _setup: ((control: TControl) => void) | undefined = undefined;

  constructor(readonly _factory: InControl.Factory<TControl, TValue>) {
  }

  addAspect(aspect: InAspect<any, any>, converter: InConverter.Aspect<TValue>): void {

    const prev = this._aspectsByKey.get(aspect);

    this._aspectsByKey.set(aspect, prev ? intoConvertedBy(prev, converter) : intoConvertedBy(converter));
  }

  addAspects(aspects: readonly InConverter.Aspect<TValue>[]): void {
    this._commonAspects = this._commonAspects
        ? intoConvertedBy(this._commonAspects, ...aspects)
        : intoConvertedBy(...aspects);
  }

  setupAspect<TInstance, TKind extends InAspect.Application.Kind>(
      aspect: InAspect<TInstance, TKind>,
      setup: (aspect: InAspect.Application.Instance<TInstance, TValue, TKind>, control: TControl) => void,
  ): void {

    const prev: ((
        aspect: InAspect.Application.Instance<TInstance, TValue, TKind>,
        control: TControl,
    ) => void) | undefined = this._setupAspect.get(aspect);

    this._setupAspect.set(
        aspect,
        prev
            ? (aspect, control): void => {
              prev(aspect, control);
              setup(aspect, control);
            }
            : setup,
    );
  }

  setup(setup: (control: TControl) => void): void {

    const prev = this._setup;

    if (prev) {
      this._setup = control => {
        prev(control);
        setup(control);
      };
    } else {
      this._setup = setup;
    }
  }

  build(): TControl {

    const control = this._factory({ aspects: this._aspects() });

    // Per-aspect setup
    for (const [aspect, setup] of this._setupAspect) {
      control.setup({ [InAspect__symbol]: aspect }, setup);
    }

    // Control setup
    if (this._setup) {
      control.setup(this._setup);
    }

    return control;
  }

  private _aspects(): InConverter.Aspect<TValue> | undefined {
    if (this._aspectsByKey.size) {

      const byKey = intoConvertedByKey(this._aspectsByKey);

      return this._commonAspects ? intoConvertedBy(byKey, this._commonAspects) : byKey;
    }

    return this._commonAspects;
  }

}

function intoConvertedByKey<TValue>(
    byKey: Map<InAspect<any, any>, InConverter.Aspect.Factory<TValue>>,
): InConverter.Aspect.Factory<TValue> {
  return (from, to) => ({
    applyAspect<TInstance, TKind extends InAspect.Application.Kind>(
        aspect: InAspect<any, any>,
    ): InAspect.Application.Result<TInstance, TValue, TKind> | undefined {

      const converter = byKey.get(aspect);

      return converter && converter(from, to).applyAspect(aspect);
    },
  });
}
