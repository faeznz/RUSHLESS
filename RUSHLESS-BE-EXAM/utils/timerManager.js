const db = require("../config/db");
const { set, del, get } = require("./liveState");

const timers = new Map(); // key: "userId:courseId" → setInterval id

function startTimer(userId, courseId, detikPenuh, username, { onTimeUp, onTick } = {}) {
  const key = `${userId}:${courseId}`;

  // Hentikan timer lama jika ada
  if (timers.has(key)) clearInterval(timers.get(key));

  const interval = setInterval(async () => {
    const state = get(userId);

    // Jika peserta sudah selesai / state tidak ada, hentikan timer
    if (!state) {
      clearInterval(interval);
      timers.delete(key);
      console.log(`⏹ Timer dihentikan karena ujian peserta ${userId} sudah selesai`);
      return;
    }

    const [rows] = await db.query(
      `SELECT waktu_tersisa FROM answertrail_timer WHERE user_id = ? AND course_id = ?`,
      [userId, courseId]
    );

    let sisa = rows[0]?.waktu_tersisa ?? detikPenuh;
    if (sisa <= 0) {
      clearInterval(interval);
      timers.delete(key);

      await db.query(
        `UPDATE status_ujian SET status = 'selesai' WHERE user_id = ? AND course_id = ?`,
        [userId, courseId]
      );

      // Hapus state live
      del(userId);

      // Callback kalau ada
      if (onTimeUp) onTimeUp(userId, courseId);
      return;
    }

    sisa -= 1;

    // Update DB
    await db.query(
      `INSERT INTO answertrail_timer (user_id, course_id, waktu_tersisa)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE waktu_tersisa = ?`,
      [userId, courseId, sisa, sisa]
    );

    // Update state live
    set(userId, { ...state, sisaWaktu: sisa });

    // Callback tick
    if (onTick) onTick(userId, courseId, sisa);
  }, 1000);

  timers.set(key, interval);
}

function stopTimer(userId, courseId) {
  const key = `${userId}:${courseId}`;
  if (timers.has(key)) {
    clearInterval(timers.get(key));
    timers.delete(key);
    console.log(`⏹ Timer peserta ${userId} dihentikan manual`);
  }
}

module.exports = { startTimer, stopTimer };
