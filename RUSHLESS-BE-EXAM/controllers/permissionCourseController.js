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
      return res.json({ allowed: true, message: "Admin memiliki akses penuh", startFromBeginning: true });
    }

    // Ambil kelas course + tanggal mulai + maxPercobaan
    const [courseResult] = await db.query(
      "SELECT kelas, tanggal_mulai, maxPercobaan FROM courses WHERE id = ?",
      [courseId]
    );
    if (courseResult.length === 0) {
      return res.json({ allowed: false, message: "Course tidak ditemukan" });
    }

    const { kelas: courseKelas, tanggal_mulai, maxPercobaan } = courseResult[0];

    // ✅ Validasi tanggal mulai
    const now = new Date();
    const startDate = new Date(tanggal_mulai);
    if (isNaN(startDate.getTime())) {
      return res.json({
        allowed: false,
        message: "Format tanggal mulai pada course tidak valid",
      });
    }
    if (startDate > now) {
      return res.json({
        allowed: false,
        message: `Ujian ini baru bisa diakses mulai ${startDate.toLocaleString("id-ID")}`,
      });
    }

    // Cek apakah ada soal untuk course ini
    const [questionResult] = await db.query(
      "SELECT COUNT(*) AS total FROM questions WHERE course_id = ?",
      [courseId]
    );
    if (questionResult[0].total === 0) {
      return res.json({
        allowed: false,
        message: "Course ini belum memiliki soal",
      });
    }

    // Pastikan courseKelasList berupa array
    let courseKelasList = courseKelas;
    if (typeof courseKelasList === "string") {
      try {
        courseKelasList = JSON.parse(courseKelasList);
      } catch (e) {
        console.error("Gagal parse kelas course:", e);
        return res.json({
          allowed: false,
          message: "Format kelas pada course tidak valid",
        });
      }
    }

    // Cek apakah userKelas ada di courseKelasList
    const hasPermission = courseKelasList.includes(userKelas);
    if (!hasPermission) {
      return res.json({
        allowed: false,
        message: `User dari kelas ${userKelas} tidak memiliki akses ke course ini`,
      });
    }

    // ✅ Cek jumlah percobaan & status terakhir
    const [statusResult] = await db.query(
      "SELECT status, attemp FROM status_ujian WHERE user_id = ? AND course_id = ? ORDER BY attemp DESC LIMIT 1",
      [userId, courseId]
    );

    let currentAttemp = 0;
    let startFromBeginning = true; // default mulai dari awal

    if (statusResult.length > 0) {
      const { status, attemp } = statusResult[0];
      currentAttemp = attemp;

      // Kalau status sedang mengerjakan atau masuk_room → lanjut, bukan mulai awal
      if (status === "mengerjakan") {
        startFromBeginning = false;
      }
    }

    if (currentAttemp >= maxPercobaan) {
      return res.json({
        allowed: false,
        message: `Anda sudah mencapai batas maksimum percobaan (${maxPercobaan})`,
        startFromBeginning,
      });
    }

    return res.json({
      allowed: true,
      message: "User diizinkan mengikuti ujian",
      startFromBeginning,
    });
  } catch (err) {
    console.error("Error checkPermission:", err);
    return res.status(500).json({ allowed: false, message: "Internal server error", startFromBeginning: null });
  }
}

module.exports = { checkPermission };
