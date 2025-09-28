const db = require("../config/db");
const { set, get, del } = require("../utils/liveState");
const {
  broadcastPenguji,
  sendToUser,
  clientsPeserta,
} = require("./sseController");
const { startTimer } = require("../utils/timerManager");

/* ---------- MULAI UJIAN ---------- */
async function mulaiUjian(req, res) {
  const { courseId, userId } = req.body;
  if (!courseId || !userId)
    return res.status(400).json({ message: "courseId & userId required" });

  const [course] = await db.query(`SELECT waktu FROM courses WHERE id = ?`, [
    courseId,
  ]);
  if (!course.length)
    return res.status(404).json({ message: "Ujian tidak ditemukan" });

  const detikPenuh = course[0].waktu * 60;
  const [user] = await db.query("SELECT name FROM users WHERE id = ?", [
    userId,
  ]);
  const username = user[0]?.name || `user-${userId}`;

  const start_time = new Date();

  // update DB
  await db.query(
    `INSERT INTO status_ujian (user_id, course_id, status, start_time)
     VALUES (?, ?, 'mengerjakan', ?)
     ON DUPLICATE KEY UPDATE 
       status='mengerjakan',
       start_time=?`,
    [userId, courseId, start_time, start_time]
  );

  // update timer
  await db.query(
    `INSERT INTO answertrail_timer (user_id, course_id, waktu_tersisa)
     VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE waktu_tersisa=?, updated_at=NOW()`,
    [userId, courseId, detikPenuh, detikPenuh]
  );

  // update liveState
  const old = get(userId) || {};
  set(userId, {
    ...old,
    userId,
    username,
    courseId,
    isOnline: true,
    status: "mengerjakan",
    sisaWaktu: detikPenuh,
    start_time,
    end_time: null,
  });

  startTimer(userId, courseId, detikPenuh, username);

  sendToUser(userId, { type: "sync", data: get(userId) });
  broadcastPenguji(courseId);

  res.json({ message: "Ujian dimulai", start_time, waktuPenuh: detikPenuh });
}

/* ---------- KIRIM JAWABAN ---------- */
async function kirimJawaban(req, res) {
  const { courseId, soalId, jawaban, attemp, userId, waktuTersisa } = req.body;
  if (!courseId || !userId || !soalId)
    return res
      .status(400)
      .json({ message: "courseId, userId & soalId required" });

  // update DB jawaban
  await db.query(
    `INSERT INTO jawaban_siswa (user_id, course_id, soal_id, jawaban, attemp)
     VALUES (?,?,?,?,?)
     ON DUPLICATE KEY UPDATE jawaban=?, attemp=?, created_at=NOW()`,
    [userId, courseId, soalId, jawaban, attemp, jawaban, attemp]
  );

  // update DB timer jika ada
  if (waktuTersisa !== undefined) {
    await db.query(
      `INSERT INTO answertrail_timer (user_id, course_id, waktu_tersisa)
       VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE waktu_tersisa=?, updated_at=NOW()`,
      [userId, courseId, waktuTersisa, waktuTersisa]
    );
  }

  // update liveState jawaban & status
  const old = get(userId) || {};
  const jawabanBaru = [...(old.jawaban || [])];
  const idx = jawabanBaru.findIndex((j) => j.soal_id === soalId);
  if (idx >= 0) jawabanBaru[idx] = { soal_id: soalId, jawaban, attemp };
  else jawabanBaru.push({ soal_id: soalId, jawaban, attemp });

  set(userId, {
    ...old,
    jawaban: jawabanBaru,
    sisaWaktu: waktuTersisa ?? old.sisaWaktu,
    status: old.status || "mengerjakan",
  });

  // broadcast ke peserta & penguji
  sendToUser(userId, { type: "sync", data: get(userId) });
  broadcastPenguji(courseId);

  res.json({ message: "Jawaban & waktu tersimpan" });
}

