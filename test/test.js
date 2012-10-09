var assert = require("assert")
var await = require('../await.js').await

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

    it('should throw error with dupe keeps', function(){
      var worked = false
      try {
        await('foo').keep('foo').keep('foo')
      } catch (e) {
        worked = true
      }
      assert.ok(worked);
    })

    it('should throw error with unknown keep', function(){
      var worked = false
      try {
        await('foo').keep('bar')
      } catch (e) {
        worked = true
      }
      assert.ok(worked);
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

  describe('factory function', function(){

    it('should construct on an array', function(){
      var worked = false
      await(['foo','bar'])
      .keep('foo')
      .keep('bar')
      .onkeep(function(){ worked = true })
      assert.ok(worked)
    })

    it('should construct on strings', function(){
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

    it('should fail with the new keyword', function(){
      var worked = false
      try { new await() }
      catch (err) { worked = true }
      assert.ok(worked)
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

    it('should accept all data types', function(){
      await(
        'string',
        'number',
        'boolean',
        'object',
        'function'
      ).run(function(prom){
        prom.keep('string', '');
        prom.keep('number', 0);
        prom.keep('boolean', false);
        prom.keep('object', {});
        prom.keep('function', function(){});
      })
      .onkeep(function(got){
        Object.keys(got).forEach(function(type){
          assert.strictEqual(type, typeof got[type], type+' not equal to got type')
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

















