require('dotenv').config();

const db = require("../models/database");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const connection = await db;

    // 1. Cek user
    const [users] = await connection.execute(
      "SELECT * FROM users WHERE username = ? AND password = SHA2(?, 256)",
      [username, password]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Username atau password salah" });
    }

    const user = users[0];

    // 2. Cek jika akun dikunci
    if (user.login_locked === 1) {
      return res.status(403).json({ message: "Akun dikunci oleh admin" });
    }

    // 3. Cek status sesi (gunakan user_id)
    const [sessions] = await connection.execute(
      "SELECT status FROM session_status WHERE user_id = ?",
      [user.id]
    );

    const isOnline = sessions.length > 0 && sessions[0].status === "online";
    if (isOnline) {
      return res.status(403).json({
        message: "Tidak bisa login, akun sedang aktif di perangkat lain.",
      });
    }

    // 4. Simpan status online (insert/update)
    await connection.execute(
      `
      INSERT INTO session_status (user_id, status, last_update)
      VALUES (?, 'online', NOW())
      ON DUPLICATE KEY UPDATE status = 'online', last_update = NOW()
      `,
      [user.id]
    );

    // 5. Buat Access Token dan Refresh Token
        // 5. Buat Access Token (dikirim ke frontend) dan Refresh Token (disimpan di httpOnly cookie)
    const accessToken = jwt.sign(
      {
        userId: user.id,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "15m" } // Masa berlaku singkat
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" } // Masa berlaku panjang
    );

    // Simpan refresh token di httpOnly cookie, aman dari akses JavaScript
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    });

    // Kirim accessToken ke frontend untuk disimpan di cookie 'token' oleh browser
    res.json({
      user_id: user.id,
      name: user.name,
      role: user.role,
      token: accessToken, 
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.isLogin = async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: "Parameter 'user_id' wajib diisi." });
  }

  try {
    const connection = await db;
    const [rows] = await connection.execute(
      "SELECT * FROM session_status WHERE user_id = ?",
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(200).json({ status: "offline" });
    }

    return res.status(200).json({
      status: rows[0].status,
      lastUpdate: rows[0].updated_at,
    });
  } catch (err) {
    console.error("❌ Gagal cek isLogin:", err);
    res.status(500).json({ error: "Terjadi kesalahan di server." });
  }
};

exports.refreshToken = (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(401);

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    const accessToken = jwt.sign(
        { userId: user.userId, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: '15m' }
    );
    res.json({ accessToken });
  });
};

exports.logout = async (req, res) => {
  const { user_id } = req.body;
  console.log(`Attempting to logout user_id: ${user_id}`); // DEBUGGING LOG

  try {
    if (user_id) {
      const connection = await db;
      const [result] = await connection.execute(
        'UPDATE session_status SET status = \'offline\' WHERE user_id = ?',
        [user_id]
      );
      console.log(`Session status update result for user_id ${user_id}:`, result); // DEBUGGING LOG
    } else {
      console.log('No user_id provided in logout request body.'); // DEBUGGING LOG
    }
  } catch (err) {
    console.error("Gagal update status saat logout:", err);
    // Jangan hentikan proses logout meski gagal update status
  }

  // Hapus cookie refreshToken
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0)
  });
  
  res.sendStatus(204); // No Content
};
