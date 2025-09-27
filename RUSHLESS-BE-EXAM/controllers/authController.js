const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username & password diperlukan' });

  const [rows] = await db.query('SELECT id, username, password, role, name FROM users WHERE username = ?', [username]);
  if (rows.length === 0) return res.status(401).json({ message: 'Username tidak ditemukan' });

  const user = rows[0];

  // bandingkan hash (kolom password sudah SHA2)
  const hashInput = require('crypto').createHash('sha256').update(password).digest('hex');
  if (hashInput !== user.password) return res.status(401).json({ message: 'Password salah' });

  // buat JWT
  const payload = { id: user.id, username: user.username, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

  res.json({
    message: 'Login berhasil',
    accessToken: token,
    user: { id: user.id, username: user.username, role: user.role, name: user.name }
  });
};