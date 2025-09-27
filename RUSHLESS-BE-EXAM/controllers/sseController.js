const db = require("../config/db");
const clientsPeserta = new Map(); // userId -> res
const clientsPenguji = new Map(); // courseId -> Set<res>
const { getAll, get, set, del } = require("../utils/liveState");
const { startTimer } = require("../utils/timerManager");

const sseHeader = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

// cache untuk broadcast penguji
const lastBroadcast = new Map(); // courseId -> last JSON string

/* ---------- UTILS ---------- */
function sendToUser(userId, data) {
  const res = clientsPeserta.get(userId);
  if (res) res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcastPenguji(courseId) {
  const list = getAll(courseId);
  const payload = list.map(({ userId, username, kelas, status, start_time, end_time }) => ({
    userId,
    username,
    kelas,
    status,
    start_time,
    end_time
  }));

  const msg = JSON.stringify(payload);
  if (lastBroadcast.get(courseId) === msg) return;

  lastBroadcast.set(courseId, msg);
  const sseMsg = `data: ${msg}\n\n`;
  clientsPenguji.get(courseId)?.forEach((res) => res.write(sseMsg));
}

/* ---------- PESERTA ---------- */
async function registerSSEPeserta(req, res) {
  const userId = req.query.userId;
  const courseId = req.query.courseId;
  if (!userId || !courseId)
    return res.status(400).send("userId & courseId required");

  res.writeHead(200, sseHeader);
  res.flushHeaders?.();

  clientsPeserta.set(userId, res);

  // --- AMBIL LIST SEMUA SISWA DI KELAS COURSE INI ---
  const [courseRows] = await db.query(`SELECT kelas FROM courses WHERE id=?`, [
    courseId,
  ]);
  if (!courseRows.length) return res.status(404).send("course not found");

  // diasumsikan kolom kelas berupa JSON string ["X","XII"]
  let kelasList;
  try {
    kelasList = JSON.parse(courseRows[0].kelas);
  } catch {
    kelasList = [courseRows[0].kelas]; // fallback kalau bukan JSON
  }

  const [allUsers] = await db.query(
    `SELECT id, name, kelas FROM users WHERE kelas IN (?)`,
    [kelasList]
  );

  console.log(kelasList);
  console.log(allUsers);

  // masukkan semua user dengan status default inactive
  for (const u of allUsers) {
    if (!get(u.id)) {
      set(u.id, {
        userId: u.id,
        username: u.name,
        courseId,
        sisaWaktu: null,
        jawaban: [],
        status: "inactive",
      });
    }
  }

  // --- CEK STATE PESERTA YANG BARU MASUK ---
  let state = get(userId);
  if (!state || state.status === "inactive") {
    // ambil data DB untuk peserta ini
    const [timerRows] = await db.query(
      `SELECT waktu_tersisa FROM answertrail_timer WHERE user_id=? AND course_id=?`,
      [userId, courseId]
    );
    const sisaWaktu = timerRows[0]?.waktu_tersisa ?? null;

    const [jawabanRows] = await db.query(
      `SELECT soal_id, jawaban, attemp, flag FROM jawaban_siswa WHERE user_id=? AND course_id=?`,
      [userId, courseId]
    );

    const [userRows] = await db.query(`SELECT name FROM users WHERE id=?`, [
      userId,
    ]);
    const username = userRows[0]?.name || `user-${userId}`;

    // update liveState dengan status "masuk_room"
    set(userId, {
      userId,
      username,
      courseId,
      sisaWaktu,
      jawaban: jawabanRows,
      status: "masuk_room",
    });
    state = get(userId);

    // update DB status_ujian
    await db.query(
      `INSERT INTO status_ujian (user_id, course_id, status)
       VALUES (?, ?, 'masuk_room')
       ON DUPLICATE KEY UPDATE status='masuk_room'`,
      [userId, courseId]
    );
  }

  // kirim snapshot awal ke user ini
  sendToUser(userId, { type: "sync", data: state });
  // broadcast ke penguji semua user
  broadcastPenguji(courseId);

  // keepalive sync tiap detik
  const pingId = setInterval(() => {
    const state = get(userId);
    if (state) sendToUser(userId, { type: "sync", data: state });
    else clearInterval(pingId);
  }, 1000);

  req.on("close", () => {
    clearInterval(pingId);
    clientsPeserta.delete(userId);
  });
}

/* ---------- PENGUJI ---------- */
async function registerSSEPenguji(req, res) {
  const courseId = req.query.courseId;
  if (!courseId) return res.status(400).end("courseId required");

  res.writeHead(200, sseHeader);

  if (!clientsPenguji.has(courseId)) {
    clientsPenguji.set(courseId, new Set());
  }
  clientsPenguji.get(courseId).add(res);

  // 🔍 Ambil kelas dari course
  const [courseRows] = await db.query(
    `SELECT kelas FROM courses WHERE id = ?`,
    [courseId]
  );
  if (!courseRows.length) return res.status(404).send("course not found");

  let kelasList;
  try {
    kelasList = JSON.parse(courseRows[0].kelas);
  } catch {
    kelasList = [courseRows[0].kelas];
  }

  // 🔍 Ambil semua user yang termasuk kelas tersebut
  const [users] = await db.query(
    `SELECT id, name, kelas FROM users WHERE kelas IN (?)`,
    [kelasList]
  );

  // 🔍 Ambil status ujian dari DB untuk course ini
  const [statusRows] = await db.query(
    `SELECT user_id, status, start_time, end_time FROM status_ujian WHERE course_id = ?`,
    [courseId]
  );
  const statusMap = new Map(
  statusRows.map(r => [r.user_id, { 
    status: r.status, 
    start_time: r.start_time, 
    end_time: r.end_time 
  }])
);

const payload = users.map(u => {
  const s = statusMap.get(u.id) || {};
  return {
    userId: u.id,
    username: u.name,
    kelas: u.kelas,
    status: s.status || "inactive",
    start_time: s.start_time,
    end_time: s.end_time
  };
});

  // 📦 Simpan snapshot awal ke liveState
  payload.forEach((p) => {
    set(p.userId, {
      userId: p.userId,
      username: p.username,
      courseId,
      kelas: p.kelas,
      start_time: p.start_time,
      end_time: p.end_time,
      sisaWaktu: get(p.userId)?.sisaWaktu ?? null,
      jawaban: get(p.userId)?.jawaban ?? [],
      status: p.status,
    });
  });

  // 📡 Kirim snapshot awal ke penguji ini
  const sseMsg = `data: ${JSON.stringify(payload)}\n\n`;
  res.write(sseMsg);

  // 🔁 Broadcast ke semua penguji lain (dengan cache)
  broadcastPenguji(courseId);

  // ⏲ Ping tiap 2 detik
  const pingId = setInterval(() => {
    if (clientsPenguji.get(courseId)?.has(res)) {
      broadcastPenguji(courseId);
    } else {
      clearInterval(pingId);
    }
  }, 2000);

  req.on("close", () => {
    clearInterval(pingId);
    clientsPenguji.get(courseId)?.delete(res);
    if (clientsPenguji.get(courseId)?.size === 0) {
      clientsPenguji.delete(courseId);
      lastBroadcast.delete(courseId);
    }
  });
}

/* ---------- FUNGSI STATUS ---------- */
async function mulaiUjian(userId, courseId, detikPenuh) {
  const old = get(userId);
  if (!old) return;

  // update status liveState
  set(userId, { ...old, status: "mengerjakan", sisaWaktu: detikPenuh });

  // update DB
  await db.query(
    `INSERT INTO status_ujian (user_id, course_id, status)
     VALUES (?, ?, 'mengerjakan')
     ON DUPLICATE KEY UPDATE status='mengerjakan'`,
    [userId, courseId]
  );

  // mulai timer
  startTimer(userId, courseId, detikPenuh, old.username);

  broadcastPenguji(courseId);
}

async function selesaiUjian(userId, courseId) {
  const old = get(userId);
  if (old) set(userId, { ...old, status: "selesai" });

  // update DB
  await db.query(
    `UPDATE status_ujian SET status='selesai' WHERE user_id=? AND course_id=?`,
    [userId, courseId]
  );

  // tutup SSE peserta
  const resSSE = clientsPeserta.get(userId);
  if (resSSE) {
    resSSE.write(`data: ${JSON.stringify({ type: "finished" })}\n\n`);
    resSSE.end();
    clientsPeserta.delete(userId);
  }

  del(userId);
  broadcastPenguji(courseId);
}

module.exports = {
  registerSSEPeserta,
  registerSSEPenguji,
  broadcastPenguji,
  sendToUser,
  mulaiUjian,
  selesaiUjian,
  clientsPeserta,
  clientsPenguji,
};
