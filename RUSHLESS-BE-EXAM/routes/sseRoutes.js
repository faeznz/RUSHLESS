// routes/sse.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { 
  registerSSEPeserta, 
  registerSSEPenguji 
} = require('../controllers/sseController');

const { 
  registerOnlinePeserta, 
  registerOnlinePenguji 
} = require('../controllers/sseOnlineController');

const { resetExam } = require('../controllers/resetController');

// helper middleware role
function roleMiddleware(roles) {
  return (req, res, next) =>
    roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Forbidden' });
}

// ─── SSE Ujian Peserta (butuh login) ─────────────────────────────
router.get('/peserta', registerSSEPeserta);

// ─── SSE Ujian Penguji (butuh login + role guru/admin) ──────────
router.get('/penguji', registerSSEPenguji);

// ─── SSE Online Peserta (dibuka setelah login untuk status online) ───
router.get('/online/peserta', registerOnlinePeserta);

// ─── SSE Online Penguji (pantau status online semua user) ────────
router.get('/online/penguji', registerOnlinePenguji);

// RESET UJIAN (butuh login + role guru/admin)
router.delete('/reset/:courseId', resetExam);

module.exports = router;
