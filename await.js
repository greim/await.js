// ########################################################################
// PROLOGUE - LICENSE

/*
Copyright (c) 2012 by Greg Reimer
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

    // ########################################################################
    // CHAPTER 5 - CHAINING

    PROMISE.take = function(p2, map){
      if (SUCCESS || FAILURE) {
        return PROMISE;
      }
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
      return PROMISE;
    };
    PROMISE.things = function(){
      return Object.keys(SLOTS);
    };

    // ########################################################################
    // CHAPTER 6 - INITIALIZE

    if (this instanceof _await) {
      throw new Error("Must not use 'new' keyword.");
    }

    /*
    Optionally take other promises.
    */
    ARGS.forEach(function(arg){
      if (arg instanceof Promise) {
        arg.things().forEach(function(item){
          SLOTS[item] = false;
        });
        PROMISE.take(arg);
      } else {
        SLOTS[arg] = false;
      }
    });

    SUCCESS = !Object.keys(SLOTS).length;

    return PROMISE;
  };

  // ########################################################################
  // CONCLUSION

  // for browsers
  try {
    window.await = _await;
  } catch(err) {}

  // for node
  try {
    exports.await = _await;
  } catch(err) {}

})();

