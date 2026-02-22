import process from 'node:process';

const isDev = process.env['DEV'] === 'true';

export {isDev};
