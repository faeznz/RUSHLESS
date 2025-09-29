const db = require('../config/db'); // pastikan ini mysql2/promise
const { live } = require('../utils/liveState');

async function resetExam(req, res) {
  const { courseId } = req.params;
  const { user_id } = req.body; // optional: reset per user

  const connection = await db.getConnection(); // ambil connection
  try {
    await connection.beginTransaction();

    // 1️⃣ Hapus jawaban_siswa
    const deleteJawabanQuery =
      'DELETE FROM jawaban_siswa WHERE course_id = ?' +
      (user_id ? ' AND user_id = ?' : '');
    await connection.query(deleteJawabanQuery, user_id ? [courseId, user_id] : [courseId]);

    // 2️⃣ Hapus session_status
    const deleteSessionQuery =
      'DELETE FROM session_status WHERE course_id = ?' +
      (user_id ? ' AND user_id = ?' : '');
    await connection.query(deleteSessionQuery, user_id ? [courseId, user_id] : [courseId]);

    // 3️⃣ Commit transaction
    await connection.commit();

    // 4️⃣ Hapus state live
    if (user_id) {
      delete live[user_id];
    } else {
      Object.values(live).forEach((p) => {
        if (p.courseId == courseId) delete live[p.userId];
      });
    }

    res.json({ message: '✅ Exam state berhasil di-reset' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: '❌ Gagal mereset exam', error: err.message });
  } finally {
    connection.release();
  }
}

// Export module
module.exports = {
  resetExam,
};
