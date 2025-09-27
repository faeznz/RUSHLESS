const pool = require('../config/db');

// GET /api/ujian/course/soal?courseId=8&userId=197
exports.getAllSoalByCourse = async (req, res, next) => {
  try {
    const { courseId, userId } = req.query; // ambil dari query string

    console.log("Course ID:", courseId);
    console.log("User ID:", userId);

    // cek dulu setting acakSoal dari courses
    const [courseRows] = await pool.query(
      `SELECT acakSoal FROM courses WHERE id = ?`,
      [courseId]
    );

    if (!courseRows.length) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    const acakSoal = !!courseRows[0].acakSoal; // pastikan boolean

    // query soal
    let sql = `
      SELECT id, course_id, soal, opsi, jawaban, tipe_soal
      FROM questions
      WHERE course_id = ?
    `;

    if (acakSoal) {
      sql += ` ORDER BY RAND()`; // random dari MySQL
    } else {
      sql += ` ORDER BY id ASC`; // urut normal
    }

    const [rows] = await pool.query(sql, [courseId]);

    if (!rows.length) {
      return res.status(400).json({ message: "Tidak ada soal untuk course ini" });
    }

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};
