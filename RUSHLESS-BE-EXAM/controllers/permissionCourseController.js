const db = require("../config/db");

async function checkPermission(req, res) {
  const userId = req.params.userId;
  const courseId = req.params.courseId;
  console.log("checkPermission:", userId, courseId);

  try {
    // Ambil kelas dan role user
    const [userResult] = await db.query(
      "SELECT kelas, role FROM users WHERE id = ?",
      [userId]
    );
    if (userResult.length === 0) {
      return res.json({ allowed: false, message: "User tidak ditemukan" });
    }
    const { kelas: userKelas, role: userRole } = userResult[0];

    // Jika role admin → langsung allowed
    if (userRole === "admin") {
      return res.json({ allowed: true, message: "Admin memiliki akses penuh" });
    }

    // Ambil kelas course
    const [courseResult] = await db.query(
      "SELECT kelas FROM courses WHERE id = ?",
      [courseId]
    );
    if (courseResult.length === 0) {
      return res.json({ allowed: false, message: "Course tidak ditemukan" });
    }

    // Cek apakah ada soal untuk course ini
    const [questionResult] = await db.query(
      "SELECT COUNT(*) AS total FROM questions WHERE course_id = ?",
      [courseId]
    );
    if (questionResult[0].total === 0) {
      return res.json({ allowed: false, message: "Course ini belum memiliki soal" });
    }

    // Pastikan courseKelasList berupa array
    let courseKelasList = courseResult[0].kelas;
    if (typeof courseKelasList === "string") {
      try {
        courseKelasList = JSON.parse(courseKelasList);
      } catch (e) {
        console.error("Gagal parse kelas course:", e);
        return res.json({ allowed: false, message: "Format kelas pada course tidak valid" });
      }
    }

    // Cek apakah userKelas ada di courseKelasList
    const hasPermission = courseKelasList.includes(userKelas);

    if (!hasPermission) {
      return res.json({
        allowed: false,
        message: `User dari kelas ${userKelas} tidak memiliki akses ke course ini`
      });
    }

    return res.json({ allowed: true, message: "User diizinkan mengikuti ujian" });
  } catch (err) {
    console.error("Error checkPermission:", err);
    return res
      .status(500)
      .json({ allowed: false, message: "Internal server error" });
  }
}

module.exports = { checkPermission };
