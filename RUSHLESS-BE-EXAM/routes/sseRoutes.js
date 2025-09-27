const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { registerSSEPeserta, registerSSEPenguji } = require('../controllers/sseController');

// peserta (butuh login)
router.get('/peserta', registerSSEPeserta);

// penguji (butuh login + role admin/guru)
router.get('/penguji', registerSSEPenguji);

module.exports = router;

// helper middleware role
function roleMiddleware(roles) {
  return (req, res, next) =>
    roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Forbidden' });
}