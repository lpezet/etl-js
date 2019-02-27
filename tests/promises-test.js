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
	
});
