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

// MOCHA TESTS
// http://visionmedia.github.com/mocha/

var assert = require("assert")
var await = require('../await')
var Q = require('q')

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

    it('should work', function(done){
      await('foo').keep('foo').onkeep(function(){ done() })
    })

    it('should not fire keep before return', function(){
      var async = true
      await('foo').keep('foo').onkeep(function(){ async = false })
      assert.ok(async)
    })

    it('should accept a context for the callback', function(done){
      var ref1 = {};
      await('foo').keep('foo').onkeep(function(){
        assert.strictEqual(ref1, this)
        done()
      }, ref1);
    })
  })

  // ###########################################################

  describe('#onfail()', function(){

    it('should be chainable', function(){
      var ref1 = await();
      var ref2 = ref1.onfail(function(){});
      assert.strictEqual(ref1, ref2)
    })

    it('should work', function(done){
      await('foo').fail().onfail(function(){
        done()
      })
    })

    it('should not fire onfail before returning', function(){
      var async = true
      await('foo').fail().onfail(function(){ async = false })
      assert.ok(async)
    })

    it('should accept a context for the callback', function(done){
      var ref1 = {};
      await('foo').fail().onfail(function(){
        assert.strictEqual(ref1, this)
        done()
      }, ref1);
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
      await('foo').keep('foo').onresolve(done)
    })

    it('should happen on fail', function(done){
      await('foo').fail().onresolve(done)
    })

    it('should accept a context for the callback', function(done){
      var ref1 = {};
      await('foo').keep('foo').onkeep(function(){
        assert.strictEqual(ref1, this)
        done()
      }, ref1);
    })

    it('should accept a context for the callback', function(done){
      var ref1 = {};
      await('foo').keep('foo').onresolve(function(){
        assert.strictEqual(ref1, this)
        done()
      }, ref1);
    })
  })

  // ###########################################################

  describe('#onprogress()', function(){

    it('should be chainable', function(){
      var ref1 = await();
      var ref2 = ref1.onprogress(function(){});
      assert.strictEqual(ref1, ref2)
    })

    it('should work', function(done){
      var amounts1 = []
      var amounts2 = []
      await('foo','bar')
      .onprogress(function(prog){
        amounts1.push(prog.foo)
        amounts2.push(prog.bar)
      })
      .progress('foo',.3)
      .progress('foo',.6)
      .progress('bar',.2)
      .progress('bar',.5)
      .progress('bar',.7)
      .keep('foo')
      .keep('bar')
      .onkeep(function(){
        try {
          var joined1 = amounts1.join(',')
          var joined2 = amounts2.join(',')
          assert.strictEqual(joined1, '0.3,0.6,0.6,0.6,0.6')
          assert.strictEqual(joined2, '0,0,0.2,0.5,0.7')
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should not call onprogress set after progress events', function(done){
      var amounts = []
      await('foo')
      .progress('foo',.3)
      .progress('foo',.6)
      .onprogress(function(prog){
        done(new Error('progress should not be called here'))
      })
      .keep('foo')
      .onkeep(function(){
        done()
      })
    })

    it('should not call onprogress set after keep', function(done){
      var amounts = []
      await('foo')
      .keep('foo')
      .onprogress(function(prog){
        done(new Error('progress should not be called here'))
      })
      .progress('foo',.3)
      .progress('foo',.6)
      .onkeep(function(){
        done()
      })
    })
  })

  // ###########################################################

  describe('#keep()', function(){

    it('should be chainable', function(){
      var ref1 = await('foo');
      var ref2 = ref1.keep('foo');
      assert.strictEqual(ref1, ref2)
    })

    it('should work', function(done){
      await('foo').keep('foo').onkeep(function(){
        done()
      })
    })

    it('should only work when supposed to', function(done){
      await('foo').onkeep(function(){
        try {
          assert.ok(false)
        } catch(ex) {
          done(ex)
        }
      })
      setTimeout(done, 1)
    })

    it('should take first keep of dupe keeps', function(done){
      await('foo').keep('foo','x').keep('foo','y')
      .onkeep(function(got){
        assert.strictEqual(got.foo, 'x')
        done()
      })
    })

    it('should not throw error with dupe keeps', function(){
      await('foo').keep('foo').keep('foo')
    })

    it('should accept unknown keep', function(done){
      await('foo').keep('foo').keep('bar','x')
      .onkeep(function(got){
        try {
          assert.strictEqual(got.bar, 'x')
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })
  })

  // ###########################################################

  describe('#fail()', function(){
    it('should be chainable', function(){
      var ref1 = await();
      var ref2 = ref1.fail();
      assert.strictEqual(ref1, ref2)
    })

    it('should work', function(done){
      await('foo').fail().onfail(function(){
        done()
      })
    })
  })

  // ###########################################################

  describe('#progress()', function(){
    it('should be chainable', function(){
      var ref1 = await('foo');
      var ref2 = ref1.progress('foo',.2);
      assert.strictEqual(ref1, ref2)
    })

    it('should work', function(done){
      await('foo')
      .onprogress(function(prog){
        try {
          assert.strictEqual(prog.foo, .1)
          done()
        } catch(ex) {
          done(ex)
        }
      })
      .progress('foo',.1)
    })

    it('should accept an object with multiple values', function(done){
      var amounts1 = []
      var amounts2 = []
      await('foo','bar')
      .onprogress(function(prog){
        amounts1.push(prog.foo)
        amounts2.push(prog.bar)
      })
      .progress({foo:.3,bar:.2})
      .progress({foo:.6,bar:.5})
      .progress({bar:.7})
      .keep('foo')
      .keep('bar')
      .onkeep(function(){
        try {
          var joined1 = amounts1.join(',')
          var joined2 = amounts2.join(',')
          assert.strictEqual(joined1, '0.3,0.6,0.6')
          assert.strictEqual(joined2, '0.2,0.5,0.7')
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })
  })

  // ###########################################################

  describe('#failer()', function(){
    it('should work', function(done){
      var p1 = await('a')
      var p2 = await('b')
      var err = new Error()
      p2.onfail(p1.failer())
      p2.fail(err)
      p1.onfail(function(reason){
        try {
          assert.strictEqual(err,reason)
          done()
        } catch(ex) {
          done(ex)
        }
      })
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
        done(new Error())
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

    it('should work with a callback', function(done){
      var prom = await('one')
      fakeNodeMethod(prom.nodify(function(){
        prom.keep('one')
      }))
      prom.onkeep(function(got){
        done()
      })
      prom.onfail(function(){
        done(new Error('Unexpected failure'))
      })
    })

    it('should work with a callback and context', function(done){
      var prom = await('one')
      fakeNodeMethod(prom.nodify(function(){
        if (this.foo === 'bar') {
          prom.keep('one')
        } else {
          prom.fail(new Error('Wrong context'))
        }
      }, {foo:'bar'}))
      prom.onkeep(function(got){
        done()
      })
      prom.onfail(function(err){
        done(err)
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

    it('should work', function(done){
      var p1 = await('foo')
      var p2 = await('foo')
      p1.take(p2)
      p2.keep('foo')
      p1.onkeep(function(){
        done()
      })
    })

    it('should take intersection', function(done){
      var p1 = await('foo','bar')
      var p2 = await('foo','baz')
      p1.take(p2).keep('bar')
      p2.keep('foo').keep('baz')
      p1.onkeep(function(){
        done()
      })
    })

    it('should allow mapping', function(done){
      var p1 = await('foo','bar')
      var p2 = await('foo','baz')
      p1.take(p2, {'baz':'bar'})
      p2.keep('foo').keep('baz')
      p1.onkeep(function(){
        done()
      })
    })

    it('should favor mappings over direct matches', function(done){
      var p1 = await('foo','bar')
      var p2 = await('foo','bar','baz')
      p1.take(p2, {'baz':'bar'})
      p2.keep('foo','foo').keep('bar','bar').keep('baz','baz')
      p1.onkeep(function(got){
        assert.strictEqual(got.foo, 'foo')
        assert.strictEqual(got.bar, 'baz')
        done()
      })
    })

    it('should chain failures too', function(done){
      var err = 'oops'
      var p1 = await('foo')
      var p2 = await('foo')
      p1.take(p2)
      p2.fail(err)
      p1.onfail(function(mess){
        assert.strictEqual(err, mess)
        done()
      })
    })

    it('should take fulfilled thenables', function(done){
      var t = Q.fcall(function(){
        return 1
      })
      await('foo').take(t, 'foo')
      .onkeep(function(got){
        assert.strictEqual(got.foo, 1)
        done()
      })
    })

    it('should take rejected thenables', function(done){
      var err = new Error()
      var t = Q.fcall(function(){
        throw err
      })
      await('foo').take(t, 'foo')
      .onfail(function(reason){
        assert.strictEqual(reason, err)
        done()
      })
    })
  })

  // ###########################################################

  describe('#map()', function(){

    it('should work for single-item promises', function(done){
      var p1 = await('foo')
      var p2 = p1.map({'foo':'bar'})
      p1.keep('foo','yes')
      p2.onkeep(function(got){
        assert.strictEqual(got.bar,'yes')
        done()
      })
    })

    it('should only pass the mapped item', function(done){
      var p1 = await('foo')
      var p2 = p1.map({'foo':'bar'})
      p1.keep('foo','yes')
      p2.onkeep(function(got){
        assert.strictEqual(got.bar,'yes')
        assert.strictEqual(Object.keys(got).length,1)
        done()
      })
    })

    it('should work for multi-item promises', function(done){
      var p1 = await('foo','baz')
      var p2 = p1.map({'foo':'bar','baz':'qux'})
      p1.keep('foo','yes')
      p1.keep('baz','yes')
      p2.onkeep(function(got){
        assert.strictEqual(got.bar,'yes')
        assert.strictEqual(got.qux,'yes')
        done()
      })
    })

    it('should work for partial mappings', function(done){
      var p1 = await('foo','baz')
      var p2 = p1.map({'foo':'bar'})
      p1.keep('foo','yes')
      p1.keep('baz','yes')
      p2.onkeep(function(got){
        assert.strictEqual(got.bar,'yes')
        assert.strictEqual(got.baz,'yes')
        done()
      })
    })

    it('should work for empty mappings', function(done){
      var p1 = await('foo','baz')
      var p2 = p1.map({})
      p1.keep('foo','yes')
      p1.keep('baz','yes')
      p2.onkeep(function(got){
        assert.strictEqual(got.foo,'yes')
        assert.strictEqual(got.baz,'yes')
        done()
      })
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

  describe('#_buildState()', function(){

    it('should work', function(done){
      await()._buildState('foo').keep('foo','x')
      .onkeep(function(got){
        assert.strictEqual(got.foo, 'x')
        done()
      })
    })

    it('should be chainable', function(){
      var r1 = await()
      var r2 = r1._buildState('foo')
      assert.strictEqual(r1,r2)
    })

    it('should allow _buildState() on empty promises', function(){
      await()._buildState('foo')
    })

    it('should disallow _buildState() on non-empty promises', function(){
      try {
        await('foo')._buildState('foo')
        assert.ok(false)
      } catch(ex) {}
    })
  })

  // ###########################################################

  describe('factory function', function(){

    it('should use series of strings', function(done){
      await('foo','bar')
      .keep('foo')
      .keep('bar')
      .onkeep(function(){
        done()
      })
    })

    it('should coerce args to strings', function(done){
      await({})
      .keep('[object Object]')
      .onkeep(function(){
        done()
      })
    })

    it('should not keep immediately with no arguments', function(done){
      await()
      .onkeep(function(){
        done(new Error())
      })
      setTimeout(done,1)
    })

    it('should be fast', function(){

      // Obviously this is subjective. This is just a way
      // to alert me if it starts to run slower. The
      // threshold was determined by finding a speed at
      // which it failed ~half the time, then doubling it.
      // If it fails illegitimately, just bump up the
      // threshold or consider removing this test.

      var threshold = 186
      var startTime = new Date().getTime()
      for (var i=0; i<10000; i++){
        await('foo','bar','baz')
        .run(function(){})
        .onkeep(function(){})
        .onfail(function(){})
        .onresolve(function(){})
        .keep('foo')
        .keep('bar')
        .keep('baz')
      }
      var endTime = new Date().getTime()
      var duration = endTime - startTime
      assert.ok(duration < threshold)
    })
  })

  // ###########################################################

  describe('grouping', function(){

    it('should not group promises synchronously', function(){
      var worked = true;
      var p1 = await('foo','bar').keep('foo').keep('bar')
      var p2 = await('baz').keep('baz')
      await(p1, p2)
      .onkeep(function(got){
        assert.ok(got.hasOwnProperty('foo'))
        assert.ok(got.hasOwnProperty('bar'))
        assert.ok(got.hasOwnProperty('baz'))
        worked = false
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

    it('should group promises using mapping', function(done){
      var p1 = await('foo').keep('foo')
      var p2 = await('foo').keep('foo')
      await(p1, p2.map({'foo':'bar'}))
      .onkeep(function(got){
        assert.ok(got.hasOwnProperty('foo'))
        assert.ok(got.hasOwnProperty('bar'))
        done()
      })
    })
  })

  // ###########################################################

  describe('listing', function(){

    it('should not group promises by list synchronously', function(){
      var worked = true
      await.all([
        await('foo').keep('foo'),
        await('bar').keep('bar'),
        await('baz').keep('baz')
      ])
      .onkeep(function(){
        worked = false
      })
      assert.ok(worked)
    })

    it('should return the list', function(done){
      await.all([
        await('foo').keep('foo'),
        await('bar').keep('bar'),
        await('baz').keep('baz')
      ])
      .onkeep(function(got){
        assert.strictEqual(got.length, 3)
        done()
      })
    })

    it('should group promises by list asynchronously', function(done){
      var p1 = await('x')
      setTimeout(function(){ p1.keep('x') }, 0)
      var p2 = await('x')
      setTimeout(function(){ p2.keep('x') }, 0)
      var p3 = await('x')
      setTimeout(function(){ p3.keep('x') }, 0)

      await.all([p1, p2, p3])
      .onkeep(function(){ done() })
    })

    it('should fail properly', function(done){
      var p1 = await('x')
      p1.fail('fake fail')
      var p2 = await('x')
      setTimeout(function(){ p2.keep('x') }, 0)
      await.all([p1, p2])
      .onfail(function(){ done() })
    })

    it('should work immediately for empty lists', function(done){
      await.all([])
      .onkeep(function(got){
        try {
          assert.strictEqual(got.length, 0)
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should got a list of subgots', function(done){
      var proms = [
        await('foo').run(function(p){ setTimeout(function(){ p.keep('foo','a'); }, Math.floor(Math.random() * 33)) }),
        await('foo').run(function(p){ setTimeout(function(){ p.keep('foo','b'); }, Math.floor(Math.random() * 33)) }),
        await('foo').run(function(p){ setTimeout(function(){ p.keep('foo','c'); }, Math.floor(Math.random() * 33)) })
      ]
      await.all(proms)
      .onkeep(function(got){
        try {
          assert.strictEqual(got[0].foo, 'a')
          assert.strictEqual(got[1].foo, 'b')
          assert.strictEqual(got[2].foo, 'c')
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })
  })

  // ###########################################################

  describe('gotten class', function(){

    it('should have method "forEach"', function(done){
      var proms = [
        await('foo').keep('foo', 0),
        await('foo').keep('foo', 1),
        await('foo').keep('foo', 2)
      ]
      await.all(proms).onkeep(function(gots){
        try {
          gots.forEach(function(got, idx){
            assert.strictEqual(got.foo, idx)
          })
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should have method "map"', function(done){
      var proms = [
        await('foo').keep('foo', 0),
        await('foo').keep('foo', 1),
        await('foo').keep('foo', 2)
      ]
      await.all(proms).onkeep(function(gots){
        try {
          var vals = gots.map(function(got){
            return got.foo
          }).join(',')
          assert.strictEqual(vals, '0,1,2')
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should have method "some"', function(done){
      var proms = [
        await('foo').keep('foo', 0),
        await('foo').keep('foo', 1),
        await('foo').keep('foo', 2)
      ]
      await.all(proms).onkeep(function(gots){
        try {
          var has0 = gots.some(function(got){
            return got.foo === 0
          })
          var has5 = gots.some(function(got){
            return got.foo === 5
          })
          assert.ok(has0)
          assert.ok(!has5)
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should have method "every"', function(done){
      var proms = [
        await('foo').keep('foo', 0),
        await('foo').keep('foo', 1),
        await('foo').keep('foo', 2)
      ]
      await.all(proms).onkeep(function(gots){
        try {
          var allNums = gots.every(function(got){
            return typeof got.foo === 'number'
          })
          var noNums = gots.every(function(got){
            return typeof got.foo !== 'number'
          })
          assert.ok(allNums)
          assert.ok(!noNums)
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should have method "reduce"', function(done){
      var proms = [
        await('foo').keep('foo', 0),
        await('foo').keep('foo', 1),
        await('foo').keep('foo', 2)
      ]
      await.all(proms).onkeep(function(gots){
        try {
          var sum = gots.reduce(function(tally, got){
            return tally + got.foo
          }, 0)
          assert.strictEqual(sum, 3)
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should have method "slice"', function(done){
      var proms = [
        await('foo').keep('foo', 0),
        await('foo').keep('foo', 1),
        await('foo').keep('foo', 2)
      ]
      await.all(proms).onkeep(function(gots){
        try {
          var copy = gots.slice()
          assert.ok(copy !== gots)
          assert.strictEqual(copy.map(function(got){return got.foo}).join(','), '0,1,2')

          var copy2 = gots.slice(0,2)
          assert.ok(copy2 !== gots)
          assert.strictEqual(copy2.map(function(got){return got.foo}).join(','), '0,1')
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should have method "join"', function(done){
      var proms = [
        await('foo').keep('foo', 0),
        await('foo').keep('foo', 1),
        await('foo').keep('foo', 2)
      ]
      await.all(proms).onkeep(function(gots){
        try {
          var joined = gots.join(',')
          assert.strictEqual(joined, '[object Object],[object Object],[object Object]')
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should have method "keys"', function(done){
      await('foo','bar').keep('foo').keep('bar')
      .onkeep(function(got){
        try {
          var keys = got.keys()
          assert.ok(keys.length,2)
          assert.ok(keys.indexOf('foo') !== -1)
          assert.ok(keys.indexOf('bar') !== -1)
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should have method "values"', function(done){
      await('foo','bar').keep('foo','a').keep('bar','b')
      .onkeep(function(got){
        try {
          var values = got.values()
          assert.ok(values.length,2)
          assert.ok(values.indexOf('a') !== -1)
          assert.ok(values.indexOf('b') !== -1)
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })
  })

  // ###########################################################

  describe('keep and onkeep', function(){

    it('should not support the single-var case, synchronously', function(){
      var worked = true
      await('foo').keep('foo')
      .onkeep(function(){ worked = false })
      assert.ok(worked)
    })

    it('should not support the many-var case, synchronously', function(){
      var worked = true
      await('foo','bar')
      .keep('foo')
      .keep('bar')
      .onkeep(function(){ worked = false })
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

    it('should not work synchronously', function(){
      var worked = true
      await('bar')
      .fail()
      .onfail(function(){ worked = false })
      assert.ok(worked)
    })

    it('should work asynchronously', function(done){
      await('bar')
      .run(function(prom){
        setTimeout(function(){ prom.fail() }, 0);
      })
      .onfail(function(){ done() })
    })

    it('should ignore multiple fails', function(done){
      var failCalls = 0
      await('bar')
      .fail()
      .fail()
      .fail()
      .onfail(function(){ failCalls++ })
      setTimeout(function(){
        assert.strictEqual(failCalls, 1)
        done()
      },1)
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

  describe('sequence', function(){

    it('should fire correct events in correct order on keep', function(done){
      var seq = []
      await('bar')
      .keep('bar')
      .onkeep(function(){ seq.push('y') })
      .onfail(function(){ seq.push('x') })
      .onresolve(function(){ seq.push('e') })
      .onfail(function(){ seq.push('x') })
      .onkeep(function(){ seq.push('s') })
      setTimeout(function(){
        assert.strictEqual(seq.join(''), 'yes')
        done()
      },1)
    })

    it('should fire correct events in correct order on fail', function(done){
      var seq = []
      await('bar')
      .fail('oops')
      .onfail(function(){ seq.push('y') })
      .onkeep(function(){ seq.push('x') })
      .onresolve(function(){ seq.push('e') })
      .onkeep(function(){ seq.push('x') })
      .onfail(function(){ seq.push('s') })
      setTimeout(function(){
        assert.strictEqual(seq.join(''), 'yes')
        done()
      },1)
    })

    it('should promote keep above fail', function(done){
      var status = 'start';
      await('bar')
      .keep('bar')
      .fail('oops')
      .onfail(function(){ status = 'fail' })
      .onkeep(function(){ status = 'keep' })
      setTimeout(function(){
        assert.strictEqual('keep', status);
        done()
      },1)
    })
  })

  // ###########################################################

  describe('prototype', function(){

    it('should be an instance of await', function(){
      assert.ok(await() instanceof await)
    })
  })

  // ###########################################################

  describe('#then()', function(){

    it('should exist', function(){
      assert.ok(typeof await().then === 'function')
    })

    it('should call onfulfilled when fulfilled', function(done){
      await('foo').keep('foo').then(function(val){
        done()
      },function(){})
    })

    it('should call onrejected when rejected', function(done){
      await('foo').fail().then(function(){},function(val){
        done()
      })
    })

    it('should not call onrejected when fulfilled', function(done){
      await('foo').keep('foo').then(function(){},function(){
        done(new Error())
      })
      setTimeout(done,1)
    })

    it('should not call onfulfilled when rejected', function(done){
      await('foo').fail().then(function(){
        done(new Error())
      },function(){})
      setTimeout(done,1)
    })

    it('should pass "got" as the fulfillment value', function(done){
      await('foo').keep('foo','x').then(function(got){
        assert.strictEqual(got.foo, 'x')
        done()
      })
    })

    it('should pass the reason to onrejected', function(done){
      await('foo').fail('x').then(null,function(reason){
        assert.strictEqual(reason, 'x')
        done()
      })
    })

    it('should ignore args that are not functions', function(done){
      await('foo').keep('foo').then(null, null)
      await('foo').fail().then(null, null)
      setTimeout(done,1)
    })

    it('should not call onfulfilled more than once', function(done){
      var calls = 0
      await('foo')
      .keep('foo')
      .keep('foo')
      .keep('foo')
      .then(function(){ calls++; })
      setTimeout(function(){
        assert.strictEqual(calls,1)
        done()
      },1)
    })

    it('should not call onrejected more than once', function(done){
      var calls = 0
      await('foo')
      .fail()
      .fail()
      .fail()
      .then(null,function(){ calls++; })
      setTimeout(function(){
        assert.strictEqual(calls,1)
        done()
      },1)
    })

    it('should return before onfulfilled is called', function(done){
      var order = []
      await('foo')
      .keep('foo')
      .then(function(){
        order.push('then')
      })
      order.push('now')
      setTimeout(function(){
        try {
          assert.strictEqual(order.join(','), 'now,then')
          done()
        } catch(ex) {
          done(ex)
        }
      },1)
    })

    it('should be callable multiple times', function(done){
      var calls = 0

      var p1 = await('foo').keep('foo','x')
      p1.then(function(got){ calls++ })
      p1.then(function(got){ calls++ })
      p1.then(function(got){ calls++ })

      var p2 = await('foo').fail()
      p2.then(null, function(got){ calls++ })
      p2.then(null, function(got){ calls++ })
      p2.then(null, function(got){ calls++ })

      setTimeout(function(){
        try {
          assert.strictEqual(calls, 6)
          done()
        } catch(ex) {
          done(ex)
        }
      },1)
    })

    it('should be called in the order given', function(done){
      var order = ''

      var p1 = await('foo').keep('foo','x')
      p1.then(function(got){ order += 'y' })
      p1.then(function(got){ order += 'e' })
      p1.then(function(got){ order += 's' })

      p1.then(function(){
        var p2 = await('foo').fail()
        p2.then(null, function(got){ order += 's' })
        p2.then(null, function(got){ order += 'i' })
        p2.then(null, function(got){ order += 'r' })

        setTimeout(function(){
          try {
            assert.strictEqual(order, 'yessir')
            done()
          } catch(ex) {
            done(ex)
          }
        },1)
      })
    })

    it('should return a promise', function(){
      assert.ok(await().then() instanceof await)
    })

    it('should return a promise which assumes the eventual state of a promise returned from onfulfilled', function(done){
      var p2 = await('foo').keep('foo','x')
      .then(function(got){
        return await('bar').keep('bar','x')
      })
      .then(function(got){
        try {
          assert.strictEqual(got.bar, 'x')
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should return a promise which keeps on a non-promise value returned from onfulfilled', function(done){
      var p2 = await('foo').keep('foo','x')
      .then(function(got){
        assert.strictEqual(got.foo, 'x')
        return 'foo'
      })
      p2.then(function(got){
        try {
          assert.strictEqual(got.value, 'foo')
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should return a promise which assumes the eventual state of a promise returned from onrejected', function(done){
      var p2 = await('foo').fail('x')
      .then(null,function(err){
        return await('bar').keep('bar','x')
      })
      p2.then(function(got){
        try {
          assert.strictEqual(got.bar, 'x')
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should return a promise which keeps on a non-promise value returned from onrejected', function(done){
      var p2 = await('foo').fail('x')
      .then(null,function(err){
        return 'x'
      })
      p2.then(function(got){
        try {
          assert.strictEqual(got.value, 'x')
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should reject the returned promise if onfulfilled throws an exception', function(done){
      var err1 = new Error()
      await('foo').keep('foo')
      .then(function(){
        throw err1
      })
      .then(null, function(err2){
        try {
          assert.strictEqual(err1, err2)
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should reject the returned promise if onrejected throws an exception', function(done){
      var err1 = new Error()
      await('foo').fail()
      .then(null, function(){
        throw err1
      })
      .then(null, function(err2){
        try {
          assert.strictEqual(err1, err2)
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should fulfill the returned promise based on current promise if onfulfilled is not provided', function(done){
      await('foo').keep('foo','x')
      .then()
      .then(function(got){
        try {
          assert.strictEqual(got.foo, 'x')
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should reject the returned promise based on current promise if onrejected is not provided', function(done){
      var err1 = new Error();
      await('foo').fail(err1)
      .then()
      .then(null, function(err2){
        try {
          assert.strictEqual(err1, err2)
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should have a convenience method called catch', function(done){
      var err1 = new Error();
      await('foo').fail(err1)
      .then(function(){
        return 7;
      })
      .then(function(){
        return 'x';
      })
      .catch(function(err2){
        try {
          assert.strictEqual(err1, err2)
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should accumulate over multiple calls to then', function(done){
      await('foo').keep('foo','foo')
      .then(function(){
        return await('bar').keep('bar','bar')
      })
      .then(function(){
        return await('baz').keep('baz','baz')
      })
      .then(function(got){
        try {
          assert.strictEqual(got.foo, 'foo')
          assert.strictEqual(got.bar, 'bar')
          assert.strictEqual(got.baz, 'baz')
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should fail properly while accumulating over multiple calls to then', function(done){
      var err = new Error()
      await('foo')
      .fail(err)
      .then(function(){
        return await('bar').keep('bar','bar')
      })
      .then(function(){
        return await('baz').keep('baz','baz')
      })
      .then(function(got){
        done(new Error('did not catch error'))
      })
      .catch(function(reason){
        try {
          assert.strictEqual(reason, err)
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })

    it('should call onprogress on progress', function(done){
      var amounts = [];
      var p = await('foo','bar','baz','qux')
      p.then(null,null,function(amount){
        amounts.push(amount)
      })
      p
      .progress('foo',.5)
      .progress('bar',.5)
      .progress('foo',1)
      .progress('bar',1)
      .progress('baz',1)
      .keep('foo')
      .keep('bar')
      .keep('baz')
      .keep('qux')
      .onkeep(function(){
        try{
          assert.strictEqual(amounts.length, 5)
          var joined = amounts.join(',')
          assert.strictEqual(joined, '0.125,0.25,0.375,0.5,0.75')
          done()
        } catch(ex) {
          done(ex)
        }
      })
    })
  })
})

















