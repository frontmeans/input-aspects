HTML Input Aspects
==================

[![NPM][npm-image]][npm-url]
[![Build Status][build-status-img]][build-status-link]
[![codecov][codecov-image]][codecov-url]
[![GitHub Project][github-image]][github-url]
[![API Documentation][api-docs-image]][api-docs-url]

Framework-agnostic library controlling various aspects of user input. Such as value conversion, form validation, etc.

[npm-image]: https://img.shields.io/npm/v/@proc7ts/input-aspects.svg?logo=npm
[npm-url]: https://www.npmjs.com/package/@proc7ts/input-aspects
[build-status-img]: https://github.com/proc7ts/input-aspects/workflows/Build/badge.svg
[build-status-link]: https://github.com/proc7ts/input-aspects/actions?query=workflow%3ABuild
[codecov-image]: https://codecov.io/gh/proc7ts/input-aspects/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/proc7ts/input-aspects
[github-image]: https://img.shields.io/static/v1?logo=github&label=GitHub&message=project&color=informational
[github-url]: https://github.com/proc7ts/input-aspects
[api-docs-image]: https://img.shields.io/static/v1?logo=typescript&label=API&message=docs&color=informational
[api-docs-url]: https://proc7ts.github.io/input-aspects/


Example
-------

```typescript
import { DomEventDispatcher } from '@proc7ts/fun-events';
import {
  inCssInfo
  intoTrimmed,
  inGroup,
  inText,
  InCssClasses,
  InSubmit,
  InSubmitError,
  InValidation,
  requirePresent,
} from 'input-aspects';

interface Saluted {
  name: string;
  salutation: string;
}

// Create controls for input elements
const name = inText(document.getElementById('name')!)
  .convert(intoTrimmed) // Remove whitespace
  .setup(InValidation, validation => {
    validation.by(requirePresent); // Require `name` to present      
  })
  .setup(InCssClasses, classes => classes.add(inCssInfo())); // Add validation status CSS classes
const salutation = inText(document.getElementById('salutation')!)
  .setup(InValidation, validation => {
    validation.by(requirePresent); // Require `salutation` to present   
  })
  .setup(InCssClasses, classes => classes.add(inCssInfo())); // Add validation status CSS classes

const form = document.getElementById('form')!;

// Create control group
const group = inGroup<Saluted>({
  // Group value is initially empty
  name: '',
  salutation: '',
}).setup(control => {
  control.set({ name, salutation }); // Add controls to group
}).setup(InSubmit, submit => {
  
  const button = document.getElementById('submit-button')!;
  
  submit.read(flags => {
    // Disable submit button when input is invalid or submit is in process.
    button.disabled = flags.ready && !flags.busy;  
  });
  
  // Submit the form programmatically
  new DomEventDispatcher(form).on('submit').instead(async () => {
      
    const responseText = await submit.submit(async (data) => {
  
      const response = await fetch(
          '/greet',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),    
          });
      
      if (!response.ok) {
        // Submit failed - report errors
        throw new InSubmitError({ submit: 'Failed' });
      } 
      
      // Submit succeed
      return response.text();
    });
    
    document.getElementById('response-text')!.innerText = responseText;  
  });
});
```

Input Control
-------------

First, an input control should be created for input element.

Input controls implementations extend `InControl` class that, in turn, extends `ValueTracker` class.

Each control has a value. It can be accessed or updated by `InControl.it` property. Input control sends an event when
the value change.

There are several input control implementations available. They can be used for different input elements.


### `<input>`, `<select>`, `<textarea>`  

Textual input control is created by `inText()` function.

The value of this control is a `string`.


### `<select multiple>`

Multi-select input control is created by `inSelect()` function.

The value of this control is an array of `string`s.


### `<input type="checkbox">`

Checkbox input control is created by `inCheckbox()` function.

The value of this control is three-state, corresponding to checked, unchecked, and intermediate values.

By default these are `true`, `false` and `undefined`. But can be configured to be arbitrary values by specifying
options:
```typescript
import { inCheckbox } from '@proc7ts/input-aspects';

inCheckbox(checkboxElement, {
  checked: 'on',     // The value is `on` when checked
  unchecked: 'off',  // The value is `off` when unchecked
  intermediate: '?',  // The value is `?` when intermediate
});
```


### `<input type="radio">`

Radio button control is created by `inRadio()` function.

By default the value of this control is `true` when the radio button is checked. This can be configured though.
The value of this control when the radio button is unchecked is always `undefined`.

```typescript
import { inRadio } from '@proc7ts/input-aspects';

inRadio(radioElement, {
  checked: 'on',     // The value is `on` when checked
});
```

It is convenient to group the radio buttons into a radio group, that can be created using `inRadioGroup()` function:

```typescript
import { inRadio, inRadioGroup } from '@proc7ts/input-aspects';

inRadioGroup({
  // Add radio buttons under unique keys
  first: inRadio(firstRadioElement),
  second: inRadio(secondRadioElement),
  third: inRadio(thirdRadioElement),
});
```

The value of radio group control is a string key corresponding to checked radio button. Or `undefined` when none
is checked.


### Arbitrary Value Control

Is created by `inValue()` function.

This control is not associated with any input element. Its value is expected to be set programmatically. 


Container
---------

An input container is an input control containing other controls.

The value of such container is formed by the ones of nested controls. An update to container value updates the ones of
nested controls.

All containers extend `InContainer` class. A `controls` property of container grants access to nested controls.

The are two input containers implemented.


### `InGroup`

A group of input controls is created by `inGroup()` function. 

Nested controls are identified by keys and can be added and removed via `controls` property.

