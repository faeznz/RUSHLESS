const dbPromise = require("../models/database");

exports.checkHasil = async (req, res) => {
  const db = await dbPromise;
  const { course_id, user_id } = req.query;

  if (!course_id || !user_id) {
    return res.status(400).json({ allowed: false, msg: "Param kurang" });
  }

  try {
    const [user] = await db.query("SELECT role FROM users WHERE id = ?", [user_id]);
    if (user[0]?.role === "admin") {
      return res.json({ allowed: true });
    }

    const [course] = await db.query("SELECT tampilkanHasil FROM courses WHERE id = ?", [course_id]);
    if (!course[0]) return res.json({ allowed: false });

    if (course[0].tampilkanHasil) {
      return res.json({ allowed: true });
    }

    return res.json({ allowed: false });
  } catch (err) {
    console.error("❌ Error check hasil:", err.message);
    res.status(500).json({ allowed: false });
  }
};

exports.checkCourseAccess = async (req, res) => {
  const db = await dbPromise;
  const { user_id, course_id, type } = req.query;

  if (!user_id || !course_id || !type) {
    return res.status(400).json({ allowed: false, msg: "Param kurang" });
  }

  try {
    const [user] = await db.query("SELECT role FROM users WHERE id = ?", [user_id]);
    const role = user[0]?.role;

    if (role === "admin") return res.json({ allowed: true });

    if (role === "guru") {
      const [rows] = await db.query("SELECT pengajar_id FROM courses WHERE id = ?", [course_id]);
      if (rows[0]?.pengajar_id === user_id) return res.json({ allowed: true });
    }

    if (role === "siswa") {
      const [courseRows] = await db.query("SELECT kelas, hidden, tanggal_mulai, tanggal_selesai FROM courses WHERE id = ?", [course_id]);
      if (courseRows.length === 0) return res.json({ allowed: false, msg: "Course tidak ditemukan." });

      const course = courseRows[0];
      if (course.hidden) return res.json({ allowed: false, msg: "Course tersembunyi." });

      const [studentRows] = await db.query("SELECT kelas FROM users WHERE id = ?", [user_id]);
      if (studentRows.length === 0) return res.json({ allowed: false, msg: "User siswa tidak ditemukan." });
      const studentKelas = String(studentRows[0].kelas).toLowerCase().trim();

      let courseKelasParsed = [];
      try {
        courseKelasParsed = JSON.parse(course.kelas);
        if (!Array.isArray(courseKelasParsed)) {
          courseKelasParsed = [String(courseKelasParsed)];
        }
      } catch {
        courseKelasParsed = [String(course.kelas)];
      }

      const isStudentInCourseClass = courseKelasParsed.map(k => String(k).toLowerCase().trim()).includes(studentKelas);
      if (!isStudentInCourseClass) return res.json({ allowed: false, msg: "Siswa tidak terdaftar di kelas ini." });

      if (type === "general" || type === "do") {
        const now = new Date();
        const mulai = new Date(course.tanggal_mulai);
        const selesai = course.tanggal_selesai ? new Date(course.tanggal_selesai) : null;

        if (now < mulai) return res.json({ allowed: false, msg: "Ujian belum dimulai." });
        if (selesai && now > selesai) return res.json({ allowed: false, msg: "Ujian sudah berakhir." });
      }

      return res.json({ allowed: true });
    }

    return res.json({ allowed: false });
  } catch (err) {
    console.error("❌ Error check course access:", err.message);
    res.status(500).json({ allowed: false });
  }
};
