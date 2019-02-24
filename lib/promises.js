const seqConcatResults = (funcs)  =>
	funcs.reduce((promise, func) =>
	  promise.then(result => func().then(Array.prototype.concat.bind(result))),
	  Promise.resolve([]));

const seq = (funcs, startingValue) =>
	funcs.reduce((promise, func) =>
	  promise.then(result => func(result)),
	  Promise.resolve(startingValue));

exports = module.exports = {
	seq: seq,
	seqConcatResults: seqConcatResults
}