/* ---------- SELESAI UJIAN ---------- */
async function selesaiUjian(req, res) {
  const { courseId, userId } = req.body;
  if (!courseId || !userId)
    return res.status(400).json({ message: "courseId & userId required" });

  try {
    // 0. Cek apakah hasil boleh ditampilkan
    const [courseRows] = await db.query(
      `SELECT tampilkanHasil FROM courses WHERE id=?`,
      [courseId]
    );
    const tampilkanHasil = courseRows[0]?.tampilkanHasil || false;

    // 1. Hitung jumlah soal
    const [rowsSoal] = await db.query(
      `SELECT COUNT(*) as total FROM questions WHERE course_id=?`,
      [courseId]
    );
    const totalSoal = rowsSoal[0]?.total || 0;

    // 2. Hitung jumlah jawaban peserta
    const [rowsJawaban] = await db.query(
      `SELECT COUNT(*) as total FROM jawaban_siswa 
       WHERE user_id=? AND course_id=? AND jawaban IS NOT NULL`,
      [userId, courseId]
    );
    const totalJawaban = rowsJawaban[0]?.total || 0;

    // 3. Validasi
    if (totalJawaban < totalSoal) {
      return res.status(400).json({
        message: `Masih ada ${totalSoal - totalJawaban} soal yang belum dikerjakan`,
        totalSoal,
        totalJawaban,
      });
    }

    // ✅ Semua sudah terjawab, update status
    const end_time = new Date();

    // update liveState
    const old = get(userId) || {};
    set(userId, { ...old, status: "sudah_mengerjakan", end_time });

    // update DB status ujian
    await db.query(
      `UPDATE status_ujian 
       SET status='sudah_mengerjakan', end_time=? 
       WHERE user_id=? AND course_id=?`,
      [end_time, userId, courseId]
    );

    // 🔥 hapus template_question milik user & course ini
    await db.query(
      `DELETE FROM template_question WHERE user_id=? AND course_id=?`,
      [userId, courseId]
    );

    // kirim sinkronisasi ke client & penguji
    sendToUser(userId, { type: "sync", data: get(userId) });
    broadcastPenguji(courseId);

    // kembalikan response dengan flag tampilkanHasil
    res.json({
      message: "Ujian selesai",
      end_time,
      tampilkanHasil, // true/false
    });
  } catch (err) {
    console.error("❌ Gagal akhiri ujian:", err);
    res.status(500).json({ message: "Gagal akhiri ujian" });
  }
}

/* ---------- TANDAI JAWABAN RAGU ---------- */
async function tandaiRagu(req, res) {
  const { courseId, soalId, userId, attemp, flag } = req.body;
  if (!courseId || !userId || !soalId)
    return res
      .status(400)
      .json({ message: "courseId, userId & soalId required" });

  try {
    await db.query(
      `INSERT INTO jawaban_siswa (user_id, course_id, soal_id, attemp, flag)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE attemp=?, flag=?`,
      [
        userId,
        courseId,
        soalId,
        attemp ?? null, // placeholder 4
        flag ? 1 : 0, // placeholder 5
        attemp ?? null, // placeholder 6 (UPDATE attemp)
        flag ? 1 : 0, // placeholder 7 (UPDATE flag)
      ]
    );

    // update liveState
    const old = get(userId) || {};
    const jawabanBaru = [...(old.jawaban || [])];
    const idx = jawabanBaru.findIndex(
      (j) => String(j.soal_id) === String(soalId)
    );
    if (idx >= 0) {
      jawabanBaru[idx] = {
        ...jawabanBaru[idx],
        flag: !!flag,
        attemp: attemp ?? jawabanBaru[idx].attemp,
      };
    } else {
      jawabanBaru.push({
        soal_id: soalId,
        jawaban: null,
        attemp: attemp ?? null,
        flag: !!flag,
      });
    }

    set(userId, { ...old, jawaban: jawabanBaru });

    sendToUser(userId, { type: "sync", data: get(userId) });
    broadcastPenguji(courseId);

    res.json({ message: "Jawaban ditandai ragu", soalId, flag });
  } catch (err) {
    console.error("❌ Gagal tandai ragu:", err);
    res.status(500).json({ message: "Gagal tandai ragu" });
  }
}

module.exports = { mulaiUjian, kirimJawaban, selesaiUjian, tandaiRagu };
