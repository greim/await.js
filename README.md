# await.js: easy promises

await.js de-mystifies asynchronous programming by providing a no-nonsense promises API. When you await a set of things, you get back a promise with *keep* and *fail* events. In your *keep* event handler, you then have access to the all the things.

await.js has no library dependencies, and runs in either browsers or in Node. "Await" was inspired by [IcedCoffeeScript](http://maxtaco.github.com/coffee-script/), wich is a concept worth checking out.

*Old browser note* - you'll need some polyfill goodness to use it in browsers that don't support JavaScript 1.8.5. (e.g. IE8 and lower). To that end, example-polyfills.js is included in this project. The polyfills file has no test coverage, and is otherwise purely optional.

## How does it work? (Mad libs)

await.js promises are like mad libs. In fact, here's a mad lib implemented using an await.js promise.

    var prom = await('noun1', 'noun2', 'adjective')

    prom.keep('noun1', 'horse')
    prom.keep('noun2', 'apple')
    prom.keep('adjective', 'happy')

    prom.onkeep(function(got){
      console.log(
      	"The %s eats the %s and is %s.",
      	got.noun1,
      	got.noun2,
      	got.adjective
      )
      // "The horse eats the apple and is happy."
    })

The *keep* event won't fire until the mad lib is complete. Here the words were gotten synchronously, but getting them asynchronously would have worked too. Imagine if a setTimeout() were wrapped around all the prom.keep()s in the above code.

## What's the benefit? (SoC)

[Separation of concerns](http://en.wikipedia.org/wiki/Separation_of_concerns) is the first casualty of the nested-callback hell that plagues asynchronous JavaScript. Here's an example of how await.js helps maintain SoC:

    // I need some things
    var prom = await('user', 'feed')

    // --------------------------------------

    // here's how I'll worry about getting them
    $.ajax('/api/current_user', {
      success: function(data){ prom.keep('user', data) },
      error: function(xhr){ prom.fail('error ' + xhr.status) }
    })
    $.ajax('/api/feed', {
      success: function(data){ prom.keep('feed', data) }
      error: function(xhr){ prom.fail('error ' + xhr.status) }
    })
    
    // --------------------------------------
    
    // here's how I'll worry about using them
    prom.onkeep(function(got){
      alert('success!')
      alert(got.user)
      alert(got.feed)
    })
    
    // --------------------------------------
    
    // here's how I'll worry about error handling
    prom.onfail(function(reason){
      alert('error!')
      alert(reason)
    })
    
    // --------------------------------------
    
    // here's what i'll do in any case
    prom.onresolve(function(){
      alert('all done!')
    })

To save typing and/or to encapsulate the promise variable, you can use the `run()` method, and just chain all the method calls together, in which case the above could be written as:

    await('user', 'feed')
    .run(function(prom){ ...provisioning code... })
    .onkeep(function(got){ ...consumer code... })
    .onfail(function(reason){ ...error handling code... })
    .onresolve(function(){ ...resolution code... })

# Basic usage

For every string you pass to the `await()` function, that's one piece of the promise that needs to be kept before the whole promise keeps. The keeping may be done synchronously or asynchronously. Once the whole promise is kept, you can call `onkeep()` over and over and gain access to those bits of data as many times as you want. While the promise is unkept, your `onkeep()` callbacks are queued up for later execution. However, whether or not the callback is queued or executed immediately is of no concern to your program.

## Grouping promises

The `await()` function accepts other promises in addition to strings. In such cases, the newly-created promise is simply the *union* of all grouped promises and string arguments.

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

`map()` returns a chained copy of the promise with updated names, and can be used to step around name collisions.

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

## Chaining promises

Promises can be explicitly chained instead of grouped. Here we've declared two promises, and we want to suck the output from one to the other:

    p1 = await('foo', 'bar', 'baz')
    p2 = await('foo', 'bar', 'buz', 'qux')

    p2      p1 
    ===========
    foo     foo
    bar     bar
    buz     baz
    qux        

What happens is that p1 can *take* p2.

    p1.take(p2)

p1 now takes p2, and if p2 fails, p1 fails. But what about the fact that p1 has a different set of things than p2? What happened in this case is:

    p2      p1 
    ===========
    foo --> foo
    bar --> bar
    buz     baz
    qux        

In other words, p1 took the *intersection* of itself with p2. That's easy enough to understand. But you can also further specify how p2 gets mapped intp p1 by giving a mapping object:

    p1.take(p2, {'buz':'baz'})

    p2      p1 
    ===========
    foo --> foo
    bar --> bar
    buz --> baz
    qux        

Also, it's worth noting that if the mapping you declare conflicts with direct matches, the mapping wins. For example:

    p1.take(p2, {
      'buz':'baz',
      'qux':'bar'
    })

    p2      p1 
    ===========
    foo --> foo
    qux --> bar
    buz --> baz
    bar        

Just for comparison, here's the equivalent chaining done manually:

    p2.onfail(p1.fail)
    p2.onkeep(function(got){
      p1.keep('foo', got.foo)
      p1.keep('bar', got.qux)
      p1.keep('baz', got.buz)
    })

## Error handling

Error handling is accomplished via the `fail()` and `onfail()` methods. The error message passed to `fail()` is what the `onfail()` callback receives. Any subsequent arguments passed to `fail()` are also applied to the `onfail()` callback, which is useful for debugging, etc.

    await()
    .fail('fake failure', 1, 2, 3)
    .onfail(function(){
      alert([].slice.call(arguments).join(','))
      // "fake failure,1,2,3"
    })

## Library pattern

The await.js library pattern is as follows:

    return await(...).run(...)

Examples are provided in the `examples` subfolder of this project, including one for Backbone models and another for jQuery ajax.

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
      <td><strong>Factory function</strong>. Returns a promise, with the idea that you want to <em>await</em> the fulfillment of this set of things before you consider the promise kept. The <code>new</code> keyword is disallowed, since this is a factory, not a constructor. Accepts zero or more args which can be strings or other promises, which allows grouping. Order of arguments is unimportant.</td>
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
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.keep(item[, data])</td>
      <td>Fulfills one of the things of this promise. <code>data</code> is optional and if not defined, defaults to <code>null</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.fail(stringReason, ...)</td>
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
  </tbody>
</table>

## Picky details and incidentalities

For convenience, all methods that take callbacks also take a second context arg.

    await().onkeep(function(){
      // this this is now that this
    }, this)

Empty promises are legal and keep immediately.

    await().onkeep(function(got){
      alert(JSON.stringify(got));
      // '{}'
    })

`await()` arguments are coerced to strings.

    await({}) // {} is converted to string, but it's legal
              // you'd just have to say promise.keep("[object Object]")!

There's nothing magical about `promise.run()`. It just runs the given function, passing itself to the callback, and returning itself for chainability.

    var refB
    var refA = await().run(function(promise){
      refB = promise
    })
    alert(refA === refB)
    // "true"

`promise.run()` just avoids depositing a variable in scope, provides a handy closure, and keeps things grouped nicely.

    // these are the same

    var promise = await('greeting');
    promise.keep('greeting', 'hi');
    return promise;

    return await('greeting')
    .run(function(promise){
      promise.keep('greeting', 'hi');
    })

`promise.onkeep()`, `promise.onresolve()`, and `promise.onfail()` can be called at any time, an arbitrary number of times. They're executed in the order added.

    await()
    .onfail(function(){ alert('fail1') })
    .onkeep(function(){ alert('keep1') })
    .onresolve(function(){ alert('resolve') })
    .onkeep(function(){ alert('keep2') })
    .onfail(function(){ alert('fail2') })

    // in case of fail, alerts 'fail1' > 'resolve' > 'fail2'
    // in case of keep, alerts 'keep1' > 'resolve' > 'keep2'





