import {crlf, splitNVP} from './regrets.js';

const mapNVP = ([name, value]) => [name.toLowerCase(), value];

export class Packet {
	#data = [];
	#object;

	constructor(input) {
		if (!input) {
			return;
		}

		if (typeof input === 'string') {
			/* Both trailing CRLF are excluded from text. */
			this.#data = input
				.split(crlf)
				.map(nvp => mapNVP(nvp.split(splitNVP).slice(1)));
		} else if (typeof input === 'object') {
			this.assign(input);
		} else {
			throw new TypeError('Invalid input');
		}
	}

	get values() {
		return this.#data.map(nvp => [...nvp]);
	}

	get asObject() {
		if (!this.#object) {
			const result = {};
			for (const [name, value] of this.#data) {
				if (name in result) {
					if (Array.isArray(result[name])) {
						result[name].push(value);
					} else {
						result[name] = [result[name], value];
					}
				} else {
					result[name] = value;
				}
			}

			this.#object = result;
		}

		return this.#object;
	}

	flatValue(name) {
		const result = this.value(name);
		return result.length > 1 ? result : result[0];
	}

	value(name) {
		name = name.toLowerCase();

		return this.#data
			.filter(nvp => nvp[0] === name)
			.map(nvp => nvp[1]);
	}

	append(name, value) {
		this.#object = undefined;
		this.#data.push([name.toLowerCase(), value]);
	}

	assign(object, overwrite) {
		this.#object = undefined;
		if (overwrite) {
			this.#data = [];
		}

		this.#data.push(
			...Object.entries(object).flatMap(
				([name, value]) => [].concat(value).map(v => mapNVP([name, v]))
			)
		);
	}

	toString() {
		if (this.#data.length === 0) {
			return '';
		}

		return [
			...this.#data.map(([name, value]) => `${name}: ${value}`),
			'',
			''
		].join('\r\n');
	}
}
