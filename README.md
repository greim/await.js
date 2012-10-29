# await.js

await.js makes promises easy by re-thinking them in terms of set theory. You await() a set of things, and get back a promise with *keep* and *fail* events. In your *onkeep* event handler, you then have access to that set of things.

await.js has no library dependencies, and runs as-is in either browsers or in Node. "Await" was inspired by [IcedCoffeeScript](http://maxtaco.github.com/coffee-script/), wich is a concept worth checking out.

*Old browser note* - you'll need some polyfill goodness to use it in browsers that don't support JavaScript 1.8.5. (e.g. IE8 and lower). To that end, example-polyfills.js is included in the git repo. The polyfills file has no test coverage, and is otherwise purely optional.

## Installation

The installation process is highly sophisticated. Either...

    <script src="path/to/await.js"></script>

...or...

    npm install await

...or clone the repo and do what you want.

## How does it work? (mad libs)

await.js promises are like mad libs. In fact, here's a mad lib implemented using an await.js promise.

    // promise ourselves two nouns and an adjective
    var prom = await('noun1', 'noun2', 'adjective')

    // for demo purposes, just keep() each
    // part of the promise immediately
    // however, these could have been kept asynchronously
    prom.keep('noun1', 'horse')
    prom.keep('noun2', 'apple')
    prom.keep('adjective', 'happy')

    prom.onkeep(function(got){
      // now, we 'got' all the things we need!
      console.log(
      	"The %s eats the %s and is %s.",
      	got.noun1,
      	got.noun2,
      	got.adjective
      )
      // "The horse eats the apple and is happy."
    })

The *keep* event fires when the last piece of the mad lib is complete. Here the words were gotten synchronously, but getting them asynchronously, and in any order, would have worked just as well.

## What's the benefit? (separation of concerns)

await's set-theoretical approach breaks asynchronous tasks down into areas of concern that map well to the programmer's reasoning process. It starts with the up-front realization that you need to *await* a set of things you don't currently have:

    var prom = await('user', 'feed')

...followed immediately by the question of how to get those things:

    $.ajax('/api/current_user', {
      success: function(data){ prom.keep('user', data) },
      error: function(xhr){ prom.fail('error ' + xhr.status) }
    })
    $.ajax('/api/feed', {
      success: function(data){ prom.keep('feed', data) }
      error: function(xhr){ prom.fail('error ' + xhr.status) }
    })
    
...what to do once you have them:
    
    prom.onkeep(function(got){
      alert('success!')
      alert(got.user)
      alert(got.feed)
    })
    
...what to do if something goes wrong:
    
    prom.onfail(function(reason){
      alert('error!')
      alert(reason)
    })
    
...and what to do in either case:
    
    prom.onresolve(function(){
      alert('all done!')
    })

To save typing and/or to encapsulate the `prom` variable, you can also use the `run()` method and then chain the method calls together, in which case the above could be written as:

    await('user', 'feed')
    .run(function(prom){ ...provider code... })
    .onkeep(function(got){ ...consumer code... })
    .onfail(function(reason){ ...error handling code... })
    .onresolve(function(){ ...resolution code... })

# Basic usage

For every string you pass to the `await()` function, that's one piece of the promise that you need to `keep()` before the whole promise keeps. Meanwhile, you can call `onkeep()` over and over to gain access to those bits of data as many times as you want. While the promise is unkept, your `onkeep()` callbacks are simply queued up for later execution.

## Grouping promises

`await()` accepts other promises in addition to strings. In such cases, the newly-created promise is the *union* of all grouped promises and string arguments.

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

p1 now takes p2, and if p2 fails, p1 fails. As you can see, p2 is a different set of things than p1. How does p2 map to p1?

    p2      p1 
    ===========
    foo --> foo
    bar --> bar
    buz     baz
    qux        

In other words, p1 only took the *intersection* of itself with p2. Thus when p2 keeps, p1 remains unkept. You can therefore optionally provide a mapping object:

    p1.take(p2, {'buz':'baz'})

    p2      p1 
    ===========  *p1 can now fire its keep event*
    foo --> foo
    bar --> bar
    buz --> baz
    qux        

If the mapping you provide conflicts with direct matches, the mapping wins:

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

## Error handling

Error handling is accomplished via the `fail()` and `onfail()` methods. The error message passed to `fail()` is what the `onfail()` callback receives. Any subsequent arguments passed to `fail()` are also applied to the `onfail()` callback, which is useful for debugging, etc.

    await('thing')
    .fail('oops!', 1, 2, 3)
    .onfail(function(){
      alert([].slice.call(arguments).join(','))
      // "oops!,1,2,3"
    })

## Not everything needs a value

Sometimes you might only want to await something to *happen*, without necessarily needing a value back from it. In that case, just leave off the second parameter to `keep()` and it will default to null:

    await('domReady', 'feed')
    .run(function(prom){
      $(document).ready(function(){
        prom.keep('domReady') // left off second param
      })
      fetchFeed(function(feed){
        prom.keep('feed', feed)
      })
    })
    .onkeep(function(got){
      // got.feed contains data
      // got.domReady === null
    })

## Library pattern

The await.js library pattern is as follows:

    return await(...).run(...)

Examples are provided in the `examples` subfolder of the repo, including one for Backbone models and another for jQuery ajax.

## Use in Node JS

Node JS uses a convention where callbacks are passed an error as the first argument. To save typing in a Node setting--or anywhere else this convention is used--await.js promises expose the nodify() method. Here's a basic example:

    fs.readFile('/tmp/log', promise.nodify('logData'));

Which is equivalent to:

    fs.readFile('/tmp/log', function(err, data){
      if (err) {
        promise.fail(err.message, err);
      } else {
        promise.keep('logData', data);
      }
    });

nodify() returns a function intended to be passed as a callback to an async Node method, which when called will keep or fail your promise, as appropriate. The list of names that you pass to nodify() are matched to arguments that Node passes to the callback, *after* the initial error argument. Beyond the error being first, Node's callback signature varies depending on the API, so here are some examples covering basic scenarios:

### Callback signature (error, a, b, c)

    nodeApi.doSomethingAsync(promise.nodify('foo', 'bar'))
    // 'foo' and 'bar' are kept with value a and b, respectively. c is discarded

### Callback signature (error)

    nodeApi.doSomethingAsync(promise.nodify('foo', 'bar'))
    // 'foo' and 'bar' are both kept with value null

### Callback signature (error, a, b)

    nodeApi.doSomethingAsync(promise.nodify(null, 'foo'))
    // 'foo' is kept with value b

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
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.nodify(item1, item2, ... itemN)</td>
      <td>Get a callback function suitable for use in Node JS applications.</td>
      <td>function</td>
    </tr>
  </tbody>
</table>

## Details and incidentalities

For convenience, all methods that take callbacks also take a second context arg.

    await().onkeep(function(){
      // this this is now that this
    }, this)

Empty promises are legal and keep immediately.

    await().onkeep(function(got){
      alert(JSON.stringify(got));
      // '{}'
    })

Once a promise is either kept or failed, subsequent calls to `keep()` or `fail()` are silently ignored.

    await('greeting')
    .keep('greeting', 'hi')
    .keep('greeting', 'hello')
    .fail('no greeting for you')
    .onkeep(function(got){
      alert(got.greeting);
      // 'hi'
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

