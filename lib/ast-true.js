const astTrueMatches = new Set([
	'yes',
	'true',
	'y',
	't',
	'1',
	'on'
]);

export const astTrue = value => astTrueMatches.has(`${value}`);
