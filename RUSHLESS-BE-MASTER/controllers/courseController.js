const poolPromise = require('../models/database');
const dbPromise = require('../models/database');
const mammoth = require("mammoth");
const fs = require("fs");
const db = require('../models/database');
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const cheerio = require("cheerio");
const pdf = require("pdf-parse");
const unzipper = require("unzipper");

function shuffleArray(array) {
    return array
      .map((item) => ({ item, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ item }) => item);
  }

  exports.createCourse = async (req, res) => {
    const {
      nama, pengajarId, kelas, tanggalMulai, tanggalSelesai,
      waktu, deskripsi, maxPercobaan, tampilkanHasil,
      useToken, tokenValue, acakSoal, acakJawaban, minWaktuSubmit,
      logPengerjaan, analisisJawaban
    } = req.body;
  
    const { name, role } = req.cookies;
    if (!name || !role) return res.status(401).send("Unauthorized");
  
    try {
      const pool = await poolPromise;
      await pool.query(
        `INSERT INTO courses 
        (nama, pengajar_id, pengajar, kelas, tanggal_mulai, tanggal_selesai, waktu, deskripsi,
          maxPercobaan, tampilkanHasil, useToken, tokenValue, tokenCreatedAt, 
          acakSoal, acakJawaban, minWaktuSubmit,
          logPengerjaan, analisisJawaban)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nama,
          pengajarId,
          name,
          JSON.stringify(kelas),
          tanggalMulai,
          tanggalSelesai || null,
          waktu,
          deskripsi,
          maxPercobaan || 1,
          tampilkanHasil || false,
          useToken || false,
          useToken ? tokenValue?.slice(0, 6) : null,
          useToken ? new Date() : null,
          !!acakSoal,
          !!acakJawaban,
          parseInt(minWaktuSubmit) || 0,
          !!logPengerjaan,
          !!analisisJawaban
        ]
      );
      res.status(201).json({ message: "Course berhasil dibuat!" });
    } catch (err) {
      console.error("Gagal membuat course:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  };
  
  exports.updateCourse = async (req, res) => {
    const courseId = req.params.id;
    const {
      nama, kelas, tanggal_mulai, tanggal_selesai, waktu, deskripsi,
      maxPercobaan, tampilkanHasil, useToken, tokenValue,
      acakSoal, acakJawaban, minWaktuSubmit,
      logPengerjaan, analisisJawaban, use_secure_app
    } = req.body;
  
    try {
      const pool = await poolPromise;
      await pool.query(
        `UPDATE courses SET 
          nama = ?, 
          kelas = ?, 
          tanggal_mulai = ?, 
          tanggal_selesai = ?, 
          waktu = ?, 
          deskripsi = ?,
          maxPercobaan = ?, 
          tampilkanHasil = ?, 
          useToken = ?, 
          tokenValue = ?, 
          tokenCreatedAt = ?,
          acakSoal = ?, 
          acakJawaban = ?,
          minWaktuSubmit = ?,
          logPengerjaan = ?,           -- ✅
          analisisJawaban = ?,          -- ✅
          use_secure_app = ?
        WHERE id = ?`,
        [
          nama,
          JSON.stringify(kelas),
          tanggal_mulai,
          tanggal_selesai || null,
          waktu,
          deskripsi,
          maxPercobaan || 1,
          tampilkanHasil || false,
          useToken || false,
          useToken ? tokenValue?.slice(0, 6) : null,
          useToken ? new Date() : null,
          !!acakSoal,
          !!acakJawaban,
          parseInt(minWaktuSubmit) || 0,
          !!logPengerjaan,
          !!analisisJawaban,
          !!use_secure_app,
          courseId
        ]
      );
      res.json({ message: "Course berhasil diperbarui!" });
    } catch (err) {
      console.error("Gagal update course:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  };  

  exports.duplicateCourse = async (req, res) => {
    const courseId = req.params.id;
  
    try {
      const db = await dbPromise;
  
      const [originalCourses] = await db.query("SELECT * FROM courses WHERE id = ?", [courseId]);
      if (originalCourses.length === 0) {
        return res.status(404).json({ error: "Course tidak ditemukan" });
      }
  
      const original = originalCourses[0];
  
      const newCourse = { ...original };
      delete newCourse.id;
      newCourse.nama = `${original.nama} (Salinan)`;
      newCourse.tanggal_mulai = new Date();
      newCourse.tanggal_selesai = null;
  
      const [insertResult] = await db.query("INSERT INTO courses SET ?", [newCourse]);
      const newCourseId = insertResult.insertId;
  
      const [questions] = await db.query("SELECT * FROM questions WHERE course_id = ?", [courseId]);
  
      for (const q of questions) {
        const { id, ...rest } = q;
        const duplicated = {
          ...rest,
          course_id: newCourseId,
        };
        await db.query("INSERT INTO questions SET ?", [duplicated]);
      }
  
      res.json({ success: true, newCourseId });
    } catch (err) {
      console.error("❌ Error duplikat course:", err);
      res.status(500).json({ error: "Gagal menduplikat course" });
    }
  };
  
  exports.getCourses = async (req, res) => {
    const { role, name } = req.cookies;
    if (!name || !role) return res.status(401).send("Unauthorized");
  
    try {
      const pool = await poolPromise;
  
      let query = `
        SELECT 
          c.*, 
          s.name AS subfolder, 
          (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count
        FROM courses c
        LEFT JOIN subfolders s ON c.subfolder_id = s.id
      `;
      const params = [];
  
      if (role === "guru") {
        query += " WHERE c.pengajar = ?";
        params.push(name);
      } else if (role === "siswa") {
        query += " WHERE c.hidden = 0";
        const [userRows] = await pool.query("SELECT kelas FROM users WHERE name = ?", [name]);
        if (userRows.length === 0) {
          return res.status(404).json({ message: "User siswa tidak ditemukan" });
        }
  
        siswaKelas = String(userRows[0].kelas).toLowerCase().trim();
      }
  
      const [rows] = await pool.query(query, params);
  
      const result = rows
        .map((row) => {
          let kelasParsed = [];
  
          try {
            kelasParsed = JSON.parse(row.kelas);
            if (!Array.isArray(kelasParsed)) {
              kelasParsed = [String(kelasParsed)];
            }
          } catch {
            kelasParsed = [String(row.kelas)];
          }
  
          return {
            ...row,
            kelas: kelasParsed,
            subfolder: row.subfolder || null,
          };
        })
        .filter((course) => {
          if (role === "siswa") {
            const courseKelasLower = course.kelas.map((k) =>
              String(k).toLowerCase().trim()
            );
            return courseKelasLower.includes(siswaKelas);
          }
  
          return true;
        });
  
      res.json(result);
    } catch (err) {
      console.error("❌ Gagal ambil data course:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  };
  
    exports.getCourseById = async (req, res) => {
    const courseId = req.params.id;
    const { role, name } = req.cookies; // Get name for student class lookup

    try {
      const pool = await poolPromise;
      const [rows] = await pool.query(`
        SELECT 
          c.*, 
          s.name AS subfolder
        FROM courses c
        LEFT JOIN subfolders s ON c.subfolder_id = s.id
        WHERE c.id = ?
      `, [courseId]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Course tidak ditemukan" });
      }

      const course = rows[0];

      // Permission check for students
      if (role === "siswa") {
        if (course.hidden) {
          return res.status(403).json({ message: "Course tersembunyi." });
        }

        const [userRows] = await pool.query("SELECT kelas FROM users WHERE name = ?", [name]);
        if (userRows.length === 0) {
          return res.status(404).json({ message: "User siswa tidak ditemukan." });
        }
        const studentKelas = String(userRows[0].kelas).toLowerCase().trim();

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
        if (!isStudentInCourseClass) {
          return res.status(403).json({ message: "Siswa tidak terdaftar di kelas ini." });
        }

        // For exam courses, check dates (assuming 'waktu' implies an exam)
        if (course.waktu !== null && course.waktu !== undefined) { // Check if it's an exam course
          const now = new Date();
          const mulai = new Date(course.tanggal_mulai);
          const selesai = course.tanggal_selesai ? new Date(course.tanggal_selesai) : null;

          if (now < mulai) {
            return res.status(403).json({ message: "Ujian belum dimulai." });
          }
          if (selesai && now > selesai) {
            return res.status(403).json({ message: "Ujian sudah berakhir." });
          }
        }
      }

      // Continue with original logic if authorized
      try {
        course.kelas = JSON.parse(course.kelas);
      } catch {
        course.kelas = [String(course.kelas)];
      }

      course.subfolder = course.subfolder || null;

      course.title = course.nama;

      res.json(course);
    } catch (err) {
      console.error("Gagal ambil course by ID:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  };  

exports.deleteCourse = async (req, res) => {
  const courseId = req.params.id;
  try {
    const pool = await poolPromise;
    await pool.query("DELETE FROM courses WHERE id = ?", [courseId]);
    res.json({ message: "Course berhasil dihapus!" });
  } catch (err) {
    console.error("Gagal hapus course:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.simpanSoal = async (req, res) => {
  const db = await dbPromise;
  const course_id = req.params.id;
  const { soal: soalList, acakSoal, acakJawaban } = req.body;

  if (!soalList || !Array.isArray(soalList)) {
    return res.status(400).json({ error: "Format soal tidak valid" });
  }

  try {
    for (const item of soalList) {
      const soalId = parseInt(item.id);

      if (!isNaN(soalId)) {
        const [existing] = await db.query(
          "SELECT id FROM questions WHERE id = ? AND course_id = ?",
          [soalId, course_id]
        );

        if (existing.length > 0) {
          await db.query(
            "UPDATE questions SET soal = ?, opsi = ?, jawaban = ? WHERE id = ? AND course_id = ?",
            [item.soal, JSON.stringify(opsi), item.jawaban.toUpperCase(), soalId, course_id]
          );
        } else {
          await db.query(
            "INSERT INTO questions (id, course_id, soal, opsi, jawaban) VALUES (?, ?, ?, ?, ?)",
            [soalId, course_id, item.soal, JSON.stringify(opsi), item.jawaban.toUpperCase()]
          );
        }
      } else {
        await db.query(
          "INSERT INTO questions (course_id, soal, opsi, jawaban) VALUES (?, ?, ?, ?)",
          [course_id, item.soal, JSON.stringify(opsi), item.jawaban.toUpperCase()]
        );
      }
    }

    res.json({ success: true, total: soalList.length });
  } catch (err) {
    console.error("❌ Gagal simpan soal:", err);
    res.status(500).json({ error: "Gagal menyimpan soal" });
  }
};

exports.ambilSoal = async (req, res) => {
  const db = await dbPromise;
  const course_id = req.params.id;

  try {
    const [rows] = await db.query(
      "SELECT id, soal, opsi, jawaban FROM questions WHERE course_id = ?",
      [course_id]
    );

    const hasil = rows.map(item => ({
      ...item,
      opsi: typeof item.opsi === "string" ? JSON.parse(item.opsi) : item.opsi
    }));

    res.json(hasil);
  } catch (err) {
    console.error("❌ Gagal ambil soal:", err);
    res.status(500).json({ error: "Gagal mengambil soal" });
  }
};
  
  exports.getCourseStatus = async (req, res) => {
    const courseId = req.params.id;
    const userId = Number(req.query.user);
if (!userId || isNaN(userId)) {
  return res.status(400).json({ message: "User ID tidak valid" });
}
  
    try {
      const pool = await dbPromise;
  
      const [courseRows] = await pool.query(
        "SELECT maxPercobaan, useToken FROM courses WHERE id = ?",
        [courseId]
      );
  
      if (courseRows.length === 0) {
        return res.status(404).json({ message: "Course tidak ditemukan" });
      }
  
      const course = courseRows[0];
  
      const [jawabanRows] = await pool.query(
        "SELECT MAX(attemp) AS total FROM jawaban_siswa WHERE course_id = ? AND user_id = ?",
        [courseId, userId]
      );
  
      const totalPercobaan = jawabanRows[0].total || 0;
  
      res.json({
        sudahMaksimal: totalPercobaan >= course.maxPercobaan,
        useToken: !!course.useToken
      });
    } catch (err) {
      console.error("❌ Gagal cek status course:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  };
  
  exports.getUserIdByName = async (req, res) => {
    const name = req.params.name;
  
    try {
      const conn = await db;
      const [rows] = await conn.query(`SELECT id FROM users WHERE name = ?`, [name]);
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
      }
  
      res.json({ user_id: rows[0].id });
    } catch (err) {
      console.error("❌ Error getUserIdByName:", err);
      res.status(500).json({ error: 'Gagal mengambil user_id.' });
    }
  };

  exports.validateCourseToken = async (req, res) => {
    const courseId = req.params.id;
    const { token, user } = req.body;
  
    try {
      const pool = await dbPromise;
  
      const [rows] = await pool.query(
        "SELECT tokenValue FROM courses WHERE id = ?",
        [courseId]
      );
  
      if (rows.length === 0) return res.status(404).json({ message: "Course tidak ditemukan" });
  
      const { tokenValue } = rows[0];
  
      if (!tokenValue) {
        return res.json({ valid: false, reason: "Token tidak tersedia" });
      }
  
      const tokenValid = tokenValue.toUpperCase() === token.toUpperCase();
  
      if (tokenValid) {
        res.json({ valid: true });
      } else {
        res.json({ valid: false, reason: "Token salah" });
      }
    } catch (err) {
      console.error("❌ Gagal validasi token:", err.message);
      res.status(500).json({ message: "Server error" });
    }
  };  

  exports.submitUjian = async (req, res) => {
    const { user_id, jawaban, waktu_tersisa } = req.body;
    const course_id = parseInt(req.params.id);
    const parsedUserId = parseInt(user_id);
  
    if (isNaN(parsedUserId) || !Array.isArray(jawaban)) {
      return res.status(400).json({ success: false, message: "Data tidak valid." });
    }
  
    try {
      const pool = await poolPromise;
  
      const [courseRows] = await pool.query(`SELECT waktu FROM courses WHERE id = ?`, [course_id]);
      const waktuConfig = courseRows?.[0]?.waktu;
  
      if (!waktuConfig) {
        console.warn("⚠️ Waktu tidak ditemukan di konfigurasi course.");
      }
  
      const durasi = waktuConfig && waktu_tersisa != null
        ? waktuConfig * 60 - parseInt(waktu_tersisa)
        : null;
  
      const [result] = await pool.query(
        `SELECT MAX(attemp) AS last_attempt FROM jawaban_siswa WHERE user_id = ? AND course_id = ?`,
        [parsedUserId, course_id]
      );
  
      const lastAttempt = result?.[0]?.last_attempt || 0;
      const nextAttempt = lastAttempt + 1;
  
      for (const j of jawaban) {
        const soalId = parseInt(j.soal_id);
        const ans = String(j.jawaban || "").toUpperCase().trim();
        if (isNaN(soalId) || ans === "") continue;
  
        await pool.query(`
          INSERT INTO jawaban_siswa (user_id, course_id, soal_id, jawaban, attemp, durasi_pengerjaan)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE jawaban = VALUES(jawaban), attemp = VALUES(attemp), durasi_pengerjaan = VALUES(durasi_pengerjaan)
        `, [parsedUserId, course_id, soalId, ans, nextAttempt, durasi]);
      }
  
      return res.json({ success: true, attempt: nextAttempt });
  
    } catch (err) {
      console.error("❌ Gagal simpan jawaban:", err.message);
      return res.status(500).json({ success: false, message: "Gagal simpan jawaban." });
    }
  };  

  function saveBase64Image(base64Str) {
    const matches = base64Str.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) return null;
  
    const ext = matches[1].split("/")[1];
    const buffer = Buffer.from(matches[2], "base64");
    const filename = `${Date.now()}-${uuidv4()}.${ext}`;
    const filepath = path.join(__dirname, "../uploads", filename);
  
    fs.writeFileSync(filepath, buffer);
    return `/uploads/${filename}`;
  }
  
  function replaceBase64Images(html) {
  return html.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/g, (match, src) => {
    // Kalau sudah base64 → biarkan
    if (src.startsWith("data:image/")) {
      return match;
    }

    // Kalau masih relative path atau lokal → ubah sesuai kebutuhan
    if (src.startsWith("/uploads/images/")) {
      return match.replace('/uploads/images/', '/uploads/');
    }

    // Kalau format lain, bisa ditangani di sini
    return match;
  });
}
  
  function cleanOptionsArray(rawOpsi) {
    let opsi = [];
  
    if (!Array.isArray(rawOpsi) || rawOpsi.length === 0) {
      return ["A. ", "B. ", "C. ", "D. "];
    }
  
    opsi = rawOpsi.map((item, i) => {
      const label = String.fromCharCode(65 + i);
      const isi = typeof item === "string" ? item.trim() : "";
      if (!isi) return `${label}. `;
  
      const cleanedIsi = replaceBase64Images(isi.replace(/^[A-Z]\.\s*/, ""));
      return `${label}. ${cleanedIsi}`;
    });
  
    return opsi;
  }  
  
  exports.saveOrUpdateQuestions = async (req, res) => {
    const course_id = req.params.id;
    const { soal } = req.body;
  
    if (!Array.isArray(soal)) {
      return res.status(400).json({ error: "Format soal tidak valid" });
    }
  
    try {
      const db = await dbPromise;
  
      // Simplified logic: Always treat incoming questions as new additions
      // unless they have an ID, in which case we update.
      // This supports both appending new questions and editing existing ones.
      for (const item of soal) {
        const soalCleaned = replaceBase64Images(item.soal);
        const tipeSoal = item.tipe_soal || 'pilihan_ganda';
        const soalId = parseInt(item.id);
  
        let opsiFinal = JSON.stringify([]);
        let jawabanFinal = null;
  
        if (tipeSoal === 'pilihan_ganda') {
          // Assuming options are already clean from the frontend
          opsiFinal = JSON.stringify(item.opsi || []);
          jawabanFinal = item.jawaban ? item.jawaban.toUpperCase() : null;
        }
  
        if (!isNaN(soalId)) {
          // Update existing question if ID is provided
          await db.query(
            "UPDATE questions SET soal = ?, opsi = ?, jawaban = ?, tipe_soal = ? WHERE id = ? AND course_id = ?",
            [soalCleaned, opsiFinal, jawabanFinal, tipeSoal, soalId, course_id]
          );
        } else {
          // Insert new question if no ID is provided
          await db.query(
            "INSERT INTO questions (course_id, soal, opsi, jawaban, tipe_soal) VALUES (?, ?, ?, ?, ?)",
            [course_id, soalCleaned, opsiFinal, jawabanFinal, tipeSoal]
          );
        }
      }
  
      res.json({ success: true });
    } catch (err) {
      console.error("❌ Gagal simpan soal:", err);
      res.status(500).json({ error: "Gagal simpan soal" });
    }
  };
  
  exports.getQuestions = async (req, res) => {
    const course_id = req.params.id;
    const userRole = req.cookies?.role;
  
    try {
      const db = await dbPromise;
  
      const [courseRows] = await db.query(
        `SELECT tanggal_mulai, tanggal_selesai FROM courses WHERE id = ?`,
        [course_id]
      );
  
      if (courseRows.length === 0) {
        return res.status(404).json({ error: "Course tidak ditemukan." });
      }
  
      const { tanggal_mulai, tanggal_selesai } = courseRows[0];
      const now = new Date();
      const mulai = new Date(tanggal_mulai);
      const selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;
  
      if (userRole === "siswa") {
        if (now < mulai) {
          return res.status(403).json({ error: "Ujian belum dimulai." });
        }
        if (selesai && now > selesai) {
          return res.status(403).json({ error: "Ujian sudah berakhir." });
        }
      }
  
      const [rows] = await db.query(
        "SELECT id, soal, opsi, jawaban, tipe_soal FROM questions WHERE course_id = ?",
        [course_id]
      );
  
      const soalList = rows.map((row) => {
        let opsiParsed = [];
        try {
          opsiParsed = JSON.parse(row.opsi);
        } catch (err) {
          console.warn("⚠️ Gagal parse opsi:", row.opsi);
        }
  
        const jawaban = row.jawaban
          ? row.jawaban.trim().charAt(0).toUpperCase()
          : null;
  
        const questionData = {
          id: row.id,
          soal: row.soal,
          opsi: opsiParsed,
          tipe_soal: row.tipe_soal || 'pilihan_ganda',
        };

        // Hanya sertakan jawaban jika bukan peran siswa
        if (userRole !== "siswa") {
          questionData.jawaban = jawaban;
        }

        return questionData;
      });
  
      res.json(soalList);
    } catch (err) {
      console.error("❌ Gagal ambil soal:", err);
      res.status(500).json({ error: "Gagal ambil soal" });
    }
  };  

  exports.getAnalyticsByCourse = async (req, res) => {
    try {
      const connection = await db;
      const courseId = req.params.courseId;
  
      const [jawabanRows] = await connection.query(`
        SELECT 
          u.name AS user_name,
          u.kelas AS kelas,
          u.id AS user_id,
          js.soal_id,
          LEFT(TRIM(UPPER(js.jawaban)), 1) AS jawaban_siswa,
          js.attemp,
          TRIM(UPPER(q.jawaban)) AS kunci,
          js.created_at
        FROM jawaban_siswa js
        JOIN questions q ON js.soal_id = q.id
        JOIN users u ON js.user_id = u.id
        WHERE js.course_id = ? AND q.tipe_soal = 'pilihan_ganda'
      `, [courseId]);
  
      const [durasiRows] = await connection.query(`
        SELECT user_id, attemp, durasi_pengerjaan
        FROM jawaban_siswa
        WHERE course_id = ?
      `, [courseId]);
  
      const durasiMap = {};
      for (const row of durasiRows) {
        durasiMap[`${row.user_id}-${row.attemp}`] = row.durasi_pengerjaan;
      }
  
      const hasil = {};
  
      for (const row of jawabanRows) {
        const key = `${row.user_id}-${row.attemp}`;
  
        if (!hasil[key]) {
          hasil[key] = {
            name: row.user_name,
            user_id: row.user_id,
            kelas: row.kelas,
            attemp: row.attemp,
            total_dikerjakan: 0,
            benar: 0,
            salah: 0,
            durasi_pengerjaan: durasiMap[key] || 0
          };
        }
  
        hasil[key].total_dikerjakan += 1;
  
        if (row.jawaban_siswa === row.kunci) {
          hasil[key].benar += 1;
        } else {
          hasil[key].salah += 1;
        }
      }
  
      res.json(Object.values(hasil));
    } catch (err) {
      console.error("❌ Gagal ambil analytics:", err);
      res.status(500).json({ message: "Gagal ambil analytics" });
    }
  };    

  exports.saveTokenAuth = async (req, res) => {
    const { course_id, user_id } = req.body;
  
    if (!course_id || !user_id) {
      return res.status(400).json({ error: "course_id dan user_id wajib diisi" });
    }
  
    try {
      const pool = await dbPromise;
  
      await pool.query(
        `INSERT IGNORE INTO tokenAuth (course_id, user_id) VALUES (?, ?)`,
        [course_id, user_id]
      );
  
      res.json({ success: true, message: "Token auth disimpan." });
    } catch (err) {
      console.error("❌ Gagal simpan tokenAuth:", err.message);
      res.status(500).json({ error: "Gagal menyimpan token auth" });
    }
  };  

exports.checkTokenAuth = async (req, res) => { 
  const courseId = req.params.id;
  const userId = req.query.user;

  try {
    const pool = await dbPromise;

    const [rows] = await pool.query(
      "SELECT * FROM tokenAuth WHERE course_id = ? AND user_id = ?",
      [courseId, userId]
    );

    if (rows.length > 0) {
      res.json({ isAuthorized: true });
    } else {
      res.json({ isAuthorized: false });
    }
  } catch (err) {
    console.error("❌ Gagal cek tokenAuth:", err.message);
    res.status(500).json({ message: "Server error saat cek token auth" });
  }
};


exports.toggleVisibility = async (req, res) => {
  const db = await dbPromise;
  const courseId = req.params.id;
  const { hidden } = req.body;
  try {
    await db.query("UPDATE courses SET hidden = ? WHERE id = ?", [hidden ? 1 : 0, courseId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal update visibilitas course" });
  }
};
  
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// 🔧 Hilangkan style inline
function removeStyles(html) {
  return html
    .replace(/\s*style="[^"]*"/gi, "")
    .replace(/\s*lang="[^"]*"/gi, "")
    .replace(/\s*dir="[^"]*"/gi, "")
    .replace(/<\/?(td|tr|table|tbody)[^>]*>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u200b|\u00a0/g, " "); // invisible chars
}

// 🔧 Ganti src gambar ke path absolut berdasarkan imageMap
function fixImageSrc(html, imageMap) {
  return html.replace(/<img[^>]+src="([^"]+)"[^>]*>/g, (tag, src) => {
    const oldName = path.basename(src);
    const newSrc = imageMap[oldName] || src;
    return tag.replace(src, newSrc);
  });
}

function parseSoalFromHtmlsalahini(html, imageMap) {
  const $ = cheerio.load(html);
  const soalList = [];

  // Ganti src gambar ke imageMap
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    const base = path.basename(src || "");
    if (imageMap[base]) {
      $(el).attr("src", imageMap[base]);
    }
  });

  $("*").removeAttr("style");
  $("*").removeAttr("lang");
  $("*").removeAttr("dir");

  // Ambil <p> dan <li> sebagai baris
  const lines = [];
  $("p, li").each((_, el) => {
    const htmlLine = $(el).html()?.trim();
    if (htmlLine && htmlLine.length > 0) {
      lines.push(htmlLine);
    }
  });

  const soalRegex = /^\d+[\.\)]/;
  const opsiRegex = /^[A-Da-d][\.\)]/;
  const jawabanRegex = /^ANS[:：]?\s*([A-D])/i;

  let state = "idle";
  let currentSoal = "";
  let currentOpsi = [];
  let currentJawaban = null;

  const pushSoal = () => {
    if (currentSoal && currentOpsi.length >= 2 && currentJawaban) {
      soalList.push({
        soal: currentSoal.trim(),
        opsi: currentOpsi,
        jawaban: currentJawaban,
      });
    }
    currentSoal = "";
    currentOpsi = [];
    currentJawaban = null;
    state = "idle";
  };

  for (const raw of lines) {
    const text = cheerio.load(raw).text().trim();

    if (soalRegex.test(text)) {
      pushSoal();
      currentSoal = raw.replace(soalRegex, "").trim();
      state = "soal";
    }

    else if (opsiRegex.test(text)) {
      state = "opsi";
      currentOpsi.push(`<span class="inline-option">${raw}</span>`);
    }

    else if (jawabanRegex.test(text)) {
      const match = text.match(jawabanRegex);
      currentJawaban = match?.[1]?.toUpperCase();
      state = "jawaban";
    }

    else {
      if (state === "soal") {
        currentSoal += " <br/> " + raw;
      } else if (state === "opsi" && currentOpsi.length > 0) {
        currentOpsi[currentOpsi.length - 1] += " " + raw;
      }
    }
  }

  pushSoal(); // terakhir

  return soalList;
}

async function parseSoalFromDocx(docxPath) {
  const result = await mammoth.extractRawText({ path: docxPath });
  const text = result.value;
  const lines = text.split('\n').filter(line => line.trim() !== '');

  const soalList = [];
  let currentSoal = null;

  const soalRegex = /^\d+\.\s+/;
  const opsiRegex = /^[A-E]\.\s+/;
  const ansRegex = /^ANS:\s*([A-E])/i;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (soalRegex.test(trimmedLine)) {
      if (currentSoal) {
        soalList.push(currentSoal);
      }
      currentSoal = {
        question: trimmedLine.replace(soalRegex, ''),
        options: {},
        answer: ''
      };
    } else if (opsiRegex.test(trimmedLine)) {
      if (currentSoal) {
        const key = trimmedLine.charAt(0);
        const value = trimmedLine.substring(3);
        currentSoal.options[key] = value;
      }
    } else if (ansRegex.test(trimmedLine)) {
      if (currentSoal) {
        const match = trimmedLine.match(ansRegex);
        if (match) {
          currentSoal.answer = match[1].toUpperCase();
        }
      }
    } else {
      if (currentSoal && !currentSoal.answer) {
        currentSoal.question += '\n' + trimmedLine;
      }
    }
  }

  if (currentSoal) {
    soalList.push(currentSoal);
  }

  return soalList.map(s => ({
    soal: s.question,
    opsi: Object.entries(s.options).map(([key, value]) => `${key}. ${value}`),
    jawaban: s.answer
  }));
}

exports.uploadSoal = async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, message: "File tidak ditemukan" });
  }

  try {
    const soalList = await parseSoalFromDocx(file.path);
    
    fs.unlinkSync(file.path); // Hapus file sementara

    if (soalList.length === 0) {
      return res.status(400).json({ success: false, message: "Tidak ada soal yang dapat di-parse dari file." });
    }

    return res.status(200).json({
      success: true,
      soal: soalList,
    });
  } catch (err) {
    console.error("❌ Gagal upload soal:", err);
    if (file && file.path) {
      fs.unlinkSync(file.path); // Pastikan file sementara dihapus jika terjadi error
    }
    res.status(500).json({
      success: false,
      message: err.message || "Gagal memproses file",
    });
  }
};

exports.deleteQuestion = async (req, res) => {
  const { questionId } = req.params;
  try {
    const pool = await poolPromise;
    await pool.query("DELETE FROM questions WHERE id = ?", [questionId]);
    res.json({ message: "Soal berhasil dihapus!" });
  } catch (err) {
    console.error("Gagal hapus soal:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMaxAttempts = async (req, res) => {
  const { courseId } = req.params;
  const { className } = req.query;

  if (!className) {
    return res.status(400).json({ message: "className query parameter is required." });
  }

  try {
    const connection = await db;
    const [rows] = await connection.query(`
      SELECT MAX(js.attemp) as maxAttempts
      FROM jawaban_siswa js
      JOIN users u ON js.user_id = u.id
      WHERE js.course_id = ? AND u.kelas = ?
    `, [courseId, className]);

    const maxAttempts = rows[0]?.maxAttempts || 0;

    res.json({ maxAttempts });
  } catch (err) {
    console.error("Gagal ambil max attempts:", err);
    res.status(500).json({ message: "Gagal mengambil data max attempts" });
  }
};
