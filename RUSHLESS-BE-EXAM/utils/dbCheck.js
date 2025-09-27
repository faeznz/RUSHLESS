const db = require('../config/db');
const logger = require('./logger');

module.exports = async function checkDB(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await db.query('SELECT 1');
      console.log('✅ Database terkoneksi');
      return true;
    } catch (err) {
      console.error(`❌ Database tidak terkoneksi (percobaan ${i + 1}):`, err);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  process.exit(1);
};
