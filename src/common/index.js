export const AsyncHandler = promise => promise.then(result => [null, result]).catch(err => [err]);
