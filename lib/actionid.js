import uuidv4 from 'uuid/v4.js';

const uuid = uuidv4();
let uuidIdx = 0;

export const actionIgnore = `${uuid}IGNORE`;
export const actionAutoID = () => uuid + (++uuidIdx);
