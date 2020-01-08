/* eslint prefer-named-capture-group: 0 */
export const crlf = /\r?\n/u;
export const crlf2x = /\r?\n\r?\n/u;
export const splitFirstLine = /^([^\n\r]*)\r?\n/u;
export const splitNVP = /^([^:]*):\s?/u;
