const init = require("../models/database");

exports.simpanJawaban = async (req, res) => {
  const db = await init;
  const { user_id, course_id, soal_id, jawaban } = req.body;

  if (!user_id || !course_id || !soal_id || !jawaban) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

  try {
    const [result] = await db.query(
      "SELECT MAX(attemp) AS lastAttempt FROM jawaban_siswa WHERE user_id = ? AND course_id = ?",
      [user_id, course_id]
    );
    const lastAttempt = result[0].lastAttempt || 0;
    const currentAttempt = lastAttempt + 1;

    await db.query(
      "INSERT INTO jawaban_siswa (user_id, course_id, soal_id, jawaban, attemp) VALUES (?, ?, ?, ?, ?)",
      [user_id, course_id, soal_id, jawaban, currentAttempt]
    );

    res.json({ success: true, attempt: currentAttempt });
  } catch (err) {
    console.error("❌ Gagal simpan jawaban:", err.message);
    res.status(500).json({ error: "Gagal menyimpan jawaban" });
  }
};

exports.getJawabanUser = async (req, res) => {
  const db = await init;
  const course_id = req.params.course_id;
  const user_id = req.query.user_id;

  try {
    const [result] = await db.query(
      "SELECT MAX(attemp) AS lastAttempt FROM jawaban_siswa WHERE course_id = ? AND user_id = ?",
      [course_id, user_id]
    );
    const lastAttempt = result[0].lastAttempt;

    if (!lastAttempt) {
      return res.json([]);
    }

    const [rows] = await db.query(
      `SELECT soal_id AS question_id, jawaban AS answer 
       FROM jawaban_siswa 
       WHERE course_id = ? AND user_id = ? AND attemp = ?`,
      [course_id, user_id, lastAttempt]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ Gagal ambil jawaban user:", err.message);
    res.status(500).json({ error: "Gagal mengambil jawaban user" });
  }
};

exports.getLastAttempt = async (req, res) => {
  const db = await init;
  const { course_id, user_id } = req.query;

  try {
    const [rows] = await db.query(
      "SELECT MAX(attemp) AS lastAttempt FROM jawaban_siswa WHERE course_id = ? AND user_id = ?",
      [course_id, user_id]
    );

    const lastAttempt = rows[0].lastAttempt || 0;
    res.json({ lastAttempt });
  } catch (err) {
    console.error("❌ Gagal ambil attempt terakhir:", err.message);
    res.status(500).json({ error: "Gagal ambil attempt terakhir" });
  }
};

exports.cekTampilkanHasil = async (req, res) => {
  const db = await init;
  const { course_id } = req.query;

  if (!course_id) {
    return res.status(400).json({ error: "course_id dibutuhkan" });
  }

  try {
    const [rows] = await db.query(
      `SELECT tampilkanHasil, analisisJawaban FROM courses WHERE id = ?`,
      [course_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Course tidak ditemukan" });
    }

    res.json({
      tampilkan_hasil: rows[0].tampilkanHasil === 1,
      analisis_jawaban: rows[0].analisisJawaban === 1
    });
  } catch (err) {
    console.error("❌ Gagal cek hasil tampilan:", err.message);
    res.status(500).json({ error: "Gagal mengambil data" });
  }
};
