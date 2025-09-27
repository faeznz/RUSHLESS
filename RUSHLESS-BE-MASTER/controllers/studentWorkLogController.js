const dbPromise = require("../models/database");

exports.logJawaban = async (req, res) => {
  const db = await dbPromise;
  const { user_id, course_id, soal_id, jawaban, waktu } = req.body;

  if (!user_id || !course_id || jawaban == null || waktu == null) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

  try {
    const [cek] = await db.query(
      "SELECT logPengerjaan FROM courses WHERE id = ?",
      [course_id]
    );
    const logAktif = cek[0]?.logPengerjaan === 1;
    if (!logAktif) return res.status(204).end();

    // Ambil attempt terakhir dari jawaban_siswa
    const [rows] = await db.query(
      `SELECT MAX(attemp) AS lastAttemp 
       FROM jawaban_siswa 
       WHERE user_id = ? AND course_id = ?`,
      [user_id, course_id]
    );
    const attemp = (rows[0].lastAttemp || 0) + 1;

    await db.query(
      `INSERT INTO student_work_log 
        (user_id, course_id, soal_id, jawaban, attemp, waktu)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, course_id, soal_id || null, jawaban, attemp, waktu]
    );

    res.status(201).json({ message: "Log tersimpan", attemp });
  } catch (err) {
    console.error("❌ Gagal simpan log:", err.message);
    res.status(500).json({ error: "Gagal simpan log" });
  }
};

exports.getLogByCourse = async (req, res) => {
  const db = await dbPromise;
  const { course_id } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT l.*, u.name, u.kelas 
      FROM student_work_log l
      JOIN users u ON u.username = l.user_id
      WHERE l.course_id = ?
      ORDER BY l.user_id, l.attemp, l.waktu ASC
    `, [course_id]);

    res.json(rows);
  } catch (err) {
    console.error("❌ Gagal ambil log pengerjaan:", err.message);
    res.status(500).json({ error: "Gagal ambil log pengerjaan." });
  }
};

exports.getLogDetail = async (req, res) => {
    const db = await dbPromise;
    const { courseId, userId, attemp } = req.params;
  
    try {
      const [logs] = await db.query(`
        SELECT soal_id, jawaban, waktu
        FROM student_work_log
        WHERE course_id = ? AND user_id = ? AND attemp = ?
        ORDER BY waktu ASC
      `, [courseId, userId, attemp]);
  
      const [userResult] = await db.query(
        `SELECT name FROM users WHERE id = ? LIMIT 1`,
        [userId]
      );
  
      const [courseResult] = await db.query(
        `SELECT nama FROM courses WHERE id = ? LIMIT 1`,
        [courseId]
      );
  
      const user = {
        name: userResult.length > 0 ? userResult[0].name : `User ID ${userId}`,
        course_name: courseResult.length > 0 ? courseResult[0].nama : `Course ID ${courseId}`
      };
  
      res.json({ logs, user });
    } catch (err) {
      console.error("❌ Error ambil log detail:", err.message);
      res.status(500).json({ error: "Gagal ambil log detail." });
    }
  };
  