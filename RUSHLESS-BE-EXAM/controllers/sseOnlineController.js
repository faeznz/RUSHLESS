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
  if (!userId) {
    console.log("❌ userId kosong pada request SSE peserta");
    return res.status(400).end("userId required");
  }

  res.writeHead(200, sseHeader);
  res.flushHeaders?.();

  // tandai online di DB
  try {
    await db.query(
      `INSERT INTO session_status (user_id, status)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status),
                               last_update = CURRENT_TIMESTAMP`,
      [userId, 'online']
    );
    console.log(`✅ Peserta ${userId} ditandai ONLINE`);
  } catch (err) {
    console.error("❌ Error insert/update online:", err);
  }

  // simpan koneksi SSE
  clientsOnlinePeserta.set(userId, res);

  // kirim status awal ke user ini (opsional)
  res.write(`data: ${JSON.stringify({ status: "online" })}\n\n`);

  // broadcast ke penguji
  await broadcastOnlineStatus();

  req.on("close", async () => {
    try {
      await db.query(
        `INSERT INTO session_status (user_id, status)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status),
                                 last_update = CURRENT_TIMESTAMP`,
        [userId, 'offline']
      );
      console.log(`🔴 Peserta ${userId} ditandai OFFLINE`);
    } catch (err) {
      console.error("❌ Error insert/update offline:", err);
    }

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
