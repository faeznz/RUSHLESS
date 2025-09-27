const init = require('../models/database');
const dbpromise = require('../models/database');

exports.getUserExamResult = async (req, res) => {
  try {
    const db = await init;
    const { courseId, userId } = req.params;
    const { attemp } = req.query;

    if (!attemp) {
      return res.status(400).json({ error: "Parameter 'attemp' wajib disertakan." });
    }

    const [rows] = await db.query(`
      SELECT 
        q.id AS soal_id,
        q.soal,
        q.opsi,
        q.tipe_soal,
        TRIM(UPPER(q.jawaban)) AS jawaban_benar,
        js.jawaban AS jawaban_siswa,
        u.name AS siswa_name
      FROM questions q
      LEFT JOIN jawaban_siswa js
        ON js.soal_id = q.id AND js.course_id = q.course_id AND js.user_id = ? AND js.attemp = ?
      LEFT JOIN users u ON u.id = ?
      WHERE q.course_id = ?
      ORDER BY q.id ASC
    `, [userId, attemp, userId, courseId]);

    res.json(rows);
  } catch (error) {
    console.error("❌ Error getUserExamResult:", error);
    res.status(500).json({ error: "Gagal mengambil hasil ujian." });
  }
};

exports.getJawabanDetail = async (req, res) => {
  const { courseId, userId, attempt } = req.params;
  try {
    const db = await dbpromise;

    const [rows] = await db.execute(
      `SELECT js.soal_id, js.jawaban AS jawaban_siswa, q.jawaban AS jawaban_benar
       FROM jawaban_siswa js
       JOIN questions q ON js.soal_id = q.id
       WHERE js.course_id = ? AND js.user_id = ? AND js.attemp = ?
       ORDER BY js.soal_id ASC`,
      [courseId, userId, attempt]
    );

    const detail_jawaban = rows.map(row => row.jawaban_siswa === row.jawaban_benar);

    res.json({ detail_jawaban });
  } catch (err) {
    console.error("❌ Gagal ambil jawaban detail:", err);
    res.status(500).json({ error: 'Gagal ambil jawaban detail' });
  }
};