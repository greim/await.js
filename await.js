// ########################################################################
// PROLOGUE - LICENSE

/*
Copyright (c) 2013 by Greg Reimer
https://github.com/greim
http://obadger.com/

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(function(){

  // ########################################################################
  // INTRODUCTION - CLOSURE SCOPE VARS

  var slice = [].slice;
  function Promise(){}

  // this is the function exported
  var _await = function(){

    // ########################################################################
    // CHAPTER 1 - VARIABLE DECLARATION

    var ARGS = slice.call(arguments);

    /*
    Boolean to track if the state has been built. State can only be built once.
    */
    var BUILT = false;

    /*
    Using convention of uppercase names for vars scoped to _await()
    */
    var PROMISE = new Promise();

    /*
    Keep track of things this promise needs,
    and whether they've been fulfilled.
    */
    var SLOTS = {};

    /*
    This keeps track of any pieces of data that the user of this API
    is collecting via this promise.
    */
    var GOT = {};

    /*
    The ALLBACKS array contains keep, fail and resolve callbacks.
    */
    var ALLBACKS = [];

    /*
    The failure status of this promise. If truthy, the promise has been
    broken.
    */
    var FAILURE = false;

    /*
    The kept status of this promise. If truthy, the promise has been kept.
    Empty promises are considered automatically kept.
    */
    var SUCCESS = false;

    // ########################################################################
    // CHAPTER 2 - RUNNING

    /**
    Runs the given callback, passing it an instance of the promise,
    and then returning that same instance.
    */
    PROMISE.run = function(cb, ctx){
      cb.call(ctx, PROMISE);
      return PROMISE;
    };

    // ########################################################################
    // CHAPTER 3 - EVENTS

    function on(event, cb, ctx){
      if (typeof cb !== 'function') {
        throw new Error('No callback provided.');
      }

      /*
      NOTE: It's possible for both SUCCESS and FAILURE to be
      true at the same time. In such cases SUCCESS pre-empts
      FAILURE.
      */

      if (SUCCESS || FAILURE) {
        // timeout guarantees cb gets
        // executed after return
        setTimeout(function(){        
          if (event === 'resolve') {
            cb.call(ctx);
          }
          if (SUCCESS) {
            if (event === 'keep') {
              cb.call(ctx, GOT);
            }
          } else {
            if (event === 'fail') {
              cb.apply(ctx, FAILURE);
            }
          }
        },0);
      } else {
        ALLBACKS.push({
          callback:cb,
          context:ctx,
          type:event
        });
      }

      return PROMISE;
    }

    PROMISE.onfail = function(cb, ctx){
      return on('fail', cb, ctx);
    };
    PROMISE.onkeep = function(cb, ctx){
      return on('keep', cb, ctx);
    };
    PROMISE.onresolve = function(cb, ctx){
      return on('resolve', cb, ctx);
    };

    // ########################################################################
    // CHAPTER 4 - PROVISIONING (KEEPING & FAILING)

    /*
    Keep part of the promise.
    */
    PROMISE.keep = function(name, data){
      if (GOT[name] !== undefined){
        return PROMISE;
        //throw new Error('"'+name+'" can only be kept once on promise.');
      }
      if (SLOTS[name] === undefined) {
        return PROMISE;
        //throw new Error('"'+name+'" is not promised.');
      }
      if (!FAILURE && !SUCCESS){
        if (data === undefined) {
          data = null;
        }
        SLOTS[name] = true;
        GOT[name] = data;
        var kept = Object.keys(SLOTS).every(function(item){
          return SLOTS[item];
        });
        if (kept) {
          SUCCESS = true;
          ALLBACKS.filter(function(obj){
            return obj.type === 'keep' || obj.type === 'resolve';
          }).forEach(function(obj){
            if (obj.type === 'keep') {
              obj.callback.call(obj.context, GOT);
            } else { // it's resolve
              obj.callback.call(obj.context);
            }
          });
          // these are no longer needed, allow GC
          ALLBACKS = undefined;
        }
      }
      return PROMISE;
    };

    /*
    Fail the promise for some reason.
    */
    PROMISE.fail = function(){
      if (!FAILURE && !SUCCESS){
        FAILURE = slice.call(arguments);
        ALLBACKS.filter(function(obj){
          return obj.type === 'fail' || obj.type === 'resolve';
        }).forEach(function(obj){
          if (obj.type === 'fail') {
            obj.callback.apply(obj.context, FAILURE);
          } else { // it's resolve
            obj.callback.call(obj.context);
          }
        });
        // these are no longer needed, allow GC
        ALLBACKS = undefined;
      }
      return PROMISE;
    };

    /**
    Convenience function for error-first Node JS callback convention.
    */
    PROMISE.nodify = function(){
      var items = slice.call(arguments);
      return function(err){
        if (err) {
          PROMISE.fail(err);
        } else {
          var args = slice.call(arguments);
          if (typeof items[0] === 'function') {
            var cb = items[0];
            var ctx = items[1];
            cb.apply(ctx, args);
          } else {
            args.shift(); // lose the error
            items.forEach(function(thing, idx){
              if (thing !== null && thing !== undefined) {
                PROMISE.keep(thing, args[idx]);
              }
            });
          }
        }
      };
    };

    // ########################################################################
    // CHAPTER 5 - CHAINING

    PROMISE.take = function(p2, map){
      if (SUCCESS || FAILURE) {
        // do nothing
      } else if (p2 instanceof Promise) {
        p2.onfail(PROMISE.fail);
        p2.onkeep(function(got){
          var taken = {}, gotItems = Object.keys(got);

          // take any direct matches first
          gotItems.forEach(function(item){
            if (SLOTS.hasOwnProperty(item)) {
              taken[item] = got[item];
            }
          });

          // take matches via mapping, overwrites any direct matches
          if (map) {
            gotItems.forEach(function(item){
              if (map.hasOwnProperty(item) && SLOTS.hasOwnProperty(map[item])){
                taken[map[item]] = got[item];
              }
            });
          }

          Object.keys(taken).forEach(function(item){
            PROMISE.keep(item, taken[item]);
          });
        });
      } else if (p2 && typeof p2.then === 'function' && typeof map === 'string') {
        var name = map;
        p2.then(function(val){
          PROMISE.keep(name, val);
        },function(err){
          PROMISE.fail(err);
        });
      }
      return PROMISE;
    };
    PROMISE.things = function(){
      return Object.keys(SLOTS);
    };

    // ########################################################################
    // CHAPTER 6 - MAP

    PROMISE.map = function(map){
      map || (map = {});
      var items = [];
      Object.keys(SLOTS).forEach(function(item){
        if (map.hasOwnProperty(item)) {
          items.push(map[item]);
        } else {
          items.push(item);
        }
      });
      return _await.apply(this, items).take(PROMISE, map);
    };

    // ########################################################################
    // CHAPTER 7 - PROMISES/A+

    function fulfillWithResult(thenProm, returned) {
      if (returned && returned.constructor === Promise) {
        thenProm.buildState(returned);
      } else {
        var valueProm = _await('value').run(function(prom){
          if (returned && typeof returned.then === 'function') {
            returned.then(function(val) {
              prom.keep('value', val);
            },function(reason) {
              prom.fail(reason);
            });
          } else {
            // returned is some value other than a promise
            prom.keep('value', returned);
          }
        });
        thenProm.buildState(valueProm);
      }
    }

    PROMISE.then = function(onFulfilled, onRejected) {

      if (typeof onFulfilled !== 'function') {
        onFulfilled = function(){ return this; };
      }
      if (typeof onRejected !== 'function') {
        onRejected = function(err){ throw err; };
      }

      var thisProm = this;

      // empty promise so it can build state from a future promise
      return _await().run(function(thenProm) {
        thisProm
        .onkeep(function(got) {
          try {
            var returnedValue = onFulfilled.call(thisProm, got);
            fulfillWithResult(thenProm, returnedValue);
          } catch(ex) {
            thenProm.fail(ex);
          }
        })
        .onfail(function(reason) {
          try {
            var returnedValue = onRejected.call(thisProm, reason);
            fulfillWithResult(thenProm, returnedValue);
          } catch(ex) {
            thenProm.fail(ex);
          }
        });
      });
    };

    PROMISE.catch = function(onRejected){
      return PROMISE.then(null, onRejected);
    }

    // ########################################################################
    // CHAPTER 8 - BUILD STATE

    PROMISE.buildState = function() {

      var items = slice.call(arguments);

      /*
      Check if already built.
      */
      if (BUILT) {
        throw new Error('cannot build state twice');
      } else {
        BUILT = items.length > 0;
      }

      /*
      Populate slots.
      */
      items.forEach(function(item) {
        if (item instanceof Promise) {
          item.things().forEach(function(item) {
            SLOTS[item] = false;
          });
        } else {
          SLOTS[item] = false;
        }
      });

      /*
      Having populated slots, take promises.
      */
      items.forEach(function(item) {
        if (item instanceof Promise) {
          PROMISE.take(item);
        }
      });

      return PROMISE;
    };

    // ########################################################################
    // CHAPTER 9 - INIT AND RETURN

    PROMISE.buildState.apply(PROMISE, ARGS);

    return PROMISE;
  };

  // ########################################################################
  // CHAPTER 10 - AWAITING LISTS

  _await.all = function(list) {
    if (!list || list.length === 0) {
      return _await('all').keep('all',[]);
    }
    var gots = [];
    var promiseList = list.map(function(prom, idx){
      var key = 'p'+idx;
      return _await(key)
      .run(function(idxProm){
        prom.onkeep(function(got){
          gots[idx] = got;
          idxProm.keep(key);
        });
        prom.onfail(idxProm.fail);
      });
    });
    return _await('all')
    .run(function(prom){
      _await.apply(this, promiseList)
      .onfail(prom.fail)
      .onkeep(function(){
        prom.keep('all', gots);
      });
    });
  };

  // ########################################################################
  // CONCLUSION

  // for extensibility
  _await.prototype = Promise.prototype;

  // for browsers
  try {
    if (typeof define === 'function' && define.amd) {
      define('await', [], function(){ return _await; });
    } else {
      window.await = _await;
    }
  } catch(err) {}

  // for node
  try {
    module.exports = _await;
    // back compat, for people calling this lib
    // like var await = require('await').await
    module.exports.await = _await;
  } catch(err) {}

})();

