import {Packet} from './packet.js';
import {Deferred} from './deferred.js';
import {actionIgnore, actionAutoID} from './actionid.js';

export class Request {
	#actionid;
	#requestPacket;
	#options = {};
	#responses = [];
	#deferred = new Deferred();

	constructor(object, options = {}) {
		if (!object || typeof object !== 'object' || Object.keys(object).length === 0) {
			throw new TypeError('Must provide an object with keys');
		}

		this.#options = {
			resolveKind: 'response',
			ignoreResponse: false,
			...options
		};

		this.#actionid = options.ignoreResponse ? actionIgnore : actionAutoID();
		this.#requestPacket = new Packet({...object, actionid: this.#actionid});
	}

	toString() {
		return this.#requestPacket.toString();
	}

	handleError(error) {
		this.#deferred.reject(error);
	}

	handleResponse(packet) {
		this.#responses.push(packet);
		if (!this.callbackResponseDone()) {
			return false;
		}

		const error = this.callbackResponseError();
		if (error) {
			this.handleError(error);
		} else {
			this.#deferred.resolve(this[this.#options.resolveKind]);
		}

		return true;
	}

	callbackResponseError() {
		const {response} = this;
		if (/Error/u.test(response.response || 'Success')) {
			return Object.assign(new Error(response.message || 'AMI action error'), {request: this});
		}
	}

	callbackResponseDone() {
		if (this.#responses[0].asObject.eventlist === undefined) {
			return true;
		}

		const {eventlist} = this.#responses[this.#responses.length - 1].asObject;
		return eventlist !== undefined && eventlist.toLowerCase() !== 'start';
	}

	sendTo(socket) {
		socket.write(this.toString());
		if (this.ignoreResponse) {
			this.#deferred.resolve();
		}
	}

	get ignoreResponse() {
		return this.#options.ignoreResponse;
	}

	get actionid() {
		return this.#actionid;
	}

	get promise() {
		return this.#deferred.promise;
	}

	get responses() {
		return this.#responses.map(p => p.asObject);
	}

	get response() {
		const [resp] = this.#responses;
		return resp && resp.asObject;
	}

	get responsePackets() {
		return this.#responses;
	}

	get responsePacket() {
		return this.#responses[0];
	}
}
