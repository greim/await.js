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

// MOCHA TESTS
// http://visionmedia.github.com/mocha/

var assert = require("assert")
var await = require('../await').await

describe('await', function(){

  // ###########################################################

  describe('#run()', function(){

    it('should be chainable', function(){
      var ref1 = await();
      var ref2 = ref1.run(function(){});
      assert.strictEqual(ref1, ref2)
    })

    it('should run synchronously', function(){
      var synch = false;
      await().run(function(){ synch = true });
      assert.ok(synch)
    })

    it('should pass this instance to the callback', function(){
      var ref2
      var ref1 = await()
      .run(function(prom){
        ref2 = prom
      });
      assert.strictEqual(ref1, ref2)
    })

    it('should accept a context for the callback', function(){
      var ref1 = {}, ref2 = false;
      await().run(function(){ ref2 = this }, ref1);
      assert.strictEqual(ref1, ref2)
    })
  })

  // ###########################################################

  describe('#onkeep()', function(){

    it('should be chainable', function(){
      var ref1 = await();
      var ref2 = ref1.onkeep(function(){});
      assert.strictEqual(ref1, ref2)
    })

    it('should work', function(){
      var worked = false
      await().onkeep(function(){ worked = true })
      assert.ok(worked)
    })

    it('should let synchronous keeps be synchronous', function(){
      var synch = false
      await().onkeep(function(){ synch = true })
      assert.ok(synch)
    })

    it('should accept a context for the callback', function(){
      var ref1 = {}, ref2 = false;
      await().onkeep(function(){ ref2 = this }, ref1);
      assert.strictEqual(ref1, ref2)
    })
  })

  // ###########################################################

  describe('#onfail()', function(){

    it('should be chainable', function(){
      var ref1 = await();
      var ref2 = ref1.onfail(function(){});
      assert.strictEqual(ref1, ref2)
    })

    it('should work', function(){
      var failWorked = false
      await('foo').fail().onfail(function(){ failWorked = true })
      assert.ok(failWorked)
    })

    it('should let synchronous fails be synchronous', function(){
      var synch = false
      await('foo').fail().onfail(function(){ synch = true })
      assert.ok(synch)
    })

    it('should accept a context for the callback', function(){
      var ref1 = {}, ref2 = false;
      await('foo').fail().onfail(function(){ ref2 = this }, ref1);
      assert.strictEqual(ref1, ref2)
    })
  })

  // ###########################################################

  describe('#onresolve()', function(){

    it('should be chainable', function(){
      var ref1 = await();
      var ref2 = ref1.onresolve(function(){});
      assert.strictEqual(ref1, ref2)
    })

    it('should happen on keep', function(done){
      await().onresolve(done)
    })

    it('should happen on fail', function(done){
      await('foo').fail().onresolve(done)
    })

    it('should accept a context for the callback', function(){
      var ref1 = {}, ref2 = false;
      await().onkeep(function(){ ref2 = this }, ref1);
      assert.strictEqual(ref1, ref2)
    })

    it('should accept a context for the callback', function(){
      var ref1 = {}, ref2 = false;
      await().onresolve(function(){ ref2 = this }, ref1);
      assert.strictEqual(ref1, ref2)
    })
  })

  // ###########################################################

  describe('#keep()', function(){

    it('should be chainable', function(){
      var ref1 = await('foo');
      var ref2 = ref1.keep('foo');
      assert.strictEqual(ref1, ref2)
    })

    it('should work', function(){
      var worked = false
      await('foo').keep('foo').onkeep(function(){ worked = true })
      assert.ok(worked)
    })

    it('should only work when supposed to', function(){
      await('foo').onkeep(function(){
        assert.ok(false)
      })
    })

    it('should take first keep of dupe keeps', function(){
      await('foo').keep('foo','x').keep('foo','y')
      .onkeep(function(got){
        assert.strictEqual(got.foo, 'x')
      })
    })

    it('should not throw error with dupe keeps', function(){
      await('foo').keep('foo').keep('foo')
    })

    it('should not throw error with unknown keep', function(){
      await('foo').keep('bar')
    })
  })

  // ###########################################################

  describe('#fail()', function(){
    it('should be chainable', function(){
      var ref1 = await();
      var ref2 = ref1.fail();
      assert.strictEqual(ref1, ref2)
    })

    it('should work', function(){
      var worked = false
      await('foo').fail().onfail(function(){ worked = true })
      assert.ok(worked)
    })
  })

  // ###########################################################

  describe('#nodify()', function(){

    function fakeNodeMethod(cb){
      setTimeout(function(){
        cb(null, 1, '2')
      },0)
    }

    function fakeNodeMethodErr(cb){
      setTimeout(function(){
        cb(new Error('Fake error.'), 1, '2')
      },0)
    }

    it('should work', function(done){
      var prom = await('one')
      fakeNodeMethod(prom.nodify('one'))
      prom.onkeep(function(got){
        assert.strictEqual(got.one, 1)
        done()
      })
      prom.onfail(function(){
        done(new Error('Unexpected failure'))
      })
    })

    it('should work with multiple args', function(done){
      var prom = await('one', 'two')
      fakeNodeMethod(prom.nodify('one', 'two'))
      prom.onkeep(function(got){
        assert.strictEqual(got.one, 1)
        assert.strictEqual(got.two, '2')
        done()
      })
      prom.onfail(function(){
        done(new Error('Unexpected failure'))
      })
    })

    it('should work with a null arg', function(done){
      var prom = await('two')
      fakeNodeMethod(prom.nodify(null, 'two'))
      prom.onkeep(function(got){
        assert.strictEqual(got.one, undefined)
        assert.strictEqual(got.two, '2')
        done()
      })
      prom.onfail(function(){
        done(new Error('Unexpected failure'))
      })
    })

    it('should fail properly', function(done){
      var prom = await('one')
      fakeNodeMethodErr(prom.nodify('one'))
      prom.onkeep(function(got){
        done(new Error('Unexpected success'))
      })
      prom.onfail(function(){
        done()
      })
    })
  })

  // ###########################################################

  describe('#take()', function(){

    it('should be chainable', function(){
      var fakePromise = await('foo');
      var ref1 = await();
      var ref2 = ref1.take(fakePromise);
      assert.strictEqual(ref1, ref2)
    })

    it('should work', function(){
      var worked = false
      var p1 = await('foo')
      var p2 = await('foo')
      p1.take(p2)
      p2.keep('foo')
      p1.onkeep(function(){ worked = true })
      assert.ok(worked)
    })

    it('should take intersection', function(){
      var worked = false
      var p1 = await('foo','bar')
      var p2 = await('foo','baz')
      p1.take(p2).keep('bar')
      p2.keep('foo').keep('baz')
      p1.onkeep(function(){ worked = true })
      assert.ok(worked)
    })

    it('should allow mapping', function(){
      var worked = false
      var p1 = await('foo','bar')
      var p2 = await('foo','baz')
      p1.take(p2, {'baz':'bar'})
      p2.keep('foo').keep('baz')
      p1.onkeep(function(){ worked = true })
      assert.ok(worked)
    })

    it('should favor mappings over direct matches', function(){
      var worked = false
      var p1 = await('foo','bar')
      var p2 = await('foo','bar','baz')
      p1.take(p2, {'baz':'bar'})
      p2.keep('foo','foo').keep('bar','bar').keep('baz','baz')
      p1.onkeep(function(got){
        assert.strictEqual(got.foo, 'foo')
        assert.strictEqual(got.bar, 'baz')
        worked = true
      })
      assert.ok(worked)
    })

    it('should chain failures too', function(){
      var message = false, err = 'oops'
      var p1 = await('foo')
      var p2 = await('foo')
      p1.take(p2)
      p2.fail(err)
      p1.onfail(function(mess){ message = mess })
      assert.strictEqual(err, message)
    })
  })

  // ###########################################################

  describe('#things()', function(){

    it('should work for empty promises', function(){
      var p = await();
      assert.strictEqual(p.things().length, 0)
    })

    it('should work for single-item promises', function(){
      var p = await('foo');
      assert.strictEqual(p.things().join(), 'foo')
    })

    it('should work for multi-item promises', function(){
      var p = await('foo','bar');
      assert.ok(p.things().indexOf('foo') > -1)
      assert.ok(p.things().indexOf('bar') > -1)
      assert.ok(p.things().length === 2)
    })

    it('should work for grouped promises', function(){
      var p1 = await('foo')
      var p2 = await('bar')
      var p = await(p1,p2,'baz')
      assert.ok(p.things().indexOf('foo') > -1)
      assert.ok(p.things().indexOf('bar') > -1)
      assert.ok(p.things().indexOf('baz') > -1)
      assert.ok(p.things().length === 3)
    })
  })

  // ###########################################################

  describe('#map()', function(){

    it('should work for single-item promises', function(){
      var worked = false;
      var p1 = await('foo')
      var p2 = p1.map({'foo':'bar'})
      p1.keep('foo','yes')
      p2.onkeep(function(got){
        assert.strictEqual(got.bar,'yes')
        worked = true;
      })
      assert.ok(worked)
    })

    it('should only pass the mapped item', function(){
      var worked = false;
      var p1 = await('foo')
      var p2 = p1.map({'foo':'bar'})
      p1.keep('foo','yes')
      p2.onkeep(function(got){
        assert.strictEqual(got.bar,'yes')
        assert.strictEqual(Object.keys(got).length,1)
        worked = true;
      })
      assert.ok(worked)
    })

    it('should work for multi-item promises', function(){
      var worked = false;
      var p1 = await('foo','baz')
      var p2 = p1.map({'foo':'bar','baz':'qux'})
      p1.keep('foo','yes')
      p1.keep('baz','yes')
      p2.onkeep(function(got){
        assert.strictEqual(got.bar,'yes')
        assert.strictEqual(got.qux,'yes')
        worked = true;
      })
      assert.ok(worked)
    })

    it('should work for partial mappings', function(){
      var worked = false;
      var p1 = await('foo','baz')
      var p2 = p1.map({'foo':'bar'})
      p1.keep('foo','yes')
      p1.keep('baz','yes')
      p2.onkeep(function(got){
        assert.strictEqual(got.bar,'yes')
        assert.strictEqual(got.baz,'yes')
        worked = true;
      })
      assert.ok(worked)
    })

    it('should work for empty mappings', function(){
      var worked = false;
      var p1 = await('foo','baz')
      var p2 = p1.map({})
      p1.keep('foo','yes')
      p1.keep('baz','yes')
      p2.onkeep(function(got){
        assert.strictEqual(got.foo,'yes')
        assert.strictEqual(got.baz,'yes')
        worked = true;
      })
      assert.ok(worked)
    })

    it('should work asynchronously', function(done){
      var p1 = await('foo','baz')
      var p2 = p1.map({'foo':'bar','baz':'qux'})
      setTimeout(function(){
        p1.keep('foo','yes')
        p1.keep('baz','yes')
      },1)
      p2.onkeep(function(got){
        try{
        assert.strictEqual(got.bar,'yes')
        assert.strictEqual(got.qux,'yes')
        done()
      } catch(err) {
        done(err)
      }
      })
    })
  })

  // ###########################################################

  describe('factory function', function(){

    it('should use series of strings', function(){
      var worked = false
      await('foo','bar')
      .keep('foo')
      .keep('bar')
      .onkeep(function(){ worked = true })
      assert.ok(worked)
    })

    it('should coerce args to strings', function(){
      var worked = false
      await({})
      .keep('[object Object]')
      .onkeep(function(){ worked = true })
      assert.ok(worked)
    })
  })

  // ###########################################################

  describe('grouping', function(){

    it('should group promises synchronously', function(){
      var worked = false;
      var p1 = await('foo','bar').keep('foo').keep('bar')
      var p2 = await('baz').keep('baz')
      await(p1, p2)
      .onkeep(function(got){
        assert.ok(got.hasOwnProperty('foo'))
        assert.ok(got.hasOwnProperty('bar'))
        assert.ok(got.hasOwnProperty('baz'))
        worked = true
      })
      assert.ok(worked)
    })

    it('should group promises asynchronously', function(done){
      var p1 = await('foo','bar')
      var p2 = await('baz')
      await(p1, p2, 'qux')
      .run(function(prom){
        setTimeout(function(){
          p1.keep('foo')
          p1.keep('bar')
          p2.keep('baz')
          prom.keep('qux')
        },1)
      })
      .onkeep(function(got){
        try {
          assert.ok(got.hasOwnProperty('foo'))
          assert.ok(got.hasOwnProperty('bar'))
          assert.ok(got.hasOwnProperty('baz'))
          assert.ok(got.hasOwnProperty('qux'))
          done()
        } catch(err) {
          done(err)
        }
      })
    })

    it('should group promises using mapping', function(){
      var p1 = await('foo').keep('foo')
      var p2 = await('foo').keep('foo')
      await(p1, p2.map({'foo':'bar'}))
      .onkeep(function(got){
        assert.ok(got.hasOwnProperty('foo'))
        assert.ok(got.hasOwnProperty('bar'))
      })
    })
  })

  // ###########################################################

  describe('keep and onkeep', function(){

    it('should support the empty case, synchronously', function(){
      var worked = false
      await().onkeep(function(){ worked = true })
      assert.ok(worked)
    })

    it('should support the single-var case, synchronously', function(){
      var worked = false
      await('foo').keep('foo')
      .onkeep(function(){ worked = true })
      assert.ok(worked)
    })

    it('should support the many-var case, synchronously', function(){
      var worked = false
      await('foo','bar')
      .keep('foo')
      .keep('bar')
      .onkeep(function(){ worked = true })
      assert.ok(worked)
    })

    it('should support the single-var case, asynchronously', function(done){
      await('foo')
      .onkeep(function(){ done() })
      .run(function(prom){
        setTimeout(function(){ prom.keep('foo') }, 0);
      })
    })

    it('should support the many-var case, asynchronously', function(done){
      await('foo','bar')
      .onkeep(function(){ done() })
      .run(function(prom){
        setTimeout(function(){ prom.keep('foo') }, 0);
        setTimeout(function(){ prom.keep('bar') }, 0);
      })
    })

    it('should not keep automatically when not empty', function(){
      var worked = true
      await('foo').onkeep(function(){ worked = false })
      assert.ok(worked)
    })

    it('should pass got with appropriate fields', function(){
      await()
      .onkeep(function(got){
        assert.strictEqual(JSON.stringify(got), '{}')
      })
      await('foo')
      .keep('foo')
      .onkeep(function(got){
        assert.strictEqual(JSON.stringify(got), '{"foo":null}')
      })
    })

    it('should convert undefined values to null', function(){
      await('foo')
      .keep('foo')
      .onkeep(function(got){
        assert.strictEqual(got.foo, null)
      })
    })

    it('should pass through null', function(){
      await('foo')
      .keep('foo', null)
      .onkeep(function(got){
        assert.strictEqual(got.foo, null)
      })
    })

    it('should pass through all data types', function(){
      await(
        'string',
        'number',
        'boolean',
        'object',
        'function'
      )
      .keep('string', '')
      .keep('number', 0)
      .keep('boolean', false)
      .keep('object', {})
      .keep('function', function(){})
      .onkeep(function(got){
        Object.keys(got).forEach(function(type){
          assert.strictEqual(type, typeof got[type])
        })
      })
      await(
        'string',
        'number',
        'boolean',
        'object',
        'function'
      )
      .keep('string', 'sdf')
      .keep('number', 1)
      .keep('boolean', true)
      .keep('object', {foo:function(){}})
      .keep('function', function(){})
      .onkeep(function(got){
        Object.keys(got).forEach(function(type){
          assert.strictEqual(type, typeof got[type])
        })
      })
    })
  })

  // ###########################################################

  describe('fail and onfail', function(){

    it('should work synchronously', function(){
      var worked = false
      await('bar')
      .fail()
      .onfail(function(){ worked = true })
      assert.ok(worked)
    })

    it('should work asynchronously', function(done){
      await('bar')
      .run(function(prom){
        setTimeout(function(){ prom.fail() }, 0);
      })
      .onfail(function(){ done() })
    })

    it('should ignore multiple fails', function(){
      var worked = false
      await('bar')
      .fail()
      .fail()
      .fail()
      .onfail(function(){ worked = true })
      assert.ok(worked)
    })

    it('should pass all args to callback', function(){
      var args = [ 'foo', {}, 4 ];
      var prom = await('foo');
      prom.fail.apply(prom, args)
      .onfail(function(){
        var s1 = args.join()
        var s2 = Array.prototype.slice.call(arguments).join()
        assert.strictEqual(s1, s2, 'argument list does not match')
      })
    })
  })

  // ###########################################################

  describe('execution sequence', function(){

    it('should fire correct events in correct order on keep', function(){
      var seq = []
      await('bar')
      .keep('bar')
      .onkeep(function(){ seq.push('y') })
      .onfail(function(){ seq.push('x') })
      .onresolve(function(){ seq.push('e') })
      .onfail(function(){ seq.push('x') })
      .onkeep(function(){ seq.push('s') })
      assert.strictEqual(seq.join(''), 'yes')
    })

    it('should fire correct events in correct order on fail', function(){
      var seq = []
      await('bar')
      .fail('oops')
      .onfail(function(){ seq.push('y') })
      .onkeep(function(){ seq.push('x') })
      .onresolve(function(){ seq.push('e') })
      .onkeep(function(){ seq.push('x') })
      .onfail(function(){ seq.push('s') })
      assert.strictEqual(seq.join(''), 'yes')
    })

    it('should promote keep above fail', function(){
      var status = 'start';
      await('bar')
      .keep('bar')
      .fail('oops')
      .onfail(function(){ status = 'fail' })
      .onkeep(function(){ status = 'keep' })
      assert.strictEqual('keep', status);
    })
  })
})

















