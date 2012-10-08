# needs.js - For when you need things

## What is it? Multi-variable promises.

needs.js is a variant of the promises pattern in asynchronous programming. With promises, you ask for a thing, and you get back an object with success and error events that you can listen on. In the body of your success event handler, you then have access to the thing you asked for. needs.js is the same way, but you ask for *multiple things*, and in the body of your success handler, you then have access to the *all the things*.

needs.js exposes the `Needs` constructor, which creates a promise. You can then listen to *keep* and *fail* events on the promise.

    new Needs('noun1', 'noun2', 'adjective')
    .run(function(needs){
      needs.keep('noun1', 'horse')
      needs.keep('noun2', 'apple')
      needs.keep('adjective', 'happy')
    })
    .onkeep(function(got){
      console.log(
      	"The %s eats the %s and is %s.",
      	got.noun1,
      	got.noun2,
      	got.adjective
      )
      // "The horse eats the apple and is happy."
    })

## What is it for? Separation of concerns.

Separation of concerns is the first casualty of the nested-callback hell that plagues asynchronous JavaScript. It's nice when code doesn't force you to worry about lots of things at the same time.

    // I need things
    new Needs('user', 'feed')

    // here's how I'll worry about getting them
    .run(function(needs){
	  $.ajax('/api/current_user', {
	    success: function(data){
	      needs.keep('user', data);
	    }
	  })
	  $.ajax('/api/feed', {
	    success: function(data){
	      needs.keep('feed', data);
	    }
	  })
    })

    // here's how I'll worry about using them
    .onkeep(function(got){
      alert('success!')
      alert(got.user)
      alert(got.feed)
    })

# Usage

## API overview

### `var needs = new Needs(thing1, thing2, ...)`
Constructor which creates a new promise instance object, which we've here named `needs`. The `new` keyword is required. Accepts zero or more string arguments.

### `needs.run(callback[, context])`
Runs `callback` immediately, which contains your promise fulfillment logic. `callback` is passed a reference to the instance. If provided, `context` will be `this` in `callback`, otherwise `this` will be `window`.

### `needs.onkeep(callback[, context])`
Execute `callback` when all needs are fulfilled and the promise is kept. If the promise has already been kept, `callback` is executed immediately. If provided, `context` will be `this` in `callback`, otherwise `this` will be `window`.

### `needs.onfail(callback[, context])`
Execute `callback` when promise fails. If promise has already failed, `callback` is executed immediately. If provided, `context` will be `this` in `callback`, otherwise `this` will be `window`.

### `needs.onresolve(callback[, context])`
Execute `callback` when promise either is kept of fails. If promise has already been kept or failed, `callback` is executed immediately. If provided, `context` will be `this` in `callback`, otherwise `this` will be `window`.

### `needs.keep(thing[, data])`
Fulfill one of the needs that were declared during construction. `data` is optional and if left out, defaults to `null`.

### `needs.fail(reason)`
Fail the promise for the given `reason`.

### `needs.take(otherNeeds[, mapping])`
Chain `otherNeeds` into `needs`. `mapping` is an optional plain JS object serving as a way to map the other set of needs into this set of needs. Failure is chained also, so that if `otherNeeds` fails, `needs` fails.

### `needs.timeout(milliseconds)`
Sets a time limit in which this promise must keep before it automatically fails with a timeout error message.

## Chainability

Chainability is a key advantage of the Promise pattern, and needs.js has it. Here we've declared two sets of needs, and we want to "pump" the output of one into the other:

    n1 = new Needs('foo', 'bar', 'baz')
    n2 = new Needs('foo', 'bar', 'buz', 'qux')

What happens is that n1 can *take* n2.

    n1.take(n2) // there's lots of code here that you didn't write

What about the fact that n1 has a different set of things than n2? Consider:

    n1      n2
    ===========
    foo <-- foo
    bar <-- bar
    baz     buz
            qux

In other words, n1 takes the intersection of itself with n2. That's easy enough to understand. But you can also further specify how `n2` gets mapped intp `n1` by giving a mapping object:

    n1.take(n2, {'buz':'baz'})

    n1      n2
    ===========
    foo <-- foo
    bar <-- bar
    baz <-- buz
            qux

Finally, it's worth noting that the mapping you declare overrides direct matches. For example:

    n1.take(n2, {
      'buz':'baz',
      'qux':'bar'
    })

    n1      n2
    ===========
    foo <-- foo
    bar <-- qux
    baz <-- buz
            bar

## Libraryification

With the separation of concerns between getting and using things that needs.js provides, it's possible (and advisable) to offload the getting of things to functions or libraries.

	function getInfo() { // <-- your library method
      return new Needs('user', 'feed')
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

Methods are chainable where it makes sense, if that kind of thing floats your boat.

	new Needs()
	.onkeep(...)
	.onfail(...)

Promises can be optionally constructed on arrays, all other rules being the same.

    // these are the same
    new Needs('foo', 'bar', 'baz')
    new Needs(['foo', 'bar', 'baz'])

Empty promises are legal and keep immediately.

    new Needs().onkeep(function(got){
      alert(JSON.stringify(got));
    })
    // alerts '{}'

Constructor arguments are coerced to strings.

    new Needs({}) // {} is converted to string, but it's legal
                  // you'd just have to say needs.keep("[object Object]")!

There's nothing magical about the `run()` method. It just runs the given function, passing it the needs instance, and then returns that same instance for chainability.

    var refA = new Needs().run(function(refB){
      alert(refA === refB)
    })
    // alerts "true"

The `run()` method just avoids depositing a variable in scope, provides a handy closure, and keeps things grouped nicely.

    // these are the same

    var promise = new Needs('greeting');
    promise.keep('greeting', 'hi');
    return promise;

    return new Needs('greeting')
    .run(function(promise){
      promise.keep('greeting', 'hi');
    })

`onkeep()`, `onresolve()`, and `onfail()` can be called at any time, an arbitrary number of times. They're executed in the order added.

    new Needs()
    .onfail(function(){ alert('fail1') })
    .onkeep(function(){ alert('keep1') })
    .onresolve(function(){ alert('resolve') })
    .onkeep(function(){ alert('keep2') })
    .onfail(function(){ alert('fail2') })

    // onfail, alert 'fail1' > 'resolve' > 'fail2'
    // onkeep, alert 'keep1' > 'resolve' > 'keep2'





