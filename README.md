# PROJECT: For when you need things.

## What is it? Multi-variable promises.

PROJECT is a variant of the promises pattern in asynchronous programming. With promises, you ask for a thing, and you get back an object with success and error events that you can listen on. In the body of your success event handler, you then have access to the thing you asked for. PROJECT is the same way, but you ask for *multiple things*, and in the body of your success handler, you have access to the *all the things*.

## What is it for? Separation of concerns.

    // I need things
    new PROJECT.Promise('user', 'feed')

    // here's how I'll get them (the minion)
    .run(function(promise){
	  $.ajax('/api/current_user', {
	    success: function(data){ promise.keep('user', data); },
	    error: function(){ promise.fail('error fetching user'); }
	  })
	  $.ajax('/api/feed', {
	    success: function(data){ promise.keep('feed', data); },
	    error: function(){ promise.fail('error fetching feed'); }
	  })
    })

    // here's what I'll do with them
    .onkeep(function(got){
      alert('success!')
      alert(got.user)
      alert(got.feed)
    })

# Usage

## API overview

  * `PROJECT.Promise(thing1, thing2, ...)` - Constructor. The `new` keyword is required. Accepts zero or more arguments, which are coerced to strings.
  * `promise.run(callback[, context])` - Runs `callback` immediately, which contains the promise fulfillment logic. `callback` is passed a reference to this promise instance. If provided, `context` will be `this` within `callback`, otherwise `this` will be the promise instance.
  * `promise.onkeep(callback[, context])` - Execute `callback` when promise is kept. If promise has already been kept, `callback` is executed immediately. If provided, `context` will be `this` within `callback`, otherwise `this` will be the promise instance.
  * `promise.onfail(callback[, context])` - Execute `callback` when promise fails. If promise has already failed, `callback` is executed immediately. If provided, `context` will be `this` within `callback`, otherwise `this` will be the promise instance.
  * `promise.onresolve(callback[, context])` - Execute `callback` when promise either is kept of fails. If promise has already been kept or failed, `callback` is executed immediately. If provided, `context` will be `this` within `callback`, otherwise `this` will be the promise instance.
  * `promise.keep(thing[, data])` - Fulfill one of the aspects of the promise that were declared during construction. `data` is optional and if undefined, defaults to `null`.
  * `promise.fail(reason)` - Fail the promise for the given `reason` string.
  * `promise.take(anotherPromise[, mapping])` - Chain `anotherPromise` into `promise`. `mapping` is an optional plain JS object serving as a map. Suppose `promise` was constructed on `"foo"` and `"bar"`, whereas `anotherPromise` was constructed on `"foo"` and `"baz"`. If `mapping` was undefined, then only `"foo"` would "take" from `anotherPromise` to `promise`. If `mapping` was defined and was `{'baz':'bar'}`, then `"baz"` of `anotherPromise` will "take" into `"bar"` of `promise`. Finally, if `anotherPromise` fails, it will cause `promise` to fail.
  * `promise.failAfter(milliseconds)` - Sets a time limit in which this promise must keep before it automatically fails with a timeout error message.

## Chainability

Chainability is a key advantage of the Promise pattern, and PROJECT has it.

    p1 = new Promise('foo', 'bar', 'baz')
    p2 = new Promise('foo', 'bar', 'buz', 'qux')

One promise can `take()` another. How does PROJECT deal with `p1` having a different set of things than `p2`? Consider:

    p1.take(p2)

    p1      p2
    ===========
    foo <-- foo
    bar <-- bar
    baz     buz
            qux

In other words, p1 takes any matching values it finds. That's easy enough to understand. But you can also further specify how `p2` gets mapped intp `p1` by providing a mapping object:

    p1.take(p2, {'buz':'baz'})

    p1      p2
    ===========
    foo <-- foo
    bar <-- bar
    baz <-- buz
            qux

Finally, it's worth noting that the mapping you declare overrides direct matches. For example:

    p1.take(p2, {
      'buz':'baz',
      'qux':'bar'
    })

    p1      p2
    ===========
    foo <-- foo
    bar <-- qux
    baz <-- buz
            bar

## Libraryification

With the separation of concerns between getting and using things that PROJECT provides, it's possible (and advisable) to offload the getting of things to functions or libraries.

	function getInfo() {
      return new PROJECT.Promise('user', 'feed')
      .run(function(promise){
	    $.ajax('/api/current_user', {
	      success: function(data){ promise.keep('user', data); },
	      error: function(){ promise.fail('error fetching user'); }
	    })
	    $.ajax('/api/feed', {
	      success: function(data){ promise.keep('feed', data); },
	      error: function(){ promise.fail('error fetching feed'); }
	    })
      })
	}

## Other things to note

Promises can be optionally constructed on arrays, all other rules being the same.

    // these are the same
    new PROJECT.Promise('foo', 'bar', 'baz')
    new PROJECT.Promise(['foo', 'bar', 'baz'])

Empty promises are legal and keep immediately.

    new PROJECT.Promise().onkeep(function(got){
      alert(JSON.stringify(got));
    })
    // alerts '{}'

Things are coerced to strings.

    new PROJECT.Promise({}) // converted to "[object Object]"

There's nothing magical about the `run()` method. It just runs the given function, passing it the promise instance, and then returns that same instance.

    var r1 = new PROJECT.Promise().run(function(r2){
      alert(r1 === r2)
    })
    // alerts "true"

The `run()` method avoids depositing a variable in scope.

    // these are the same

    var promise = new PROJECT.Promise('greeting');
    promise.keep('greeting', 'hi');
    return promise;

    return new PROJECT.Promise('greeting')
    .run(function(promise){
      promise.keep('greeting', 'hi');
    })

`onkeep()`, `onresolve()`, and `onfail()` can be called at any time, an arbitrary number of times. They're executed in the order added.

    new PROJECT.Promise()
    .onfail(function(){ alert('fail1') })
    .onkeep(function(){ alert('keep1') })
    .onresolve(function(){ alert('resolve') })
    .onkeep(function(){ alert('keep2') })
    .onfail(function(){ alert('fail2') })
    // if failed, alert 'fail1' > 'resolve' > 'fail2'
    // if kept, alert 'keep1' > 'resolve' > 'keep2'





