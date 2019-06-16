const assert = require('chai').assert
const Promises = require('../lib/promises');

describe('promises',function(){
	
	before(function(done) {
		done();
	});
	
	after(function(done) {
		done();
	});
	
	var incrementingPromise = function( pData ) {
		return new Promise( function(resolve, reject) {
			resolve( pData + 1 );
		} );
	};
	
	var concatResultPromise = function() {
		return new Promise( function(resolve, reject) {
			resolve( 'foo' );
		} );
	}
	
	it('seq', function(done) {
		var oPromises = [];
		oPromises.push( incrementingPromise );
		oPromises.push( incrementingPromise );
		
		Promises.seq( oPromises, 0 ).then(function( data ) {
			assert.equal( data, 2);
			done();
		}, function (error) {
			done(error);
		});
	});

	it('seqConcatResults', function(done) {
		var oPromises = [];
		oPromises.push( concatResultPromise );
		oPromises.push( concatResultPromise );
		
		Promises.seqConcatResults( oPromises ).then(function( data ) {
			assert.isArray( data );
			assert.equal( data.length, 2);
			assert.deepEqual( data, [ 'foo', 'foo'] );
			done();
		}, function (error) {
			done(error);
		});
	});
	
	it('chainNoFunctions', function(done) {
		Promises.chain( [], 'Hello world!').then( function( data ) {
			//console.log('Done with: ' + data);
			done();
		}, function( error ) {
			done(error);
		});
	});
	
	it('chain', function(done) {
		var oDoneWithError = false;
		var oFuncs = [];
		var oFuncsCalled = 0;
		var oFunc1 = function( pValue ) { 
			//console.log('Func1: ');
			//console.dir( pValue );
			oFuncsCalled++;
			return Promise.resolve({ skip: false });
		};
		var oFunc2 = function( pValue ) {
			//console.log('Func2: ');
			//console.dir( pValue );
			oFuncsCalled++;
			return Promise.resolve({ skip: true });
		}
		var oFunc3 = function( pValue ) {
			oFuncsCalled++;
			oDoneWithError = true;
			done(new Error('Should not be reaching Func3'));
			//console.log('Func3: ');
			//console.dir( pValue );
			return Promise.reject('Should not have come here!');
		}
		oFuncs.push( oFunc1 );
		oFuncs.push( oFunc2 );
		oFuncs.push( oFunc3 );
		
		Promises.chain( oFuncs, 'Hello world!').then( function( data ) {
			//console.log('Done with: ' + data);
			try {
				assert.equal( oFuncsCalled, 2 );
				assert.isFalse( oDoneWithError );
				done();
			} catch ( error ) {
				done( error );
			} 
		}, function( error ) {
			if ( !oDoneWithError ) done(error);
		});
		
	});
	
	it('chainWithCustomCondition', function(done) {
		var oFunc3Reached = false;
		var oFunc2Reached = false;
		var oCustomSkipCondition = function( pValue ) {
			return ( pValue && pValue['skipMe'] );
		}
		var oFuncs = [];
		var oFunc1 = function( pValue ) { 
			//console.log('Func1: ');
			//console.dir( pValue );
			return Promise.resolve({ skip: true }); // making sure default skip condition not used
		};
		var oFunc2 = function( pValue ) {
			oFunc2Reached = true;
			//console.log('Func2: ');
			//console.dir( pValue );
			return Promise.resolve({ skipMe: true });
		}
		var oFunc3 = function( pValue ) {
			oFunc3Reached = true;
			//done(new Error('Should not be reaching Func3'));
			//console.log('Func3: ');
			//console.dir( pValue );
			return Promise.reject('Should not have come here!');
		}
		oFuncs.push( oFunc1 );
		oFuncs.push( oFunc2 );
		oFuncs.push( oFunc3 );
		
		Promises.chain( oFuncs, 'Hello world!', oCustomSkipCondition).then( function( data ) {
			//console.log('Done with: ' + data);
			if ( !oFunc2Reached ) done( new Error('Func2 should have been reached.') );
			else if ( oFunc3Reached ) done( new Error('Func3 has been reached and should have been skipped.') );
			else done();
		}, function( error ) {
			done( error );
		});
		
	});
	
	it('chainWithErrorInCustomCondition', function(done) {
		var oCustomSkipCondition = function( pValue ) {
			throw new Error("dummy error");
		}
		var oFuncs = [];
		var oFunc1 = function( pValue ) { 
			return Promise.resolve({}); // making sure default skip condition not used
		};
		oFuncs.push( oFunc1 );
		
		Promises.chain( oFuncs, 'Hello world!', oCustomSkipCondition).then( function( data ) {
			done("Expected rejection");
		}, function( error ) {
			done();
		});
		
	})
	
});
