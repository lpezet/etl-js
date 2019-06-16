const SimpleLogger = require('./logger');

const DEFAULT_LOGGER = new SimpleLogger({ level: 'close' });

const seqConcatResults = (funcs)  =>
	funcs.reduce((promise, func) =>
	  promise.then(result => func().then(Array.prototype.concat.bind(result))),
	  Promise.resolve([]));

const seq = (funcs, startingValue) =>
	funcs.reduce((promise, func) =>
	  promise.then(result => func(result)),
	  Promise.resolve(startingValue));
	
var DEFAULT_SKIP_CONDITION = function( pValue, pChainName ) {
	return pValue && pValue['skip'];
}

var generate_name = function () {
	return 'xxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0; 
		var v = (c === 'x' ? r : (r & 0x3 | 0x8));
		return v.toString(16);
	});
}

try_log = function( pLogger ) {
	return !pLogger ? DEFAULT_LOGGER : pLogger;
}
	
var control_flow_wrapper = function( pIndex, pFunc, pSkipConditionEval, pOptions) {
	return function( pValue ) {
		var oLogger = try_log( pOptions && pOptions['logger']  );
		try {
			var oChainName = (pOptions && pOptions['name']);
			if ( !oChainName ) oChainName = generate_name();
			if ( oLogger['debug'] ) oLogger.debug("[chain::%s] Evaluating promise #%s with %j...", oChainName, pIndex, pValue);
			//var e = new Error();
			//console.dir(e);
			if ( pSkipConditionEval(pValue, oChainName) ) {
				if ( oLogger['debug'] ) oLogger.debug("[chain::%s] ...promise #%s skipped.", oChainName, pIndex);
				return Promise.resolve( pValue );
			}
			if ( oLogger['debug'] ) oLogger.debug("[chain::%s] ...executing promise #%s.", oChainName, pIndex);
			return pFunc( pValue );
		} catch ( pError ) {
			if ( oLogger['error'] ) oLogger.error("[chain::%s] ...Unexpected error (%s).", oChainName, pIndex, pError);
			//console.log( pError );
			//throw pError;
			return Promise.reject( pValue );
		}
	}
}
	
const chain = function( pFuncs, pStartingValue, pSkipConditionEval, pOptions ) {
	var wrapped_funcs = [];
	var oOptions = pOptions || {};
	var oSkipConditionEval = pSkipConditionEval;
	if ( pSkipConditionEval === undefined || pSkipConditionEval === null) oSkipConditionEval = DEFAULT_SKIP_CONDITION;
	if ( Array.isArray( pFuncs ) ) {
		for (var i in pFuncs) wrapped_funcs.push( control_flow_wrapper( i, pFuncs[i], oSkipConditionEval, oOptions ) );
	} else {
		wrapped_funcs.push( control_flow_wrapper( pFuncs, oSkipConditionEval, oOptions ) );
	}
	var promise = (wrapped_funcs.length === 0) ? Promise.resolve( oOptions['defaultResolveValue'] || {} ) : wrapped_funcs[0]( pStartingValue );
	for (var i = 1; i < wrapped_funcs.length; i++) {
			promise = promise.then( wrapped_funcs[i] );
	}
	
	return promise;
}

exports = module.exports = {
	seq: seq,
	seqConcatResults: seqConcatResults,
	chain: chain
}
