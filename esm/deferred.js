export class Deferred {
	resolve;
	reject;
	promise = new Promise((resolve, reject) => {
		this.resolve = resolve;
		this.reject = reject;
	});
}
