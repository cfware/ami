export function getSingleOption(object, option) {
	const values = [];

	const lcOption = option.toLowerCase();
	for (const [name, value] of Object.entries(object)) {
		if (name.toLowerCase() === lcOption) {
			values.push(value);
		}
	}

	if (values.length !== 1) {
		throw new TypeError(`Must provide a single \`${option}\` value`);
	}

	return values[0];
}
