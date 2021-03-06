import {Packet} from './packet.js';
import {Deferred} from './deferred.js';
import {actionIgnore, actionAutoID} from './actionid.js';
import {getSingleOption} from './get-single-option.js';
import {astTrue} from './ast-true.js';

export class Request {
	#ignoreInitialSuccess = false;
	#action;
	#actionid;
	#requestPacket;
	#options = {};
	#responses = [];
	#deferred = new Deferred();

	constructor(object, options = {}) {
		if (!object || typeof object !== 'object' || Object.keys(object).length === 0) {
			throw new TypeError('Must provide an object with keys');
		}

		this.#action = getSingleOption(object, 'action');
		if (this.#action.toLowerCase() === 'originate') {
			try {
				this.#ignoreInitialSuccess = astTrue(getSingleOption(object, 'async'));
			} catch {
			}
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
		if (this.#ignoreInitialSuccess && /Success/u.test(packet.asObject.response)) {
			this.#ignoreInitialSuccess = false;
			return false;
		}

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
		if (/(?:Error|Fail)/u.test(response.response || 'Success')) {
			return Object.assign(new Error(`${this.#action}: ${response.message || 'unknown error'}`), {request: this});
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
		return this.#responses[0]?.asObject;
	}

	get responsePackets() {
		return this.#responses;
	}

	get responsePacket() {
		return this.#responses[0];
	}
}
