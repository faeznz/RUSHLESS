const db = require("../models/database");
const { broadcastLogout, broadcastTimerUpdate, broadcastLock, broadcastUnlock } = require("./examSSE");

exports.getSiswaWithStatus = async (req, res) => {
  try {
    const conn = await db;
    const [siswaWithStatus] = await conn.query(`
      SELECT 
        u.id, 
        u.name, 
        u.username, 
        u.kelas, 
        u.login_locked, 
        ss.status AS status, 
        ss.last_update,
        su.status AS status_ujian
      FROM users u
      LEFT JOIN session_status ss ON u.id = ss.user_id
      LEFT JOIN status_ujian su ON u.id = su.user_id
      WHERE u.role = 'siswa'
    `);

    const result = siswaWithStatus.map(s => ({
      ...s,
      status: s.status || 'offline',
      status_ujian: s.status_ujian || 'Tidak Sedang Mengerjakan'
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ Gagal mengambil data siswa:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.resetUjian = async (req, res) => {
  const course_id = req.params.course_id;
  const { user_id } = req.body;

  try {
    const conn = await db;

    // Hapus jawaban ujian & timer
    await conn.query(
      "DELETE FROM jawaban_trail WHERE course_id = ? AND user_id = ?",
      [course_id, user_id]
    );
    await conn.query(
      "DELETE FROM answertrail_timer WHERE course_id = ? AND user_id = ?",
      [course_id, user_id]
    );

    // Reset status ujian + start_time, end_time, attemp
    await conn.query(
      `
      INSERT INTO status_ujian (user_id, course_id, status, start_time, end_time, attemp)
      VALUES (?, ?, 'inactive', NULL, NULL, 0)
      ON DUPLICATE KEY UPDATE 
        status = 'inactive',
        start_time = NULL,
        end_time = NULL,
        attemp = 0
      `,
      [user_id, course_id]
    );

    // Set session status to offline using user_id
    await conn.query(
      `
      INSERT INTO session_status (user_id, status, last_update)
      VALUES (?, 'offline', NOW())
      ON DUPLICATE KEY UPDATE status = 'offline', last_update = NOW()
      `,
      [user_id]
    );

    // Broadcast ke SSE tetap pakai user_id
    broadcastLogout(user_id);

    res.json({ message: "✅ Ujian berhasil direset dan diset offline." });
  } catch (err) {
    console.error("❌ Reset ujian gagal:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.logoutUser = async (req, res) => {
  const { user_id, course_id } = req.body;

  try {
    const conn = await db;

    // Set session status to offline
    await conn.query(
      `
      INSERT INTO session_status (user_id, status, last_update)
      VALUES (?, 'offline', NOW())
      ON DUPLICATE KEY UPDATE status = 'offline'
    `,
      [user_id]
    );

    // Set exam status to not working
    if (course_id) {
      await conn.query(
        `
        UPDATE status_ujian SET status = 'Tidak Sedang Mengerjakan' 
        WHERE user_id = ? AND course_id = ?
      `,
        [user_id, course_id]
      );
    }

    // Broadcast to SSE
    broadcastLogout(user_id);

    res.json({ message: "✅ User berhasil logout dan status diset offline." });
  } catch (err) {
    console.error("❌ Logout gagal:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};


exports.lockLogin = async (req, res) => {
  const { user_id } = req.body;
  try {
    const conn = await db;
    await conn.query("UPDATE users SET login_locked = 1 WHERE id = ?", [user_id]);
    broadcastLock(user_id); // Tambahkan broadcast
    res.json({ message: "✅ Akun berhasil dikunci." });
  } catch (err) {
    console.error("❌ Gagal kunci akun:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.unlockLogin = async (req, res) => {
  const { user_id } = req.body;
  try {
    const conn = await db;
    await conn.query("UPDATE users SET login_locked = 0 WHERE id = ?", [user_id]);
    broadcastUnlock(user_id); // Tambahkan broadcast
    res.json({ message: "✅ Akun berhasil dibuka kembali." });
  } catch (err) {
    console.error("❌ Gagal buka kunci akun:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.addTimer = async (req, res) => {
  const { user_id, course_id, detik, kelas } = req.body;

  if (!course_id || !detik) {
    return res.status(400).json({ message: "Data tidak lengkap" });
  }

  try {
    const conn = await db;

    const tambahWaktu = async (id) => {
      await conn.query(`
        INSERT INTO answertrail_timer (user_id, course_id, waktu_tersisa)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE waktu_tersisa = waktu_tersisa + ?
      `, [id, course_id, detik, detik]);
    };

    if (user_id) {
      await tambahWaktu(user_id);
    } else if (kelas) {
      const [siswa] = await conn.query("SELECT id FROM users WHERE role = 'siswa' AND kelas = ?", [kelas]);
      for (const s of siswa) {
        await tambahWaktu(s.id);
      }
    } else {
      const [semua] = await conn.query("SELECT id FROM users WHERE role = 'siswa'");
      for (const s of semua) {
        await tambahWaktu(s.id);
      }
    }

    // ✅ Kirim SSE agar client reload
    broadcastTimerUpdate();

    res.json({ message: "✅ Waktu berhasil ditambahkan." });

  } catch (err) {
    console.error("❌ Gagal menambah waktu:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error" });
    }
  }
};

exports.resetUjianByKelas = async (req, res) => {
  const { kelas, course_id } = req.body;
  if (!kelas || !course_id) return res.status(400).json({ message: "Kelas dan course_id wajib" });

  try {
    const conn = await db;
    const [siswa] = await conn.query("SELECT id, username FROM users WHERE kelas = ? AND role = 'siswa'", [kelas]);

    for (const s of siswa) {
      await conn.query("DELETE FROM jawaban_trail WHERE user_id = ? AND course_id = ?", [s.id, course_id]);
      await conn.query("DELETE FROM answertrail_timer WHERE user_id = ? AND course_id = ?", [s.id, course_id]);
      await conn.query(`
        INSERT INTO status_ujian (user_id, course_id, status)
        VALUES (?, ?, 'Tidak Sedang Mengerjakan')
        ON DUPLICATE KEY UPDATE status = 'Tidak Sedang Mengerjakan'
      `, [s.id, course_id]);
      await conn.query(`
        INSERT INTO session_status (user_id, status, last_update)
        VALUES (?, 'offline', NOW())
        ON DUPLICATE KEY UPDATE status = 'offline'
      `, [s.id]);

      broadcastLogout(s.id);
    }

    res.json({ message: "✅ Semua siswa di kelas berhasil direset" });
  } catch (err) {
    console.error("❌ Gagal reset kelas:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.resetSemuaMengerjakan = async (req, res) => {
  const { course_id } = req.body;
  if (!course_id) return res.status(400).json({ message: "course_id wajib" });

  try {
    const conn = await db;
    const [userIds] = await conn.query(`
      SELECT user_id, username FROM status_ujian 
      JOIN users ON status_ujian.user_id = users.id 
      WHERE course_id = ? AND status != 'Tidak Sedang Mengerjakan'
    `, [course_id]);

    for (const row of userIds) {
      await conn.query("DELETE FROM jawaban_trail WHERE user_id = ? AND course_id = ?", [row.user_id, course_id]);
      await conn.query("DELETE FROM answertrail_timer WHERE user_id = ? AND course_id = ?", [row.user_id, course_id]);
      await conn.query(`
        UPDATE status_ujian SET status = 'Tidak Sedang Mengerjakan'
        WHERE user_id = ? AND course_id = ?
      `, [row.user_id, course_id]);
      await conn.query(`
        INSERT INTO session_status (user_id, status, last_update)
        VALUES (?, 'offline', NOW())
        ON DUPLICATE KEY UPDATE status = 'offline'
      `, [row.user_id]);

      broadcastLogout(row.user_id);
    }

    res.json({ message: "✅ Semua siswa yang sudah mengerjakan berhasil direset" });
  } catch (err) {
    console.error("❌ Reset semua gagal:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.unlockAllUsers = async (req, res) => {
  try {
    const conn = await db;
    await conn.query("UPDATE users SET login_locked = 0 WHERE role = 'siswa'");
    res.json({ message: "✅ Semua akun siswa berhasil di-unlock" });
  } catch (err) {
    console.error("❌ Unlock gagal:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.setStatusUjian = async (req, res) => {
  const { user_id, course_id, status } = req.body;

  if (!user_id || !course_id || !status) {
    return res.status(400).json({ message: "Data tidak lengkap" });
  }

  try {
    const conn = await db;

    await conn.query(`DELETE FROM status_ujian WHERE user_id = ?`, [user_id]);

    await conn.query(`
      INSERT INTO status_ujian (user_id, course_id, status)
      VALUES (?, ?, ?)
    `, [user_id, course_id, status]);

    res.json({ message: "✅ Status ujian berhasil diganti", status });

    const [rows] = await conn.query(
      `SELECT STR_TO_DATE(tanggal_mulai, '%Y-%m-%dT%H:%i') AS waktu_mulai
       FROM courses
       WHERE id = ?`, [course_id]
    );

    if (!rows || rows.length === 0) return;

    const waktuMulai = rows[0].waktu_mulai;
    if (!waktuMulai) return;

    const now = new Date();
    const diffMs = waktuMulai.getTime() - now.getTime();
    const diffMinutes = diffMs / (60 * 1000);

    if (status.startsWith("Mengerjakan") && diffMinutes >= 1 && diffMinutes <= 10) {
      setTimeout(async () => {
        try {
          const [current] = await conn.query(`
            SELECT status FROM status_ujian
            WHERE user_id = ? AND course_id = ?
          `, [user_id, course_id]);

          const currentStatus = current?.[0]?.status;
          if (currentStatus && currentStatus.startsWith("Mengerjakan")) {
            await conn.query(`
              UPDATE status_ujian SET status = 'Tidak Sedang Mengerjakan'
              WHERE user_id = ? AND course_id = ?
            `, [user_id, course_id]);

          }
        } catch (err2) {
          console.error("❌ Gagal update status otomatis:", err2.message);
        }
      }, 10 * 60 * 1000);
    }

  } catch (err) {
    console.error("❌ Gagal set status ujian:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error" });
    }
  }
};