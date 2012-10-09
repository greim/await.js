# await.js: easy promises

await.js aims to present a no-nonsense promise API. Promises in await.js are simple. You ask for set of things, and you get back an object that emits *keep* and *fail* events. In your *keep* event handler, you then have access to the all the things.

await.js has no library dependencies, and runs in either browsers or in Node. "await" was inspired by [IcedCoffeeScript](http://maxtaco.github.com/coffee-script/), wich is an amazing idea that's worth checking out. **Old browser note**: you'll need some polyfill goodness to get it to work in browsers that don't support JavaScript 1.8.5. AKA IE8 and lower. To that end, an `example-polyfills.js` file is included in this project. The polyfills file has no test coverage, and is otherwise purely optional.

## Example

An await.js promise is like a mad lib. There are several slots to fill, and when you fill them all, it's done. Here's an asynchronous mad lib implemented using an await.js promise.

    var promise = await('noun1', 'noun2', 'adjective')

    setTimeout(function(){ promise.keep('noun1', 'horse') }, 1000)
    setTimeout(function(){ promise.keep('noun2', 'apple') }, 4000)
    setTimeout(function(){ promise.keep('adjective', 'happy') }, 2000)

    promise.onkeep(function(got){
      console.log(
      	"The %s eats the %s and is %s.",
      	got.noun1,
      	got.noun2,
      	got.adjective
      )
      // "The horse eats the apple and is happy."
    })

## Benefit: separation of concerns

Separation of concerns is the first casualty of the nested-callback hell that plagues asynchronous JavaScript. It's nice to have an approach that lets you maintain some semblance of order.

    // I need things
    var promise = await('user', 'feed')

    // here's how I'll worry about getting them
    $.ajax('/api/current_user', {
      success: function(data){
        promise.keep('user', data);
      }
    })
    $.ajax('/api/feed', {
      success: function(data){
        promise.keep('feed', data);
      }
    })

    // here's how I'll worry about using them
    promise.onkeep(function(got){
      alert('success!')
      alert(got.user)
      alert(got.feed)
    })

To save typing and/or to encapsulate the promise variable, the above method calls can also be chained:

    await('user', 'feed')
    .run(function(promise){ ... })
    .onkeep(function(got){ ... })

# Usage

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
      <td><strong>Factory function</strong>. Returns a promise, with the idea that you want to await the fulfillment of this set of things before you consider the promise kept. The <code>new</code> keyword is disallowed, since this is a factory, not a constructor. Accepts zero or more string args.</td>
      <td>promise</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.run(callback[, context])</td>
      <td>Runs <code>callback</code> immediately, which contains whatever promise fulfillment logic you want. <code>callback</code> is passed a reference to the promise. If defined and not null, <code>context</code> will be <code>this</code> in <code>callback</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.onkeep(callback[, context])</td>
      <td>Calls <code>callback</code> when every item of the promise is fulfilled. If the promise is already fulfilled, <code>callback</code> runs immediately. <code>callback</code> is passed a map of all the items in the promise, keyed by the strings passed to <code>await()</code>. If defined and not null, <code>context</code> will be <code>this</code> in <code>callback</code>.</td>
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
      <td>Fulfills one of the items of this promise. <code>data</code> is optional and if not defined, defaults to <code>null</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.fail(stringReason, ...)</td>
      <td>Fail the promise for the given <code>reason</code>. The first argument is a string. Any number of subsequent arguments are allowed. The whole list of args will then be applied to <code>onfail()</code> callbacks.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.take(otherPromise[, map])</td>
      <td>Set up a dependency chain so that <code>promise</code> depends on <code>otherPromise</code>. <code>map</code> is optional and provides custom mapping from <code>otherPromise</code> to <code>promise</code>. The dependency is such that if <code>otherPromise</code> fails, </code>promise</code> fails.</td>
      <td>itself</td>
    </tr>
  </tbody>
</table>

## Error handling

Error handling is accomplished via the `fail()` and `onfail()` methods. The nice thing about these is that whatever you pass to `fail()` is what the `onfail()` callback receives. By convention the first argument should be a description string, but subsequent arguments can be `XMLHttpRequest` objects, exceptions objects, debugging info, whatever.

    await()
    .fail('fake failure', 1, 2, 3)
    .onfail(function(){
      alert([].slice.call(arguments).join(','))
      // "fake failure,1,2,3"
    })

## Chainability of promises

Chainability is a nice advantage of promises. Here we've declared two promises, and we want to suck the output from one to the other:

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

In other words, p1 took the intersection of itself with p2. That's easy enough to understand. But you can also further specify how p2 gets mapped intp p1 by giving a mapping object:

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

The `take()` method saves typing. Here's the equivalent chaining done manually:

    p2.onfail(p1.fail)
    p2.onkeep(function(got){
    	p1.keep('foo', got.foo)
    	p1.keep('bar', got.qux)
    	p1.keep('baz', got.buz)
    })

## Libraryification (Backbone.js example)

With the separation of concerns await.js provides, it's possible (and advisable) to offload the getting of things to functions or libraries. You could, for example, extend the Backbone.js Model and Collection objects to have `pfetch` methods that return single-item promises for `model` and `collection`, respectively.

    _.extend(Backbone.Model.prototype, {
      pfetch: function(opts){
        return await('model')
        .run(function(prom){
          opts || (opts = {});
          _.extend(opts, {
            success: function(model){
              prom.keep('model', model);
            },
            error: function(model, xhr){
              prom.fail('error '+xhr.status, xhr);
            }
          });
          this.fetch(opts);
        }, this);
      }
    });
    // and similar for Backbone.Collection...

    ...

    // meanwhile, in a route handler somewhere
    await('model', 'collection')
    .take(new User({id:userId}).pfetch())
    .take(new Feed().pfetch())
    .onkeep(function(got){
      new UserFeedView({
        el: '#content',
        model: got.model,
        collection: got.collection
      }).render();
    })

## Picky details and incidentalities

`await()` can also build on arrays, all other rules being the same.

    // these are the same
    await('foo', 'bar', 'baz')
    await(['foo', 'bar', 'baz'])

Empty promises are legal and keep immediately.

    await().onkeep(function(got){
      alert(JSON.stringify(got));
      // '{}'
    })

`await()` arguments are coerced to strings.

    await({}) // {} is converted to string, but it's legal
              // you'd just have to say promise.keep("[object Object]")!

There's nothing magical about `promise.run()`. It just runs the given function, passing itself to the callback, and also returning itself for chainability.

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