Group value (called model) is an object formed by nested control values. The model property value is the one of the
control with the same key, if present. When model is updated corresponding controls are also updated.

A group model type is passed as a generic type parameter to `inGroup()` function.


### `InList`

An indexed list of input controls is created by `inList()` function.

Nested controls can be added and removed via `controls` property.

List value (called model) is an array object formed by nested control values. The item property value is the one
of the control with the same index, if present. When model is updated corresponding controls are also updated.

A model item type type is passed as a generic type parameter to `inList()` function.


Input Conversion
----------------

An input control can be converted. E.g. to the one with another value type.

This can be done by `InControl.convert()` method that accepts a converter as parameter and returns converted input
control.

When original control is updated, the converted one is automatically updated with converted value.
When converted control is updated, the original one is automatically updated with the value restored from converted one.

There are several converters implemented:
- `intoFallback()` converts an input control to the one replacing `undefined` value with fallback one.
- `intoInteger()` converts string values to integer ones.
- `intoTrimmed()` trims input value.
- `intoParsedBy()` parses and formats input text with the given functions.

Simple conversions can be implemented like this:
```typescript
control.convert(
  text => text.length,        // Convert a `text` to its length
  stars => '*'.repeat(stars), // Restore the text as several `stars`
);
```

Input Aspect
------------

Once control created, input aspects can be attached to it with `InControl.aspect()` method accepting an aspect key
and returning the attached aspect. An aspect is attached only once and returned on subsequent `InControl.aspect()`
calls.

An input aspect is an arbitrary value. There are several input aspects implemented for various control use cases:

- `InElement` HTML input element control available as an aspect of itself and, possibly, of converted controls.
  Or `null` if not available.

- `InContainer` Input controls container available as an aspect of itself and, possibly, of converted controls.
  Or `null` if not available. 

- `InParents` Parents of input control.

  Reflects all containers the control belongs to. Note that component may belong to multiple containers. Or even
  to the same container multiple times.

- `InFocus` Input focus aspect.

   This is a value tracker of element focus flag.  Or `null` when `InElement` aspect is absent.

- `InStatus` Aggregate status aspect of user input.
   
  Collects and reports input status flags. Like whether the input ever had focus or being altered.
   
  Supports input elements and containers. For the rest of input controls always sends default status flags.

- `InMode` Input mode aspect of control.
  Control can be either enabled, disabled, or readonly.
   
  Each control maintains its own state, while nested controls respect container ones. I.e. when container is disabled
  all nested ones are also disabled. When container is readonly, all nested ones are also readonly, unless explicitly
  disabled.
   
  When applied to input element this aspect maintains its `disabled` and `readonly` attributes (not properties!).

- `InData` A data aspect of the input.
  
  Represents input control data that will be submitted.
  
  Input data is typically the same as control value with respect to input mode. I.e. when input mode is `off` the
  data is `undefined`.

- `InStyledElement` An input aspect representing HTML element to apply styles to.

  This is a HTML element for input element control, and `null` for everything else by default.
  
  An `InStyledElement.to()` converter can be used to convert arbitrary control to the one with the given styled element.
  This is useful for controls without elements (such as input groups), or can be used to apply CSS classes to input
  element wrappers (such as `form-group` in Bootstrap).

- `InCssClasses` An aspect of the user input representing CSS classes to apply to styled element.

  - `inCssInfo()` creates a source of informative CSS classes.
  - `inCssError()` creates a source marker CSS classes applied when particular validation error occur.
      
- `InNamespaceAliaser` Namespace aliaser aspect.

  Used by other aspect to generate unique names.
  
  An `InNamespaceAliaser.to()` converter can be used to convert arbitrary control to the one with the given aliaser.

- `InRenderScheduler` Input elements render scheduler.

  It is used e.g. to schedule CSS updates. The control values and attributes are updated instantly.
  
  An `InRenderScheduler.to()` converter can be used to convert arbitrary control to the one with the given scheduler.

- `InValidation` Validation aspect of the input.

  Reports validation messages sent by registered validators. 


Input Validation
----------------

Input validation is performed by validators added to `InValidation` aspect.

A validation aspect of converted control reports all messages from original control in addition to its own.

A validation aspect of input controls container reports all messages from nested controls in addition to its own.

Validator can be added to input validation aspect using `InValidation.by()` method. After that all validation
messages it sends are reported by validation aspect. Multiple messages could be sent at a time. These messages
replace the previously sent ones. To report the absence of error just send an empty event without messages.

This can be one either a validation messages event keeper, a function returning one and accepting input control
as its only parameter, or simple validator instance.

Validators report validation errors as messages. Each validation message is a map of key/value pairs, where the key
is a message code, while the value is arbitrary.

Validation result is reported as `InValidation.Result` instance, that has methods to request all reported messages,
or just messages with the given message code. 

There are several validators implemented:
- `requireAll()` validates using all listed validators.
- `requireLength()` applies requirements on input text length.
- `requireNeeded()` filters validation messages from the given `validators` according to their codes.
- `requireNothing()` requires nothing.
- `requirePresent()` requires value to present.
- `requireRange()` applies requirements to numeric value range.

Simple validator can be applied like this:
```typescript
import { InValidation } from '@proc7ts/input-aspects';

control.aspect(InValidation).by({
  validate({it}: InControl<PasswordAndConfirmation>) {
    if (it.password !== it.confirmation) {
      // Return error message(s) on validation error
      return { invalid: 'Password and confirmation do not match' };    
    }
    // Return nothing (or `null`, or empty array, or empty message) on validation success
    return;  
  }
});
```   
