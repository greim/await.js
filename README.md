# needs.js - For when you need things

needs.js is multi-variable promises. It has no library dependencies and runs either in browsers or in node without any special configuration.

## What are multi-variable promises.

needs.js is a variant of the promises pattern in asynchronous programming. With promises, you ask for a thing, and you get back an object with success and error events that you can listen on. In the body of your success event handler, you then have access to the thing you asked for. needs.js is the same way, but you ask for *multiple things*, and in the body of your success handler, you then have access to the *all the things*.

needs.js exposes the `Needs()` constructor, which creates a promise. You can then listen to *keep* and *fail* events on the promise.

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

<table summary="overview of needs api">
  <thead>
    <tr>
      <th>method</th>
      <th>description</th>
      <th>returns</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="white-space:nowrap;font-family:monospace;">var needs = new Needs(thing1, thing2, ...)</td>
      <td><strong>Constructor</strong>. Creates a new promise, which we've here named 'needs'. The <code>new</code> keyword is required. Accepts zero or more string arguments.</td>
      <td>new instance</td>
    </tr>
    <tr>
      <td style="white-space:nowrap;font-family:monospace;">needs.run(callback[, context])</td>
      <td>Runs <code>callback</code> immediately, which contains your promise fulfillment logic. <code>callback</code> is passed a reference to the instance. If provided, <code>context</code> will be <code>this</code> in <code>callback</code>, otherwise <code>this</code> will be <code>window</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space:nowrap;font-family:monospace;">needs.onkeep(callback[, context])</td>
      <td>Execute <code>callback</code> when all needs are fulfilled and the promise is kept. If the promise has already been kept, <code>callback</code> is executed immediately. If provided, <code>context</code> will be <code>this</code> in <code>callback</code>, otherwise <code>this</code> will be <code>window</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space:nowrap;font-family:monospace;">needs.onfail(callback[, context])</td>
      <td>Execute <code>callback</code> when promise fails. If promise has already failed, <code>callback</code> is executed immediately. If provided, <code>context</code> will be <code>this</code> in <code>callback</code>, otherwise <code>this</code> will be <code>window</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space:nowrap;font-family:monospace;">needs.onresolve(callback[, context])</td>
      <td>Execute <code>callback</code> when promise either is kept of fails. If promise has already been kept or failed, <code>callback</code> is executed immediately. If provided, <code>context</code> will be <code>this</code> in <code>callback</code>, otherwise <code>this</code> will be <code>window</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space:nowrap;font-family:monospace;">needs.keep(thing[, data])</td>
      <td>Fulfill one of the needs that were declared during construction. <code>data</code> is optional and if left out, defaults to <code>null</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space:nowrap;font-family:monospace;">needs.fail(reason)</td>
      <td>Fail the promise for the given <code>reason</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space:nowrap;font-family:monospace;">needs.take(otherNeeds[, mapping])</td>
      <td>Chain <code>otherNeeds</code> into <code>needs</code>. <code>mapping</code> is an optional plain JS object serving as a way to map the other set of needs into this set of needs. Failure is chained also, so that if <code>otherNeeds</code> fails, </code>needs</code> fails.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space:nowrap;font-family:monospace;">needs.timeout(milliseconds)</td>
      <td>Sets a time limit in which this promise must keep before it automatically fails with a timeout error message.</td>
      <td>itself</td>
    </tr>
  </tbody>
</table>

## Chainability of promises

Chainability is a key advantage of the Promise pattern, and needs.js has it. Here we've declared two sets of needs, and we want to "pump" the output of one into the other:

    n1 = new Needs('foo', 'bar', 'baz')
    n2 = new Needs('foo', 'bar', 'buz', 'qux')

What happens is that n1 can *take* n2.

    n1.take(n2) // There's lots of code here that you didn't write,
                // hence this comment is here to take up some of
                // the dead space.

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
      .run(function(needs){
	    $.ajax('/api/current_user', {
	      success: function(data){ needs.keep('user', data); },
	      error: function(){ needs.fail('error fetching user'); }
	    })
	    $.ajax('/api/feed', {
	      success: function(data){ needs.keep('feed', data); },
	      error: function(){ needs.fail('error fetching feed'); }
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

    // onfail: alerts 'fail1' > 'resolve' > 'fail2'
    // onkeep: alerts 'keep1' > 'resolve' > 'keep2'





