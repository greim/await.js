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

/*
Backbone models have asynchronous methods fetch(), save(), and destroy().
Here's an example of extending them with similar, promise-returning methods,
called pfetch(), psave(), and pdestroy().
*/

(function(){

  function extendOpts(opts, promise, type){
    opts || (opts = {});
    _.extend(opts, {
      success: function(thing){
        prom.keep(type, thing);
      },
      error: function(thing, xhr){
        prom.fail('error '+xhr.status, xhr, thing);
      }
    });
    return opts;
  }

  _.extend(Backbone.Model.prototype, {
    pfetch: function(opts){
      return await('model')
      .run(function(prom){
        this.fetch(extendOpts(opts, prom, 'model'));
      }, this);
    },
    psave: function(atrs, opts){
      return await('model')
      .run(function(prom){
        this.save(atrs, extendOpts(opts, prom, 'model'));
      }, this);
    },
    pdestroy: function(opts){
      return await('model')
      .run(function(prom){
        this.destroy(extendOpts(opts, prom, 'model'));
      }, this);
    }
  });

  _.extend(Backbone.Collection.prototype, {
    pfetch: function(opts){
      return await('collection')
      .run(function(prom){
        this.fetch(extendOpts(opts, prom, 'collection'));
      }, this);
    }
  });

})();
