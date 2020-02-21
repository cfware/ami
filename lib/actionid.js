import {randomBytes} from 'crypto';

const uuid = randomBytes(16).toString('hex');
let uuidIdx = 0;

export const actionIgnore = `${uuid}IGNORE`;
export const actionAutoID = () => uuid + (++uuidIdx);
