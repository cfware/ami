const astTrueMatches = [
	'yes',
	'true',
	'y',
	't',
	'1',
	'on'
];

export const astTrue = value => astTrueMatches.includes(`${value}`);
