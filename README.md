# await.js: Multi-variable promises for asynchronous JavaScript

await.js has no library dependencies and runs in browsers or in Node, without any special configuration. The word "await" was inspired by [IcedCoffeeScript](http://maxtaco.github.com/coffee-script/), wich is an amazing idea and everybody should check it out. **Old browser note**: you'll need some polyfill goodness to get it to work in browsers that don't support JavaScript 1.8.5. AKA IE8 and lower. To that end, an example example-polyfills.js file is included in this project. example-polyfills.js experimental, has no test coverage, and is otherwise purely optional.

## What are multi-variable promises?

With regular promises, you ask for a thing, and you get back an object with success and error events that you can set listeners on. In the body of your success event handler, you then have access to the thing you asked for. await.js is the same way, but you ask for *multiple things*, and in the body of your success handler, you then have access to the *all the things*.

await.js exposes the `await()` factory function, which returns a promise. You can then listen to *keep* and *fail* events on the promise.

    await('noun1', 'noun2', 'adjective')
    .run(function(promise){
      setTimeout(function(){ promise.keep('noun1', 'horse') }, 1000)
      setTimeout(function(){ promise.keep('noun2', 'apple') }, 4000)
      setTimeout(function(){ promise.keep('adjective', 'happy') }, 2000)
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
    await('user', 'feed')

    // here's how I'll worry about getting them
    .run(function(promise){
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
    .onkeep(function(got){
      alert('success!')
      alert(got.user)
      alert(got.feed)
    })

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
      <td><strong>Factory function</strong>. Returns a new multi-var promise. The <code>new</code> keyword is disallowed, since this is a factory, not a constructor. Accepts zero or more string args.</td>
      <td>promise</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.run(callback[, context])</td>
      <td>Runs <code>callback</code> immediately, which contains whatever promise fulfillment logic you want. <code>callback</code> is passed a reference to the promise. If defined and not null, <code>context</code> will be <code>this</code> in <code>callback</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">promise.onkeep(callback[, context])</td>
      <td>Calls <code>callback</code> when promise is fully kept. If the promise is already kept, <code>callback</code> runs immediately. <code>callback</code> is passed a map of all the items in the promise. If defined and not null, <code>context</code> will be <code>this</code> in <code>callback</code>.</td>
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

## Got

In the body of your success callback (the function passed to `onkeep()`), you *got* all the things you need. All you need to worry about is what to do with it.

    // I need a bar of soap and forty tons of fill dirt
    await('a bar of soap', '40 tons of fill dirt')
    .onkeep(function(got){
      // do something with got['a bar of soap']
      // do something with got['40 tons of fill dirt']
    })

## Error handling

Error handling is accomplished via the `fail()` and `onfail()` methods. The nice thing about these methods is that whatever you pass to `fail()` is what the `onfail()` callback receives. By convention the first argument should be a description string, but subsequent arguments can be `XMLHttpRequest` objects, exceptions objects, debugging info, whatever.

    await()
    .fail('fake failure', 1, 2, 3)
    .onfail(function(){
      alert([].slice.call(arguments).join(','))
    })
    // alerts "fake failure,1,2,3"

## Chainability of promises

Chainability is a key advantage of promises. Here we've declared two multi-var promises, and we want to suck the output from one to the other:

    n1 = await('foo', 'bar', 'baz')
    n2 = await('foo', 'bar', 'buz', 'qux')

What happens is that n1 can *take* n2.

    n1.take(n2) // There's lots of code here that never got written,
                // hence this comment is here to take up some of
                // the dead space.

n1 now takes n2, and if n2 fails, n1 fails. But what about the fact that n1 has a different set of things than n2? What happened in this case is:

    n2      n1 
    ===========
    foo --> foo
    bar --> bar
    buz     baz
    qux        

In other words, n1 took the intersection of itself with n2. That's easy enough to understand. But you can also further specify how n2 gets mapped intp n1 by giving a mapping object:

    n1.take(n2, {'buz':'baz'})

    n2      n1 
    ===========
    foo --> foo
    bar --> bar
    buz --> baz
    qux        

Also, it's worth noting that if the mapping you declare conflicts with direct matches, the mapping wins. For example:

    n1.take(n2, {
      'buz':'baz',
      'qux':'bar'
    })

    n2      n1 
    ===========
    foo --> foo
    qux --> bar
    buz --> baz
    bar        

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
    ...and similar for Backbone.Collection...

Suddenly, building page views on asynchronous data fetches isn't very complicated.

    // in a route handler somewhere
    await('model', 'collection')
    .run(function(prom){
      prom.take(new User({id:userId}).pfetch())
      prom.take(new Feed(null, {userId:userId}).pfetch())
    })
    .onkeep(function(got){
      new UserFeedView({
        el: '#content',
        model: got.model,
        collection: got.collection
      }).render();
    })

## Picky details and incidentalities

Methods are chainable where it makes sense, if that kind of thing floats your boat.

	await()
	.onkeep(...)
	.onfail(...)

Promises can be optionally constructed on arrays, all other rules being the same.

    // these are the same
    await('foo', 'bar', 'baz')
    await(['foo', 'bar', 'baz'])

Empty promises are legal and keep immediately.

    await().onkeep(function(got){
      alert(JSON.stringify(got));
    })
    // alerts '{}'

Constructor arguments are coerced to strings.

    await({}) // {} is converted to string, but it's legal
                  // you'd just have to say promise.keep("[object Object]")!

There's nothing magical about `promise.run()`. It just runs the given function, passing itself to the callback, and also returning itself for chainability.

    var refA = await().run(function(refB){
      alert(refA === refB)
    })
    // alerts "true"

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





