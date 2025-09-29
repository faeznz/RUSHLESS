const pool = require('../config/db');

exports.getAllSoalByCourse = async (req, res, next) => {
  try {
    const { courseId, userId } = req.query;

    console.log("Course ID:", courseId);
    console.log("User ID:", userId);

    // Ambil setting acakSoal & acakJawaban dari courses
    const [courseRows] = await pool.query(
      `SELECT acakSoal, acakJawaban FROM courses WHERE id = ?`,
      [courseId]
    );
    if (!courseRows.length) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }
    const acakSoal = !!courseRows[0].acakSoal;
    const acakJawaban = !!courseRows[0].acakJawaban;

    // Ambil semua soal
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

    // Cek template_question
    const [templateRows] = await pool.query(
      `SELECT template FROM template_question WHERE user_id = ? AND course_id = ?`,
      [userId, courseId]
    );

    let orderedQuestions = [];

    if (templateRows.length) {
      // User sudah punya template, urutkan sesuai template
      let templateIds = [];
      try {
        templateIds = JSON.parse(templateRows[0].template);
      } catch (e) {
        console.error("Gagal parse template JSON:", e);
      }

      const mapSoal = new Map(rows.map((r) => [r.id, r]));
      orderedQuestions = templateIds.map((id) => mapSoal.get(id)).filter(Boolean);
    } else {
      // User belum punya template
      let soalArr = [...rows];
      if (acakSoal) {
        soalArr.sort(() => Math.random() - 0.5);
      }
      orderedQuestions = soalArr;

      // Simpan template baru ke DB
      const idArray = soalArr.map((q) => q.id);
      await pool.query(
        `INSERT INTO template_question (user_id, course_id, template) VALUES (?, ?, ?)`,
        [userId, courseId, JSON.stringify(idArray)]
      );
    }

    // Proses opsi agar selalu berbentuk [{"A": "jawaban1"}, {"B": "jawaban2"}, ...]
    orderedQuestions = orderedQuestions.map((q) => {
      let opsiArr = typeof q.opsi === 'string' ? JSON.parse(q.opsi) : q.opsi;

      const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let opsiMapped = opsiArr.map((val, i) => ({ [keys[i]]: val }));

      // acak jawaban jika acakJawaban = true
      if (acakJawaban) {
        opsiMapped = [...opsiMapped].sort(() => Math.random() - 0.5);
      }

      return {
        ...q,
        opsi: opsiMapped
      };
    });

    res.json({ data: orderedQuestions });
  } catch (err) {
    console.error("getAllSoalByCourse error:", err);
    next(err);
  }
};
