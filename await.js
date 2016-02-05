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

  // ------------------------------------------------------------------------
  // CLOSURE SCOPE VARS

  var slice = Array.prototype.slice;

  // ------------------------------------------------------------------------
  // PROGRESS CLASS

  function Progress(){}
  Progress.prototype = {
    getAverage: function(){
      var names = Object.keys(this);
      var total = 0;
      for (var i=0; i<names.length; i++) {
        total += this[names[i]];
      }
      var average = total / names.length;
      return average;
    }
  };

  // ------------------------------------------------------------------------
  // GOTTEN CLASS

  function Gotten(){}
  Gotten.prototype = {
    forEach: Array.prototype.forEach,
    map: Array.prototype.map,
    some: Array.prototype.some,
    every: Array.prototype.every,
    reduce: Array.prototype.reduce,
    slice: Array.prototype.slice,
    join: Array.prototype.join,
    filter: Array.prototype.filter,
    keys: function(){
      return Object.keys(this);
    },
    values: function(){
      return Object.keys(this).map(function(name){
        return this[name];
      }, this);
    }
  };

  // ------------------------------------------------------------------------
  // PROMISE CLASS

  function Promise() {
    this._progress = new Progress();
    this._built = false;
    this._slots = {};
    this._got = new Gotten();
    this._allbacks = [];
    this._failure = false;
    this._success = false;
  }

  Promise.prototype = {

    // ------------------------------------------------------------------------

    /**
    Runs the given callback, passing it an instance of the promise,
    and then returning that same instance. Fails on exception.
    */
    run: function(cb, ctx){
      try {
        cb.call(ctx, this);
      } catch(ex) {
        this.fail(ex);
      }
      return this;
    },

    // ------------------------------------------------------------------------

    _on: function(event, cb, ctx){
      if (typeof cb !== 'function') {
        throw new Error('No callback provided.');
      }

      // NOTE: It's possible for both this._success and this._failure
      // to be true at the same time. In such cases this._success
      // pre-empts this._failure.

      if (this._success || this._failure) {
        // timeout guarantees cb gets
        // executed after return
        var thisProm = this;
        setTimeout(function(){
          if (event === 'resolve') {
            cb.call(ctx);
          }
          if (thisProm._success) {
            if (event === 'keep') {
              cb.call(ctx, thisProm._got);
            }
          } else {
            if (event === 'fail') {
              cb.apply(ctx, thisProm._failure);
            }
          }
        },0);
      } else {
        this._allbacks.push({
          callback:cb,
          context:ctx,
          type:event
        });
      }

      return this;
    },

    // ------------------------------------------------------------------------

    onfail: function(cb, ctx){
      return this._on('fail', cb, ctx);
    },

    // ------------------------------------------------------------------------

    onkeep: function(cb, ctx){
      return this._on('keep', cb, ctx);
    },

    // ------------------------------------------------------------------------

    onresolve: function(cb, ctx){
      return this._on('resolve', cb, ctx);
    },

    // ------------------------------------------------------------------------

    onprogress: function(cb, ctx){
      return this._on('progress', cb, ctx);
    },

    // ------------------------------------------------------------------------

    failer: function(){
      var thisProm = this;
      return function(){
        return Promise.prototype.fail.apply(thisProm, arguments);
      };
    },

    // ------------------------------------------------------------------------

    progress: function(){
      if (!this._allbacks) {
        return this;
      }
      var amounts = arguments[0];
      if (typeof arguments[0] === 'string' && typeof arguments[1] === 'number') {
        amounts = {};
        amounts[arguments[0]] = arguments[1];
      }
      Object.keys(amounts).forEach(function(name){
        var amount = amounts[name];
        if (this._slots[name] === undefined) {
          return;
        }
        amount = parseFloat(amount) || 0;
        amount = Math.max(Math.min(amount, 1), 0);
        this._progress[name] = amount;
      }, this);
      this._allbacks.forEach(function(allback){
        if (allback.type === 'progress') {
          allback.callback.call(allback.context, this._progress);
        }
      }, this);
      return this;
    },

    // ------------------------------------------------------------------------

    /*
    Keep part of the promise.
    */
    keep: function(name, data){
      if (data === undefined) {
        data = null;
      }
      if (this._got.hasOwnProperty(name)){
        return this;
      }
      if (!this._slots.hasOwnProperty(name)) {
        this._got[name] = data;
        return this;
      }
      if (!this._failure && !this._success){
        this._progress[name] = 1;
        this._slots[name] = true;
        this._got[name] = data;
        var kept = Object.keys(this._slots).every(function(item){
          return this._slots[item];
        }, this);
        if (kept) {
          this._success = true;
          this._allbacks.filter(function(obj){
            return obj.type === 'keep' || obj.type === 'resolve';
          }).forEach(function(obj){
            if (obj.type === 'keep') {
              obj.callback.call(obj.context, this._got);
            } else { // it's resolve
              obj.callback.call(obj.context);
            }
          }, this);
          // these are no longer needed, allow GC
          this._allbacks = undefined;
        }
      }
      return this;
    },

    // ------------------------------------------------------------------------

    /*
    Fail the promise for some reason.
    */
    fail: function(){
      if (!this._failure && !this._success){
        this._failure = slice.call(arguments);
        this._allbacks.filter(function(obj){
          return obj.type === 'fail' || obj.type === 'resolve';
        }).forEach(function(obj){
          if (obj.type === 'fail') {
            obj.callback.apply(obj.context, this._failure);
          } else { // resolve
            obj.callback.call(obj.context);
          }
        }, this);
        // these are no longer needed, allow GC
        this._allbacks = undefined;
      }
      return this;
    },

    // ------------------------------------------------------------------------

    /**
    Convenience function for error-first Node JS callback convention.
    */
    nodify: function(){
      var items = slice.call(arguments);
      var thisProm = this;
      return function(err){
        if (err) {
          thisProm.fail(err);
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
                thisProm.keep(thing, args[idx]);
              }
            });
          }
        }
      };
    },

    // ------------------------------------------------------------------------

    take: function(p2, map){
      if (this._success || this._failure) {
        // do nothing
      } else if (p2 instanceof Promise) {
        p2.onfail(this.failer());
        p2.onkeep(function(got){
          var taken = {}, gotItems = Object.keys(got);

          // take any direct matches first
          gotItems.forEach(function(item){
            if (this._slots.hasOwnProperty(item)) {
              taken[item] = got[item];
            }
          }, this);

          // take matches via mapping, overwrites any direct matches
          if (map) {
            gotItems.forEach(function(item){
              if (map.hasOwnProperty(item) && this._slots.hasOwnProperty(map[item])){
                taken[map[item]] = got[item];
              }
            }, this);
          }

          Object.keys(taken).forEach(function(item){
            this.keep(item, taken[item]);
          }, this);
        }, this);
      } else if (p2 && typeof p2.then === 'function' && typeof map === 'string') {
        var name = map;
        var thisProm = this;
        p2.then(function(val){
          thisProm.keep(name, val);
        },function(err){
          thisProm.fail(err);
        },function(amount){
          thisProm.progress(name, amount);
        });
      }
      return this;
    },

    // ------------------------------------------------------------------------

    map: function(map){
      map || (map = {}); // eslint-disable-line no-unused-expressions
      var items = [];
      Object.keys(this._slots).forEach(function(item){
        if (map.hasOwnProperty(item)) {
          items.push(map[item]);
        } else {
          items.push(item);
        }
      });
      return _await.apply(this, items).take(this, map);
    },

    // ------------------------------------------------------------------------

    then: (function(){
      // private helper
      function defaultFulfilled(){ return this; }
      function defaultRejected(err){ throw err; }
      function fulfillWithResult(thenProm, returned, got) {
        if (returned instanceof _await) {
          thenProm._buildState(returned);
        } else {
          var valueProm = _await('value').run(function(prom){
            if (returned && typeof returned.then === 'function') {
              returned.then(function(val) {
                prom.keep('value', val);
              },function(reason) {
                prom.fail(reason);
              });
            } else {
              // 'returned' is some value other than a promise
              prom.keep('value', returned);
            }
          });
          thenProm._buildState(valueProm);
        }
        // accumulate values, as long as the old
        // values don't clobber the new ones
        if (got) {
          got.keys().forEach(function(name){
            if (!thenProm._slots.hasOwnProperty(name)) {
              thenProm.keep(name, got[name]);
            }
          });
        }
      }
      return function(onFulfilled, onRejected, onProgress) {
        if (typeof onFulfilled !== 'function') {
          onFulfilled = defaultFulfilled;
        }
        if (typeof onRejected !== 'function') {
          onRejected = defaultRejected;
        }
        var thisProm = this;
        // empty promise so it can build state from a future promise
        return _await().run(function(thenProm) {
          thisProm
          .onkeep(function(got) {
            try {
              var returnedValue = onFulfilled.call(thisProm, got);
              fulfillWithResult(thenProm, returnedValue, got);
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
          if (typeof onProgress === 'function') {
            thisProm.onprogress(function() {
              try {
                // make sure to call the prototype getAverage() in case there's a slot named "getAverage"
                onProgress.call(thisProm, Progress.prototype.getAverage.call(thisProm._progress));
              } catch(ex) {}
            });
          }
        });
      };
    })(),

    // ------------------------------------------------------------------------

    "catch": function(onRejected){
      return this.then(null, onRejected);
    },

    // ------------------------------------------------------------------------

    _buildState: function() {
      var items = slice.call(arguments);

      // Check if already built.
      if (this._built) {
        throw new Error('cannot build state twice');
      } else {
        this._built = items.length > 0;
      }

      // Populate slots.
      items.forEach(function(item) {
        if (item instanceof Promise) {
          Object.keys(item._slots).forEach(function(item) { // eslint-disable-line no-shadow
            this._slots[item] = false;
          }, this);
        } else {
          this._slots[item] = false;
        }
      }, this);

      // Having populated slots, take promises.
      items.forEach(function(item) {
        if (item instanceof Promise) {
          this.take(item);
        }
      }, this);

      Object.keys(this._slots).forEach(function(slot){
        this._progress[slot] = 0;
      }, this);

      return this;
    }
  };

  // ------------------------------------------------------------------------
  // FACTORY FUNCTION

  // this is the function exported
  var _await = function(){
    var prom = new Promise();
    prom._buildState.apply(prom, arguments);
    return prom;
  };

  // ------------------------------------------------------------------------
  // AWAITING LISTS

  _await.all = function(list) {
    if (!list || list.length === 0) {
      return _await('length').keep('length',0);
    }
    var keys = list.map(function(prom, idx){
      return idx;
    });
    keys.push('length');
    return _await.apply(this, keys).run(function(allProm){
      allProm.keep('length', list.length);
      list.forEach(function(prom, idx){
        prom.onfail(allProm.failer());
        prom.onkeep(function(got){
          allProm.keep(idx, got);
        });
      });
    });
  };

  // ------------------------------------------------------------------------
  // INSTANCEOF SUPPORT

  // so that "foo instanceof await" works
  _await.prototype = Promise.prototype;

  // ------------------------------------------------------------------------
  // EXPORT

  if (module && module.exports){

    // for common js
    module.exports = _await;
    // back compat, for people calling this lib
    // like var await = require('await').await
    module.exports['await'] = _await;
  } else {

    // for browsers
    if (typeof define === 'function' && define.amd) {
      define('await', [], function(){ return _await; });
    } else {
      window['await'] = _await;
    }
  }
})();
