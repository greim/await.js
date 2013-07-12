# await.js

await.js is a dependency-free, [Promises/A+](http://promisesaplus.com/)-conforming library designed to make parallel async operations easy by thinking in terms of *sets*. You await() a set of things, and once you have all the things, you do stuff.

## Example

```javascript
// await a set of things
var getStuff = await('me','feed','ready')

// do stuff with the things
getStuff.then(function(got){
  // now you got stuff
  got.me // json object
  got.feed // json object
  got.ready // null; dom has loaded
},function(err){
  // oops, there was an error
});

// fulfill 'user'
$.ajax('/api/users/me', {
  success: function(data){ getStuff.keep('me', data) },
  error: function(err) { getStuff.fail(err) }
})

// fulfill 'feed'
$.ajax('/api/users/me/feed', {
  success: function(data){ getStuff.keep('feed', data) },
  error: function(err) { getStuff.fail(err) }
})

// fulfill 'ready'
$(document).ready(function(){
  getStuff.keep('ready');
})
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

An await promise starts out as a set of empty slots that need to be filled. As soon as each individual slot has been fulfilled, the promise enters the *kept* state. It doesn't matter how long or in what order the slots are filled, or whether they're fulfilled serially or in parallel. If something goes wrong during fulfillment, the promise enters the *failed* state. The promise cannot enter the failed state if it has already entered the kept state or vice versa. Once in either a kept or failed state, a promise will never switch to any other state.

## Creating promises

You create a promise by calling the `await()` function, and passing a series of strings; one for each slot you expect to be fulfilled.

```javascript
var prom = await('foo','bar','baz')
```

## Consuming promises

There are two ways to do this, the event handlers or the `then()` method.

### The event handlers

An await promise has `onkeep()`, `onresolve()` and `onfail()` methods that accept callbacks. If a promise is in an unresolved state, callbacks are stored for later execution. Once it enters either a kept or a failed state, all relevant callbacks are executed in the order they were added, and references to callback functions are no longer stored from that point onward. These methods can be called any number of times, in any order. If called after the promise has entered the kept or failed state, relevant callbacks are executed immediately and then discarded. Callbacks are always executed after the method returns. Because of these factors, code is effectively decoupled from the state of the promise. For example, a promise instance can be retained and used repeatedly to access the same information over and over.

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

### The `then()` method

The `then()` method conforms to the signature and behavioral conventions outlined in the [Promises/A+ spec](http://promisesaplus.com/). Unlike the event handlers above, which are purely consumer methods, `then()` is both consumer and provider. That is, it returns a *new* promise based on the value returned by its callback.

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
})
```

Others have written good explanations on how to use "thenables", as they have come to be called:

 * http://blog.parse.com/2013/01/29/whats-so-great-about-javascript-promises/
 * https://gist.github.com/domenic/3889970
 * http://howtonode.org/promises
 * http://promisesaplus.com/

## Keeping promises (or failing)

### `promise.keep(name, [value])`

Each slot of a promise is fulfilled using its `keep()` method. `keep()` must be called once for each slot. Only the first call to `keep()` for a given slot has any effect on the state of the promise. Subsequent calls are ignored. If no `value` is given, it defaults to `null`.

### `promise.fail(error)`

At any time, you can call `fail()` on a promise, passing the error object representing the failure. If the promise is already in a kept or failed state, calls to `fail()` are ignored, and have no effect on the state of the promise. If none or only some slots have been filled, `fail()` will permanently push the promise into the failed state.

## Grouping promises

`await()` accepts other promises in addition to strings. In such cases, the newly-created promise is the *union* of all grouped promises and string arguments.

```javascript
p1 = await('foo', 'bar')
p2 = await('baz')
p3 = await(p1, p2, 'qux')

...

p3.onkeep(function(got){
  // do something with got.foo
  // do something with got.bar
  // do something with got.baz
  // do something with got.qux
})
```

`map()` returns a chained copy of the promise with updated names, and can be used to step around name collisions.

```javascript
p1 = await('model')
p2 = await('model')
p3 = await(
  p1.map({'model':'m1'}),
  p2.map({'model':'m2'})
)

...

p3.onkeep(function(got){
  // do something with got.m1
  // do something with got.m2
})
```

## Grouping promises by list

If you have an array of promises of arbitrary length, you use `await.all()` to group them together.

```javascript
var proms = collection.map(function(model){
  return model.fetch()
})

...

await.all(proms)
.onkeep(function(got){
  got.all[0]
  got.all[1]
  //...
})
```

## Chaining promises

Promises can be explicitly chained instead of grouped. Here we've declared two promises, and we want to take the output from one and plug it into the other:

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

p1 now takes p2, and if p2 fails, p1 fails. As you can see, p2 is a different set of things than p1. How does p2 map to p1?

```
p1      p2 
===========
foo <-- foo
bar <-- bar
baz     buz
        qux
```

In other words, p1 only took the *intersection* of itself with p2. Thus when p2 keeps, p1 remains unkept. You can therefore optionally provide a mapping object:

```
p1.take(p2, {'buz':'baz'})

p1      p2 
===========  *p1 can now fire its keep event*
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

You can also *take* non-await thenables, such as a Q promise or a jqXHR object. If so, you must name the value:

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

Node.js uses a convention where callback signatures have an error object in the first position. If the operation was successful, this argument is null, otherwise it's an instance of Error. Every node callback you write therefore needs an if/else statement in order to see if this argument is not empty, which can get tedious. To hook up an await promise to a node callback for example, you'd do this:

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

As a convenience, you can wrap the callback in `promise.nodify()`, and it will wire up the error handling for you, shifting `err` off the signature for you:

```javascript
var promise = await('logData')

fs.readFile('/tmp/log', promise.nodify(function(data){
  promise.keep('logData', data);
}));
```

To save even more typing, if you simply want to keep the promise based on the success value, you can pass a string to `nodify()` instead of a function. This example below behaves equivalent to the above:

```javascript
fs.readFile('/tmp/log', promise.nodify('logData'));
```

### Examples

#### Callback signature: (error, a, b, c)

```javascript
nodeApi.doSomething(promise.nodify('foo', 'bar'))
// 'foo' and 'bar' are kept with values a and b, respectively. c is ignored
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
      <td>Runs <code>callback</code> immediately (synchronously), which contains whatever promise fulfillment logic you want. <code>callback</code> is passed a reference to the promise. If defined and not null, <code>context</code> will be <code>this</code> in <code>callback</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.onkeep(callback[, context])</td>
      <td>Calls <code>callback</code> when every item of the promise is fulfilled. If the promise is already fulfilled, <code>callback</code> runs immediately. <code>callback</code> is passed a map of all the things in the promise, keyed by the strings passed to <code>await()</code>. If defined and not null, <code>context</code> will be <code>this</code> in <code>callback</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.onfail(callback[, context])</td>
      <td>Calls <code>callback</code> when promise fails. If promise already failed, <code>callback</code> runs immediately. <code>callback</code> is passed the the set of args that were passed to the <code>fail()</code> call which triggered the fail. If defined and not null, <code>context</code> will be <code>this</code> in <code>callback</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.onresolve(callback[, context])</td>
      <td>Calls <code>callback</code> when promise either keeps or fails. If promise has already been kept or failed, <code>callback</code> runs immediately. If defined and not null, <code>context</code> will be <code>this</code> in <code>callback</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.then(onkeep, onfail)</td>
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
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.fail(...)</td>
      <td>Fail the promise for the given <code>reason</code>. The first argument is a string. Any number of subsequent arguments are allowed. The whole list of args will then be applied to all <code>onfail()</code> callbacks.</td>
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
