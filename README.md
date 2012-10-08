# needs.js: Multi-var promises for asynchronous JavaScript

needs.js has no library dependencies and runs either in browsers, or in Node, without any special configuration. **Old browser note**: you'll need some polyfill goodness to get it to work in browsers that don't support JavaScript JavaScript 1.8.5. AKA IE lte 8. Try modernizr.

## What are multi-var promises?

With regular promises, you ask for a thing, and you get back an object with success and error events that you can set listeners on. In the body of your success event handler, you then have access to the thing you asked for. needs.js is the same way, but you ask for *multiple things*, and in the body of your success handler, you then have access to the *all the things*.

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
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">var needs =<br>new Needs(thing1, thing2, ..., thingN)</td>
      <td><strong>Constructor</strong>. Creates a new promise, which we've here named 'needs'. The <code>new</code> keyword is required. Accepts zero or more string arguments.</td>
      <td>new instance</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">needs.run(callback[, context])</td>
      <td>Runs <code>callback</code> immediately, which contains your promise fulfillment logic. <code>callback</code> is passed a reference to the instance. If provided, <code>context</code> will be <code>this</code> in <code>callback</code>, otherwise <code>this</code> will be <code>window</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">needs.onkeep(callback[, context])</td>
      <td>Execute <code>callback</code> when all needs are fulfilled and the promise is kept. If the promise has already been kept, <code>callback</code> is executed immediately. <code>callback</code> is passed an object map containing all the things you need. If provided, <code>context</code> will be <code>this</code> in <code>callback</code>, otherwise <code>this</code> will be <code>window</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">needs.onfail(callback[, context])</td>
      <td>Execute <code>callback</code> when promise fails. If promise has already failed, <code>callback</code> is executed immediately. <code>callback</code> is passed the reason the promise failed, plus whatever subsequent arguments were passed to the <code>fail()</code> method. If provided, <code>context</code> will be <code>this</code> in <code>callback</code>, otherwise <code>this</code> will be <code>window</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">needs.onresolve(callback[, context])</td>
      <td>Execute <code>callback</code> when promise either is kept of fails. If promise has already been kept or failed, <code>callback</code> is executed immediately. If provided, <code>context</code> will be <code>this</code> in <code>callback</code>, otherwise <code>this</code> will be <code>window</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">needs.keep(thing[, data])</td>
      <td>Fulfill one of the needs that were declared during construction. <code>data</code> is optional and if left out, defaults to <code>null</code>.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">needs.fail(stringReason, ...)</td>
      <td>Fail the promise for the given <code>reason</code>. The first argument is a string. Any number of subsequent arguments are allowed, and these will be applied to any <code>onfail()</code> callbacks.</td>
      <td>itself</td>
    </tr>
    <tr>
      <td style="white-space: nowrap;font-family: monospace;font-size:90%;">needs.take(otherNeeds[, mapping])</td>
      <td>Chain <code>otherNeeds</code> into <code>needs</code>. <code>mapping</code> is an optional plain JS object serving as a way to map the other set of needs into this set of needs. Failure is chained also, so that if <code>otherNeeds</code> fails, </code>needs</code> fails.</td>
      <td>itself</td>
    </tr>
  </tbody>
</table>

## Got

In the body of your success callback (the function passed to `onkeep()`), you *got* all the things you need. All you need to worry about is what to do with it.

    // I need a bar of soap and forty tons of fill dirt
    new Needs('a bar of soap', '40 tons of fill dirt')
    .onkeep(function(got){
      // do something with got['a bar of soap']
      // do something with got['40 tons of fill dirt']
    })

## Error handling

Error handling is accomplished via the `fail()` and `onfail()` methods. The nice thing about these methods is that whatever you pass to `fail()` is what the `onfail()` callback receives. By convention the first argument should be a description string, but subsequent arguments can be `XMLHttpRequest` objects, exceptions objects, debugging info, whatever.

    new Needs()
    .fail('fake failure', 1, 2, 3)
    .onfail(function(){
      alert([].slice.call(arguments).join(','))
    })
    // alerts "fake failure,1,2,3"

## Chainability of promises

Chainability is a key advantage of promises. Here we've declared two sets of needs, and we want to suck the output from one to the other:

    n1 = new Needs('foo', 'bar', 'baz')
    n2 = new Needs('foo', 'bar', 'buz', 'qux')

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

With the separation of concerns needs.js provides, it's possible (and advisable) to offload the getting of things to functions or libraries. You could, for example, extend the Backbone.js Model and Collection objects to have `pfetch` methods that return single-item promises for `model` and `collection`, respectively.

    _.extend(Backbone.Model.prototype, {
      pfetch: function(opts){
        return new Needs('model')
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
    new Needs('model', 'collection')
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

    // in case of fail, alerts 'fail1' > 'resolve' > 'fail2'
    // in case of keep, alerts 'keep1' > 'resolve' > 'keep2'





