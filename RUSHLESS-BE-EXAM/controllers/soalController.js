const pool = require('../config/db');

exports.getAllSoalByCourse = async (req, res, next) => {
  try {
    const { courseId, userId } = req.query;

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
    const acakSoal = !!courseRows[0].acakSoal;

    // ambil semua soal urut normal
    const [rows] = await pool.query(
      `SELECT id, course_id, soal, opsi, jawaban, tipe_soal
       FROM questions
       WHERE course_id = ?
       ORDER BY id ASC`,
      [courseId]
    );

    if (!rows.length) {
      return res.status(400).json({ message: "Tidak ada soal untuk course ini" });
    }

    // cek template_question
    const [templateRows] = await pool.query(
      `SELECT template FROM template_question WHERE user_id = ? AND course_id = ?`,
      [userId, courseId]
    );

    let orderedQuestions = [];

    if (templateRows.length) {
      // user sudah punya template, urutkan sesuai template
      let templateIds = [];
      try {
        templateIds = JSON.parse(templateRows[0].template);
      } catch (e) {
        console.error("Gagal parse template JSON:", e);
      }

      // buat map id → object soal
      const mapSoal = new Map(rows.map((r) => [r.id, r]));
      // urutkan sesuai template
      orderedQuestions = templateIds.map((id) => mapSoal.get(id)).filter(Boolean);
    } else {
      // user belum punya template
      let soalArr = [...rows];
      if (acakSoal) {
        // acak manual di Node.js
        soalArr.sort(() => Math.random() - 0.5);
      }
      orderedQuestions = soalArr;

      // simpan template baru ke DB
      const idArray = soalArr.map((q) => q.id);
      await pool.query(
        `INSERT INTO template_question (user_id, course_id, template) VALUES (?, ?, ?)`,
        [userId, courseId, JSON.stringify(idArray)]
      );
    }

    res.json({ data: orderedQuestions });
  } catch (err) {
    console.error("getAllSoalByCourse error:", err);
    next(err);
  }
};
