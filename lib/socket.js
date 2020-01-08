import EventEmitter from 'events';
import {createConnection} from 'net';

import {Packet} from './packet.js';
import {Request} from './request.js';
import * as regrets from './regrets.js';
import {actionIgnore} from './actionid.js';

const forwardSocketEvents = [
	'close',
	'drain',
	'end',
	'error',
	'lookup',
	'ready'
];

const disconnectedState = () => ({
	connected: false,
	authenticated: false,
	fullyBooted: undefined,
	amiVersion: undefined
});

export class Socket extends EventEmitter {
	#initialRequests = [];
	#connectionState = disconnectedState();

	#options = {
		connect: {
			host: 'localhost',
			port: 5038
		},
		credentials: {
			username: 'local',
			secret: 'local'
		},
		events: true,
		ping: false
	};

	constructor(options = {}) {
		super();

		Object.assign(this.#options, options);
	}

	get amiVersion() {
		return this.#connectionState.amiVersion;
	}

	get connected() {
		return this.#connectionState.connected;
	}

	get authenticated() {
		return this.#connectionState.authenticated;
	}

	async connect() {
		if (this.#connectionState.socket) {
			throw new Error('Disconnect first');
		}

		const connectError = () => socket.emit('close', true);
		const socket = createConnection(this.#options.connect);
		this.once('error', connectError);

		const {credentials, events} = this.#options;
		const connectionState = {
			buffer: '',
			socket,
			connected: false,
			amiVersion: undefined,
			loginRequest: new Request({
				action: 'login',
				...credentials,
				events
			}),
			authenticated: false,
			pending: new Map()
		};
		this.#connectionState = connectionState;
		socket.setEncoding('utf8');
		socket.setNoDelay(true);
		socket.setKeepAlive(true, 1000);
		for (const event of forwardSocketEvents) {
			socket.on(event, (...args) => this.emit(event, ...args));
		}

		socket.on('ready', () => {
			this.removeListener('error', connectError);
			connectionState.connected = true;
		});

		socket.on('data', data => {
			/* c8 ignore next */
			if (this.#connectionState !== connectionState) {
				/* c8 ignore next */
				try {
					/* c8 ignore next */
					socket.destroy();
					/* c8 ignore next */
				} catch {
					/* c8 ignore next */
				}
				/* c8 ignore next */

				/* c8 ignore next */
				return;
				/* c8 ignore next */
			}

			connectionState.buffer += data;
			if (!connectionState.amiVersion) {
				/* c8 ignore next */
				if (!regrets.crlf.test(connectionState.buffer)) {
					/* c8 ignore next */
					return;
					/* c8 ignore next */
				}

				let welcome;
				[welcome, connectionState.buffer] = connectionState.buffer
					.split(regrets.splitFirstLine).slice(1);
				const welcomePrefix = 'Asterisk Call Manager/';
				/* c8 ignore next */
				if (!welcome.startsWith(welcomePrefix)) {
					/* c8 ignore next */
					socket.destroy();
					/* c8 ignore next */
					return;
					/* c8 ignore next */
				}

				connectionState.amiVersion = welcome.replace(welcomePrefix, '');

				this._sendLogin();
			}

			const rawPackets = connectionState.buffer.split(regrets.crlf2x);
			connectionState.buffer = rawPackets.pop();
			for (const raw of rawPackets) {
				this._handlePacket(new Packet(raw));
			}
		});

		socket.on('close', hadError => {
			const disconnected = new Error(hadError ? 'Connection Error' : 'Disconnected');
			if (hadError) {
				connectionState.loginRequest.handleError(disconnected);
			}

			for (const pending of connectionState.pending.values()) {
				pending.handleError(disconnected);
			}

			for (const initial of this.#initialRequests) {
				initial.handleError(disconnected);
			}

			this.#initialRequests = [];
		});

		await connectionState.loginRequest.promise;
		connectionState.authenticated = true;
		connectionState.loginRequest = undefined;

		const initialRequests = this.#initialRequests;
		this.#initialRequests = [];
		for (const request of initialRequests) {
			this._actualSend(request);
		}
	}

	_handlePacket(packet) {
		const {actionid, event} = packet.asObject;
		if (actionid) {
			if (actionid === actionIgnore) {
				return;
			}

			const request = this.#connectionState.pending.get(actionid);
			/* c8 ignore next */
			if (!request) {
				/* c8 ignore next */
				return;
				/* c8 ignore next */
			}

			if (request.handleResponse(packet)) {
				this.#connectionState.pending.delete(actionid);
			}
		} else if (event) {
			this.emit('event', packet);
			/* c8 ignore next */
		} else {
			/* c8 ignore next */
			this.emit('unknownPacket', packet);
			/* c8 ignore next */
		}
	}

	_sendLogin() {
		const {socket, loginRequest} = this.#connectionState;
		this._actualSend(loginRequest);
		loginRequest.promise.catch(() => {
			socket.destroy();
		});
	}

	disconnect() {
		const {socket} = this.#connectionState;
		if (!socket) {
			return;
		}

		this.#connectionState = disconnectedState();

		socket.destroy();
	}

	_actualSend(request) {
		if (!request.ignoreResponse) {
			this.#connectionState.pending.set(request.actionid, request);
		}

		request.sendTo(this.#connectionState.socket);
	}

	send(object, options) {
		const request = new Request(object, options);

		if (this.#connectionState.authenticated) {
			this._actualSend(request);
		} else {
			this.#initialRequests.push(request);
		}

		return request.promise;
	}

	getList(object, options) {
		return this.send(object, {
			resolveKind: 'responses',
			...options
		});
	}

	async ping() {
		await this.send({action: 'ping'});
	}
}
