'use strict';

module.exports = testFile => [
	testFile.replace('.test.js', '.js').replace('/esm/', '/cjs/'),
	testFile.replace('.test.js', '.js').replace('/cjs/', '/esm/')
];
