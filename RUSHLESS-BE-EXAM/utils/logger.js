require('dotenv').config();
const DEBUG = process.env.DEBUG === 'true';

module.exports = (msg) => {
  if (DEBUG) {
    const ts = new Date().toISOString().replace('T', ' ').substr(0, 19);
    console.log(`[${ts}] ${msg}`);
  }
};