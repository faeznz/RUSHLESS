const dbPromise = require("../models/database");

exports.save = async (req, res) => {
  const db = await dbPromise;
  const { user_id, course_id, soal_id, jawaban } = req.body;

  if (!user_id || !course_id || !soal_id || !jawaban) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

  try {
    await db.query(`
      INSERT INTO jawaban_trail (user_id, course_id, soal_id, jawaban)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE jawaban = ?
    `, [user_id, course_id, soal_id, jawaban, jawaban]);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error simpan trail:", err.message);
    res.status(500).json({ error: "Gagal simpan jawaban trail" });
  }
};

exports.get = async (req, res) => {
  const db = await dbPromise;
  const { user_id } = req.query;
  const { course_id } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT soal_id AS question_id, jawaban AS answer
      FROM jawaban_trail
      WHERE user_id = ? AND course_id = ?
    `, [user_id, course_id]);

    res.json(rows);
  } catch (err) {
    console.error("❌ Error ambil trail:", err.message);
    res.status(500).json({ error: "Gagal ambil jawaban trail" });
  }
};

exports.clear = async (req, res) => {
  const db = await dbPromise;
  const { user_id } = req.query;
  const { course_id } = req.params;

  try {
    await db.query(`
      DELETE FROM jawaban_trail
      WHERE user_id = ? AND course_id = ?
    `, [user_id, course_id]);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error hapus trail:", err.message);
    res.status(500).json({ error: "Gagal hapus trail" });
  }
};

exports.saveWaktuSisa = async (req, res) => {
  const db = await dbPromise;
  const { user_id, course_id, attemp, waktu_tersisa } = req.body;

  if (!user_id || !course_id || attemp === undefined || waktu_tersisa === undefined) {
    return res.status(400).json({ message: "Data kurang lengkap." });
  }

  try {
    await db.query(
      `INSERT INTO jawaban_trail (user_id, course_id, attemp, waktu_tersisa)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE waktu_tersisa = VALUES(waktu_tersisa)`,
      [user_id, course_id, attemp, waktu_tersisa]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Gagal simpan waktu (jawaban_trail):", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateTimer = async (req, res) => {
  const db = await dbPromise;
  const { user_id, course_id, waktu_tersisa } = req.body;

  if (!user_id || !course_id || waktu_tersisa === undefined) {
    console.warn("❌ Data kurang lengkap:", req.body);
    return res.status(400).json({ message: "Data kurang lengkap." });
  }

  try {
    await db.query(`
      INSERT INTO answertrail_timer (user_id, course_id, waktu_tersisa)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE waktu_tersisa = VALUES(waktu_tersisa)
    `, [user_id, course_id, waktu_tersisa]);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Gagal simpan waktu:", err.message);
    res.status(500).json({ message: "Gagal simpan waktu" });
  }
};

exports.getTimer = async (req, res) => {
  const db = await dbPromise;
  const { user_id, course_id } = req.query;

  if (!user_id || !course_id) {
    return res.status(400).json({ message: "Query tidak lengkap." });
  }

  try {
    const [rows] = await db.query(`
      SELECT waktu_tersisa, updated_at FROM answertrail_timer
      WHERE user_id = ? AND course_id = ?
    `, [user_id, course_id]);

    if (rows.length === 0) {
      return res.json({ waktu_tersisa: null });
    }

    const { waktu_tersisa, updated_at } = rows[0];
    const now = new Date();
    const lastUpdate = new Date(updated_at);
    const selisihDetik = Math.floor((now - lastUpdate) / 1000);

    let waktuSisa = waktu_tersisa - selisihDetik;
    if (waktuSisa < 0) waktuSisa = 0;

    res.json({ waktu_tersisa: waktuSisa });
  } catch (err) {
    console.error("❌ Gagal ambil timer:", err.message);
    res.status(500).json({ message: "Gagal ambil timer" });
  }
};

exports.deleteTimer = async (req, res) => {
  const db = await dbPromise;
  const { user_id, course_id } = req.query;

  if (!user_id || !course_id) {
    return res.status(400).json({ message: "Query tidak lengkap." });
  }

  try {
    await new Promise(resolve => setTimeout(resolve, 3000));

    await db.query(`
      DELETE FROM answertrail_timer
      WHERE user_id = ? AND course_id = ?
    `, [user_id, course_id]);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Gagal hapus timer:", err.message);
    res.status(500).json({ message: "Gagal hapus timer" });
  }
};
