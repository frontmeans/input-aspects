import { asis, nextArgs, valuesProvider } from 'call-thru';
import {
  AfterEvent__symbol,
  afterSupplied,
  EventEmitter,
  EventKeeper,
  EventSupply,
  onSupplied,
  trackValue,
} from 'fun-events';
import { inGroup, InGroup } from '../container';
import { InControl } from '../control';
import { inValue } from '../value';
import { InValidation } from './validation.aspect';
import { InValidator } from './validator';
import Mock = jest.Mock;

describe('InValidation', () => {

  let control: InControl<string>;
  let validation: InValidation<string>;

  beforeEach(() => {
    control = inValue('test');
    validation = control.aspect(InValidation);
  });

  let validator: EventEmitter<InValidation.Message[]>;
  let validatorSupply: EventSupply;

  beforeEach(() => {
    validator = new EventEmitter();

    const tracker = trackValue<InValidation.Message[]>([])
        .by(onSupplied(validator).thru_((...messages) => messages));

    validatorSupply = validation.by(tracker.read.keep.thru_(messages => nextArgs(...messages)));
  });

  let receiver: Mock<void, [InValidation.Result]>;
  let resultSupply: EventSupply;

  beforeEach(() => {
    receiver = jest.fn();
    resultSupply = validation.read(receiver);
  });

  it('sends successful validation result initially', () => {

    const result = lastResult();

    expect(result.ok).toBe(true);
    expect(result.has()).toBe(false);
    expect(result.messages()).toHaveLength(0);
    expect([...result]).toHaveLength(0);
  });
  it('sends validation message', () => {

    const message = { message: 'some message' };

    validator.send(message);

    const result = lastResult();

    expect(result.ok).toBe(false);
    expect(result.has()).toBe(true);
    expect(result.messages()).toEqual([message]);
    expect([...result]).toEqual([message]);
    expect(result.has('message')).toBe(true);
    expect(result.messages('message')).toEqual([message]);
    expect(result.has('other')).toBe(false);
    expect(result.messages('other')).toHaveLength(0);
  });
  it('sends multiple validation messages', () => {

    const message1 = { message: 'message1', code1: 'value2' };
    const message2 = { message: 'message2', code2: 'value2' };

    validator.send(message1, message2);

    const result = lastResult();

    expect(result.ok).toBe(false);
    expect(result.has()).toBe(true);
    expect(result.messages()).toEqual([message1, message2]);
    expect([...result]).toEqual([message1, message2]);
    expect(result.has('message')).toBe(true);
    expect(result.messages('message')).toEqual([message1, message2]);
    expect(result.has('other')).toBe(false);
    expect(result.messages('other')).toHaveLength(0);
    expect(result.has('code1')).toBe(true);
    expect(result.messages('code1')).toEqual([message1]);
    expect(result.has('code2')).toBe(true);
    expect(result.messages('code2')).toEqual([message2]);
  });
  it('ignores falsy message code', () => {

    const message1 = { message: 'message1', code1: 'value2' };
    const message2 = { message: '', code2: 'value2' };

    validator.send(message1, message2);

    const result = lastResult();

    expect(result.ok).toBe(false);
    expect(result.has()).toBe(true);
    expect(result.messages()).toEqual([message1, message2]);
    expect([...result]).toEqual([message1, message2]);
    expect(result.has('message')).toBe(true);
    expect(result.messages('message')).toEqual([message1]);
    expect(result.has('code1')).toBe(true);
    expect(result.messages('code1')).toEqual([message1]);
    expect(result.has('code2')).toBe(true);
    expect(result.messages('code2')).toEqual([message2]);
  });
  it('strips out empty message', () => {

    const message1 = { message: 'message1', code1: 'value1' };
    const message2 = { message: false, code2: false };

    validator.send(message1, message2);

    const result = lastResult();

    expect(result.ok).toBe(false);
    expect(result.has()).toBe(true);
    expect(result.messages()).toEqual([message1]);
    expect([...result]).toEqual([message1]);
    expect(result.has('message')).toBe(true);
    expect(result.messages('message')).toEqual([message1]);
    expect(result.has('code1')).toBe(true);
    expect(result.messages('code1')).toEqual([message1]);
    expect(result.has('code2')).toBe(false);
    expect(result.messages('code2')).toHaveLength(0);
  });
  it('removes messages and sends validation result when validator removed', () => {
    validator.send({ message: 'some message' });
    validatorSupply.off();
    expect(lastResult().ok).toBe(true);
  });
  it('does not sent validation result when validator removed without messages sent', () => {
    receiver.mockClear();
    validatorSupply.off();
    expect(receiver).not.toHaveBeenCalled();
  });
  it('ignores empty messages if there are no messages yet', () => {
    receiver.mockClear();
    validator.send();
    expect(receiver).not.toHaveBeenCalled();
  });
  it('removes messages and sends validation result when empty messages sent after non-empty ones', () => {
    validator.send({ message: 'some message' });
    validator.send();
    expect(lastResult().ok).toBe(true);
  });
  it('ignores empty messages if there are no messages yet', () => {
    validator.send({ message: 'some message' });
    validator.send();
    receiver.mockClear();
    validator.send();
    expect(receiver).not.toHaveBeenCalled();
  });
  it('accepts function as validator', () => {

    const message = { message: 'test message' };
    const tracker = trackValue(message);
    const validatorFunction = jest.fn<EventKeeper<InValidation.Message[]>, [InControl<string>]>(() => tracker.read);

    validation.by(validatorFunction);
    expect(validatorFunction).toHaveBeenCalledWith(control);
    expect([...lastResult()]).toEqual([message]);
  });

  describe('Simple validator', () => {

    let validate: Mock<ReturnType<InValidator.Simple<any>['validate']>, [InControl<string>]>;

    beforeEach(() => {
      validate = jest.fn();
    });

    it('reports message', () => {
      validate.mockImplementation(ctr => ({ value: ctr.it }));

      validation.by({ validate });
      expect(validate).toHaveBeenCalledWith(control);
      expect([...lastResult()]).toEqual([{ value: 'test' }]);

      control.it = 'other';
      expect([...lastResult()]).toEqual([{ value: 'other' }]);
    });
    it('reports multiple messages', () => {

      const messages = [{ message: 1 }, { message: 2 }];

      validate.mockImplementation(() => messages);

      validation.by({ validate });
      expect([...lastResult()]).toEqual(messages);
    });
    it('reports no messages', () => {
      validate.mockImplementation(ctr => ({ value: ctr.it }));

      validation.by({ validate });
      expect([...lastResult()]).toEqual([{ value: 'test' }]);

      validate.mockImplementation(() => null);
      control.it = 'other';
      expect(lastResult().ok).toBe(true);
    });
  });

  it('accepts messages from multiple validators', () => {

    const message1 = { message: 'message1' };
    const validator2 = trackValue(message1);

    validation.by(validator2);
    expect([...lastResult()]).toEqual([message1]);

    const message2 = { message: 'message2' };

    validator.send(message2);
    expect([...lastResult()]).toEqual([message1, message2]);

    const message3 = { message: 'message3' };

    validator2.it = message3;
    expect([...lastResult()]).toEqual([message3, message2]);

    validatorSupply.off();
    expect([...lastResult()]).toEqual([message3]);
  });
  it('stops validation when supply is cut off', () => {

    const validator2 = new EventEmitter<InValidation.Message[]>();
    const proxy = jest.fn(asis);
    const supply = validation.by(afterSupplied<InValidation.Message[]>(validator2.on.thru(proxy), valuesProvider()));
    const message1 = { message: 'message1' };

    validator2.send(message1);

    expect(proxy).toHaveBeenCalledWith(message1);
    expect([...lastResult()]).toEqual([message1]);

    receiver.mockClear();
    proxy.mockClear();

    const done = jest.fn();

    supply.whenOff(done);
    resultSupply.off('reason');
    expect(done).not.toHaveBeenCalled();

    const message2 = { message: 'message2' };

    validator2.send(message2);
    expect(proxy).not.toHaveBeenCalled();
    expect(receiver).not.toHaveBeenCalled();
  });
  it('resumes validation when results receiver registered again', () => {

    const message1 = { message: 'message1' };

    validator.send(message1);
    resultSupply.off();
    validation.read(receiver);

    expect([...lastResult()]).toEqual([message1]);

    const message2 = { message: 'message2' };

    validator.send(message2);
    expect([...lastResult()]).toEqual([message2]);
  });

  describe('AfterEvent__symbol', () => {
    it('is an alias of `read`', () => {
      expect(validation[AfterEvent__symbol]).toBe(validation.read);
    });
  });

  describe('conversion', () => {

    let convertedControl: InControl<number>;
    let convertedValidation: InValidation<number>;

    beforeEach(() => {
      convertedControl = control.convert(value => value.length, value => '*'.repeat(value));
      convertedValidation = convertedControl.aspect(InValidation);
    });

    let convertedValidator: EventEmitter<InValidation.Message[]>;

    beforeEach(() => {
      convertedValidator = new EventEmitter();
      convertedValidation.by(afterSupplied(convertedValidator, valuesProvider()));
    });

    let convertedReceiver: Mock<void, [InValidation.Result]>;

    beforeEach(() => {
      convertedReceiver = jest.fn();
      convertedValidation.read(convertedReceiver);
    });

    it('receives validation messages from original control', () => {

      const message = { name: 'message' };

      validator.send(message);

      expect([...lastResult(convertedReceiver)]).toEqual([message]);
    });
    it('receives validation messages from converted control', () => {

      const message1 = { name: 'message1' };
      const message2 = { name: 'message2' };

      validator.send(message1);
      convertedValidator.send(message2);

      expect([...lastResult(convertedReceiver)]).toEqual([message1, message2]);
      expect([...lastResult()]).toEqual([message1]);
    });

    describe('double converted', () => {
      it('receives validation messages from both origins', () => {

        const dcValidation = convertedControl.convert(asis, asis).aspect(InValidation);
        const dcReceiver = jest.fn();

        dcValidation.read(dcReceiver);

        const message1 = { name: 'message1' };
        const message2 = { name: 'message2' };

        validator.send(message1);
        convertedValidator.send(message2);

        expect([...lastResult(dcReceiver)]).toEqual([message1, message2]);
      });
    });
  });

  describe('container validation', () => {

    let group: InGroup<{ ctrl: string }>;
    let groupValidation: InValidation<{ ctrl: string }>;

    beforeEach(() => {
      group = inGroup({ ctrl: '' });
      group.controls.set('ctrl', control);
      groupValidation = group.aspect(InValidation);
    });

    let groupReceiver: Mock<void, [InValidation.Result]>;

    beforeEach(() => {
      groupReceiver = jest.fn();
      groupValidation.read(groupReceiver);
    });

    it('sends nested validation result', () => {

      const message = { message: 'some message' };

      validator.send(message);

      const result = lastResult(groupReceiver);

      expect([...result]).toEqual([message]);
    });
  });

  function lastResult(rcv = receiver): InValidation.Result {
    expect(rcv).toHaveBeenCalled();

    const calls = rcv.mock.calls;

    return calls[calls.length - 1][0];
  }
});
