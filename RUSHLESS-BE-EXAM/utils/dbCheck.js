const db = require('../config/db');
const logger = require('./logger');

module.exports = async function checkDB() {
  try {
    await db.query('SELECT 1');
    logger('✅ Database terkoneksi');
    return true;
  } catch (err) {
    logger(`❌ Database tidak terkoneksi: ${err.message}`);
    process.exit(1); // hentikan server supaya tidak jalan setengah mati
  }
};