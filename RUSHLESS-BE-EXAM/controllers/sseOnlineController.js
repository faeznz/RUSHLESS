// onlineSSE.js
const db = require("../config/db");

// menyimpan SSE penguji (supaya penguji langsung dapat update realtime)
const clientsOnlinePenguji = new Set(); // semua penguji res
// menyimpan SSE peserta (untuk keepalive)
const clientsOnlinePeserta = new Map(); // userId -> res

const sseHeader = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

// broadcast ke semua penguji
async function broadcastOnlineStatus() {
  // ambil semua status user dari DB
  const [rows] = await db.query(
    `SELECT user_id, status FROM session_status`
  );

  const payload = rows.map(r => ({
    userId: r.user_id,
    isOnline: r.status === "online"
  }));

  const sseMsg = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of clientsOnlinePenguji) {
    res.write(sseMsg);
  }
}

// SSE untuk peserta (dibuka setelah login)
async function registerOnlinePeserta(req, res) {
  const userId = req.query.userId;
  if (!userId) return res.status(400).end("userId required");

  res.writeHead(200, sseHeader);
  res.flushHeaders?.();

  // tandai online di DB
  await db.query(
    `INSERT INTO session_status (user_id, status) VALUES (?, 'online')
     ON DUPLICATE KEY UPDATE status='online'`,
    [userId]
  );

  // simpan koneksi
  clientsOnlinePeserta.set(userId, res);

  // kirim status awal ke user ini (opsional)
  res.write(`data: ${JSON.stringify({status: "online"})}\n\n`);

  // broadcast ke penguji
  await broadcastOnlineStatus();

  req.on("close", async () => {
    // user keluar / tab ditutup → offline
    await db.query(
      `UPDATE session_status SET status='offline' WHERE user_id=?`,
      [userId]
    );
    clientsOnlinePeserta.delete(userId);
    await broadcastOnlineStatus();
  });
}

// SSE untuk penguji (melihat status online semua user)
async function registerOnlinePenguji(req, res) {
  res.writeHead(200, sseHeader);
  clientsOnlinePenguji.add(res);

  // kirim snapshot awal
  await broadcastOnlineStatus();

  req.on("close", () => {
    clientsOnlinePenguji.delete(res);
  });
}

module.exports = {
  registerOnlinePeserta,
  registerOnlinePenguji,
};
