const dbPromise = require("../models/database");

exports.getUserInfo = async (req, res) => {
  const { id } = req.query;
  try {
    const db = await dbPromise;
    const [rows] = await db.query("SELECT id, name, kelas FROM users WHERE id = ?", [id]);

    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error getUserInfo:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getSummary = async (req, res) => {
  const { user_id } = req.query;
  try {
    const db = await dbPromise;

    const [[completedRow]] = await db.query(
      "SELECT COUNT(DISTINCT course_id) AS completed FROM jawaban_siswa WHERE user_id = ?",
      [user_id]
    );

    const [[scoreRow]] = await db.query(
      `SELECT 
        SUM(CASE WHEN TRIM(UPPER(js.jawaban)) = TRIM(UPPER(q.jawaban)) THEN 1 ELSE 0 END) AS benar,
        COUNT(*) AS total
       FROM jawaban_siswa js
       JOIN questions q ON js.soal_id = q.id
       WHERE js.user_id = ?`,
      [user_id]
    );

    const averageScore = scoreRow.total > 0
      ? Math.round((scoreRow.benar / scoreRow.total) * 100)
      : 0;

    res.json({
      completed: completedRow.completed || 0,
      averageScore,
    });
  } catch (err) {
    console.error("❌ Error getSummary:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getRecentExam = async (req, res) => {
  const { user_id } = req.query;
  try {
    const db = await dbPromise;

    const [rows] = await db.query(
      `SELECT 
         c.nama AS title,
         MAX(js.attemp) AS last_attempt
       FROM jawaban_siswa js
       JOIN courses c ON js.course_id = c.id
       WHERE js.user_id = ?
       GROUP BY js.course_id
       ORDER BY last_attempt DESC
       LIMIT 1`,
      [user_id]
    );

    const recent = rows[0];
    if (!recent) return res.json(null);

    res.json({
      title: recent.title,
      date: `Percobaan ke-${recent.last_attempt}`
    });
  } catch (err) {
    console.error("❌ Error getRecentExam:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getUpcomingExams = async (req, res) => {
  const { user_id } = req.query;
  try {
    const db = await dbPromise;

    const [[user]] = await db.query("SELECT kelas FROM users WHERE id = ?", [user_id]);
    if (!user || !user.kelas) return res.json([]);

    const [rows] = await db.query(
      `SELECT 
         id, 
         nama AS title, 
         tanggal_mulai AS rawDate,
         DATE_FORMAT(STR_TO_DATE(tanggal_mulai, '%Y-%m-%d'), '%e %M %Y') AS date
       FROM courses 
       WHERE FIND_IN_SET(?, kelas) > 0 
         AND STR_TO_DATE(tanggal_mulai, '%Y-%m-%d') >= CURDATE()
       ORDER BY STR_TO_DATE(tanggal_mulai, '%Y-%m-%d') ASC
       LIMIT 5`,
      [user.kelas]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ Error getUpcomingExams:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
