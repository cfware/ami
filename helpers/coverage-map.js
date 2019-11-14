'use strict';

module.exports = testFile => [
	testFile.replace('.spec.js', '.js').replace('/esm/', '/cjs/'),
	testFile.replace('.spec.js', '.js').replace('/cjs/', '/esm/')
];
