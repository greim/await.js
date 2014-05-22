# await.js

await.js is a lightweight, dependency-free promises library that makes both serial and parallel logic easy by thinking in terms of *sets*.
You await() a set of things, and once you have all the things, you do stuff.
await.js conforms to the [Promises/A+](http://promisesaplus.com/) spec.

## Example

```javascript
// await this set of things
var getThings = await('me','feed','ready')

// fulfill 'me'
$.ajax('/api/users/me', {
  success: function(data){ getThings.keep('me', data) },
  error: function(err) { getThings.fail(err) }
})

// fulfill 'feed'
$.ajax('/api/users/me/feed', {
  success: function(data){ getThings.keep('feed', data) },
  error: function(err) { getThings.fail(err) }
})

// fulfill 'ready'
$(document).ready(function(){
  getThings.keep('ready');
})

// do stuff with the things
getThings.then(function(got){
  // now you got stuff
  got.me // json object
  got.feed // json object
  got.ready // null; dom has loaded
},function(err){
  // oops, there was an error
});
```

## Installation and use

Node.js:

```
%> npm install await
%> node
node> var await = require('await')
```

Browsers:

```html
<script src="path/to/await.js"></script>
<script>
// window.await is defined
</script>
```

Browsers (AMD/RequireJS):

```javascript
// window.await is NOT defined
define(['await'], function(await){
  ...
})
```

## Old browser note

You'll need some polyfill or Modernizr goodness to use it in browsers that don't support JavaScript 1.8.5. (e.g. IE8 and lower). To that end, example-polyfills.js is included in the git repo. The polyfills file has no test coverage, and is otherwise purely optional.

## How does it work?

An await promise represents a set of empty slots that need to be filled.
A promise can be in one of three states: *unresolved*, *kept* or *failed*.
Sometimes it's useful to think in terms of it being *unresolved* or *resolved*, where *resolved* means *either kept or failed*.

A promise starts out in an unresolved state.
As soon as each individual slot has been filled, the promise enters the kept state.
It doesn't matter how long it takes or in what order they're filled, or whether it's done serially or in parallel.

If something goes wrong during fulfillment, the promise enters the failed state.
The promise can't enter the failed state if it has already entered the kept state, or vice versa.
Once in either a kept or failed state, a promise will never switch to any other state.

## Creating promises

You create a promise by calling the `await()` function and passing a series of strings; one for each slot you expect to be filled.

```javascript
var prom = await('foo','bar','baz')
```

## Using promises

You use promises in two ways: the event handlers or the `then()` method.

### The event handlers

An await promise has `onkeep()`, `onresolve()` and `onfail()` methods that accept callbacks.
These methods can be called any number of times, at any time, in any order.

These methods can be called whether the promise is resolved or unresolved.
If called before resolve, callbacks are stored for later execution.
If called after resolve, callbacks are executed immediately.

An important aspect of promises is that, whether or not a promise is resolved, your callback is always executed *after* the method returns.
This means that the semantics of your program don't change based on the state of a promise at any given moment.
That is, your code is effectively decoupled from the state of a promise, and you can always rely on it being an asynchronous operation.

```javascript
promise.onkeep(function(got){
  got.slotA
  got.slotB
  //...
})

promise.onfail(function(err){
  // handle error case
})

promise.onresolve(function(){
  // promise is now either in
  // a kept or failed state
})
```

Since these methods are chainable, the above could also be written as:

```javascript
promise.onkeep(function(got){
  //...
}).onfail(function(err){
  //...
}).onresolve(function(){
  //...
})
```

#### Progress

There is also an `onprogress()` method which behaves differently from the above event handlers.
`onprogress()` callbacks that are added before the promise is resolved are stored and executed any number of times (including zero) during progress events.
Progress callbacks that are added after the promise is resolved are silently ignored.
Progress callbacks are only called while the promise is unresolved.
Progress callbacks are passed an object containing the current progress of each slot.
This object also has a `getAverage()` method that returns a number for reporting the overall progress of the promise.
This allows you to implement either a multi-progress bar, or a single progress bar.
All progress values are numbers between 0.0 and 1.0.

```javascript
promise.onprogress(function(prog){
  progress.slotA // number between 0.0 and 1.0
  progress.slotB // number between 0.0 and 1.0
  // etc
})
```

### The `then(onkeep, onfail, onprogress)` method

The `then()` method conforms to the signature and behavioral contract outlined in the [Promises/A+ spec](http://promisesaplus.com/).
Unlike the event handlers above, which are purely consumer methods, `then()` is both consumer and provider.
That is, it returns a *new* promise pending on the value that will eventually be returned by its callback.

```javascript
promise.then(function(got){
  got.slotA // etc, same as above
  // the value returned here fulfills
  // the promise returned by then()
}, function(err){
  // handle error case
  // the value returned here fulfills
  // the promise returned by then()
  // same as above
}, function(amount){
  // there has been progress indicated
  // by "amount". note that "amount" in
  // this case is an average across all
  // slots of this promise
})
```

Others have written good explanations on how to use "thenables", as they have come to be called:

 * http://blog.parse.com/2013/01/29/whats-so-great-about-javascript-promises/
 * https://gist.github.com/domenic/3889970
 * http://howtonode.org/promises
 * http://promisesaplus.com/

#### Accumulating values over serial `then()`s

It's common to chain thenables for serial operations in order to have sane error handling and code flow.
However, since thenables only keep a single value, it's difficult to accumulate values obtained this way without nesting the calls.
This is unfortunate since "nested callback hell" is something thenables were supposed to help you avoid.

Since await deals in sets rather than single values, it accumulates values for you, so that you don't have to nest the calls if you don't want.
For example:

```javascript
function getUser() {
  return await('user')...
}
function getFeed() {
  return await('feed')...
}
function getFollowers() {
  return await('followers')...
}

getUser()
.then(function(){
  return getFeed()
})
.then(function(){
  return getFollowers()
})
.then(function(got){
  // do stuff with got.user
  // do stuff with got.feed
  // do stuff with got.followers
})
```

If there are name collisions, await will prefer recent values over older ones.
To avoid collisions, you can use await's `map()` method, which is documented in more detail later one.
Example:

```javascript
function getFeed(name) { return await('feed')... }

getFeed('fez').map({'feed':'fez'})
.then(function(){
  return getFeed('bob').map({'feed':'bob'})
})
.then(function(){
  return getFeed('ned').map({'feed':'ned'})
})
.then(function(got){
  // got.fez
  // got.bob
  // got.ned
})
```

## Keeping promises (or failing)

### `promise.keep(name, [value])`

Each slot of a promise is fulfilled using the `keep()` method.
`keep()` must be called once for each slot.
Only the first call to `keep()` for a given slot has any effect on the state of the promise.
Subsequent calls are ignored.
If no `value` is given, it defaults to `null`.

```javascript
var prom = await('number','foo')
prom.keep('number', 7)
prom.keep('foo')
// prom is now in a kept state
prom.onkeep(function(got){
  got.number // 7
  got.foo    // null
})
```

### `promise.fail(error)`

At any time, you can call `fail()` on a promise, passing an error object representing the failure.
If the promise is already in a kept or failed state, calls to `fail()` are silently ignored, and have no effect on the state of the promise.
If none or only some slots have been filled, `fail()` will permanently push the promise into the failed state.

```javascript
var prom = await('foo')
prom.fail(new Error('Fake error!'))
// prom is now in a failed state
prom.onfail(function(err){
  err.message // 'Fake error!'
})
```

### `promise.progress(name, amount)`

While the promise is unresolved, you can call this method any number of times to notify any listeners of progress.
Calling this method after the promise is resolved is a no-op.
`name` is a string naming the slot that has progressed.
`amount` is a number between 0.0 and 1.0.
Await does not enforce progressively higher amounts; it assumes you know what you're doing in this regard.
However, it will enforce that `amount` is a number between 0.0 and 1.0.
If `amount` is not a number and not parseable into a number, it will be treated as zero.

`progress()` also accepts an object instead of a string and a number.
This allows multiple progress values to be reported at once.

```javascript
// fires two events
promise.progress('foo', .6)
promise.progress('bar', .4)

// fires one event
promise.progress({ foo: .6, bar: .4 })
```

## Grouping promises

`await()` accepts other promises in addition to strings.
In such cases, the newly-created promise is the *union* of all grouped promises and string arguments.

```javascript
p1 = await('foo', 'bar')
p2 = await('baz')
p3 = await(p1, p2, 'qux')

p3.onkeep(function(got){
  // do something with got.foo
  // do something with got.bar
  // do something with got.baz
  // do something with got.qux
})
```

`promise.map()` returns a new promise with differently-named slots, and can be used to step around name collisions.

```javascript
p1 = await('model')
p2 = await('model')
p3 = await(
  p1.map({'model':'m1'}),
  p2.map({'model':'m2'})
)

p3.onkeep(function(got){
  // do something with got.m1
  // do something with got.m2
})
```

## `await.all(list)`

If you have an array of promises of arbitrary length, you can use `await.all()` to merge them into a single promise.

```javascript
// 'proms' is an array of await promises
// that have already been created

await.all(proms)
.onkeep(function(gots){

  // 'gots' is a list with a length
  gots.length // number
  gots[0]
  gots[1] (etc)

  // alternatively...
  gots.forEach(function(got){
    got.foo
    got.bar
    // ...
  })
})
```

Note that in the above example, `gots` is an object, not a true array, despite having `length`, `0`, `1` (etc) properties.
For example it doesn't have mutator methods like `push()` or `splice()`.
However for convenience, it does inherit several array-like accessor methods from its prototype:

 * forEach() - Similar to array.forEach()
 * map() - Similar to array.map()
 * some() - Similar to array.some()
 * every() - Similar to array.every()
 * reduce() - Similar to array.reduce()
 * slice() - Similar to array.slice()
 * join() - Similar to array.join()

## `take(promise, [mapping])`

(AKA chaining promises)

Promises can be explicitly chained instead of grouped.
Here we've declared two promises, and we want to take the outcome of one and plug it into the other:

```
p1 = await('foo', 'bar', 'baz')
p2 = await('foo', 'bar', 'buz', 'qux')

p1      p2 
===========
foo     foo
bar     bar
baz     buz
        qux
```

What happens is that p1 can *take* p2.

```
p1.take(p2)
```

p1 now takes p2, and if p2 fails, p1 fails.
As you can see, p2 is a different set of things than p1.
Here is how p2 maps to p1:

```
p1      p2 
===========
foo <-- foo
bar <-- bar
baz     buz
        qux
```

In other words, p1 only took the *intersection* of itself with p2.
Thus when p2 keeps, p1 remains unkept.
You can therefore optionally provide a mapping object:

```
p1.take(p2, {'buz':'baz'})

p1      p2 
===========
foo <-- foo
bar <-- bar
baz <-- buz
        qux
```

If the mapping you provide conflicts with direct matches, the mapping wins:

```javascript
p1.take(p2, {
  'buz':'baz',
  'qux':'bar'
})
```

```
p1      p2 
===========
foo <-- foo
bar <-- qux
baz <-- buz
        bar
```

You can also take non-await thenables, such as a Q promise or a jqXHR object, provided that you name the value:

```javascript
await('feed').take($.ajax('/api/feed'), 'feed')
```

This is easier than doing:

```javascript
var prom = await('feed')
$.ajax('/api/feed', {
  success: function(data){ prom.keep('feed', data) },
  error: function(err){ prom.fail(err) }
})
```

## Using `nodify()` in Node.js

Node.js callbacks have an error object in the first position.
If the operation was successful, this argument is null, otherwise it's an instance of Error.
Every node callback you write therefore needs an if/else statement in order to see if this argument is not empty, which can get tedious.
For example, to hook up an await promise to a node callback, you'd need to do this:

```javascript
var promise = await('logData')

fs.readFile('/tmp/log', function(err, data){
  if (err) {
    promise.fail(err);
  } else {
    promise.keep('logData', data);
  }
});
```

As a convenience, you can wrap the callback in `promise.nodify()`, and it will wire up the error handling automatically, shifting `err` off the signature for you:

```javascript
var promise = await('logData')

fs.readFile('/tmp/log', promise.nodify(function(data){
  promise.keep('logData', data);
}));
```

To save even more typing, if you simply want to keep the promise based on the success value, you can pass a string to `nodify()` instead of a function.
This example below behaves equivalent to the above:

```javascript
var promise = await('logData')

fs.readFile('/tmp/log', promise.nodify('logData'));
```

### Examples

#### Callback signature: (error, a, b, c)

```javascript
nodeApi.doSomething(promise.nodify('foo', 'bar'))
// 'foo' and 'bar' are kept with values a and b, respectively.
c is ignored
```
#### Callback signature: (error)

```javascript
nodeApi.doSomething(promise.nodify('foo', 'bar'))
// 'foo' and 'bar' are both kept with value null
```

#### Callback signature (error, a, b)

```javascript
nodeApi.doSomething(promise.nodify(null, 'foo'))
// 'foo' is kept with value b, a is ignored
```

## API overview

<table summary="overview of api">
  <thead>
    <tr>
      <th>method</th>
      <th>description</th>
      <th>returns</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">var promise =<br>await(item1, item2, ... itemN)</td>
      <td>Returns a promise, pending the fulfillment of the given set of things. The <code>new</code> keyword is not needed. Accepts one or more args which can be strings or other promises, which allows grouping. Order of arguments is unimportant.</td>
      <td>promise</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.run(callback[, context])</td>
      <td>Runs <code>callback</code> immediately (synchronously), which contains whatever promise fulfillment logic you want. <code>callback</code> is passed a reference to the promise. If defined and not null, <code>context</code> will be <code>this</code> in <code>callback</code>. Exceptions thrown by <code>callback</code> automatically fail the promise.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.onkeep(callback[, context])</td>
      <td>Calls <code>callback</code> when every item of the promise is fulfilled. If the promise is already fulfilled, <code>callback</code> runs immediately. <code>callback</code> is passed a map of all the things in the promise, keyed by the strings passed to <code>await()</code>. If defined and not null, <code>context</code> will be <code>this</code> in <code>callback</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.onfail(callback[, context])</td>
      <td>Calls <code>callback</code> when promise fails. If promise already failed, <code>callback</code> runs immediately. <code>callback</code> is passed the error object representing the reason for the failure, which was passed to <code>fail()</code> method triggering the failure. If defined and not null, <code>context</code> will be <code>this</code> in <code>callback</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.onresolve(callback[, context])</td>
      <td>Calls <code>callback</code> when promise either keeps or fails. If promise has already been kept or failed, <code>callback</code> runs immediately. If defined and not null, <code>context</code> will be <code>this</code> in <code>callback</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.onprogress(callback[, context])</td>
      <td>Calls <code>callback</code> whenever there is progress to report. <code>callback</code> is only called while promise is unresolved. <code>callback</code> may be called any number of times, or never called at all. If promise has already been kept or failed, <code>callback</code> is ignored and discarded. <code>callback</code> is passed an object keyed by names and valued by numbers between 0.0 and 1.0. If defined and not null, <code>context</code> will be <code>this</code> in <code>callback</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.then(onkeep, onfail, onprogress)</td>
      <td>Conforms to the signature and behavioral conventions outlined in the Promises/A+ spec.</td>
      <td>A new await.js promise</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.catch(onfail)</td>
      <td>Convenience method that behaves equivalent to <code>promise.then(null, onfail)</code>.</td>
      <td>A new await.js promise</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.keep(item[, data])</td>
      <td>Fulfills one of the things of this promise. <code>data</code> is optional and if not defined, defaults to <code>null</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.fail(reason)</td>
      <td>Fail the promise for the given <code>reason</code>. The first argument should be an error object.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.progress(name, amount)</td>
      <td>Notify any progress listeners of progress on item <code>name</code>. <code>amount</code> is a fractional value between 0.0 and 1.0. Lower values will be converted to 0.0, higher ones converted to 1.0. </td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.take(otherPromise[, map])</td>
      <td>Set up a dependency chain so that <code>promise</code> depends on <code>otherPromise</code>. <code>map</code> is optional and provides custom mapping from <code>otherPromise</code> to <code>promise</code>. The dependency is such that if <code>otherPromise</code> fails, </code>promise</code> fails.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.things()</td>
      <td>Retrieve a list of things this promise is awaiting.</td>
      <td>array</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.map(mapping)</td>
      <td>Get a copy of this promise. <code>mapping</code> updates the names of the things in the new promise, which is useful for avoiding naming conflicts during grouping. The copy is automatically chained to the original.</td>
      <td>different promise</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.nodify(item1, item2, ... itemN)</td>
      <td>This method is intended for use with node.js's error-first callback signature. It returns a function that can be used as a callback in a node.js async call. If an error is passed to the callback, it fails the promise. Otherwise, success params are matched to each named item, in the order provided.</td>
      <td>function</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.nodify(callback[, context])</td>
      <td>This method is intended for use with node.js's error-first callback signature. It returns a function that can be used as a callback in a node.js async call. If an error is passed to the callback, it fails the promise. Otherwise, the callback is executed with the given context, if provided.</td>
      <td>function</td>
    </tr>
  </tbody>
</table>
