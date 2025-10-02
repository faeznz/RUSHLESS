let clients = [];

exports.streamSession = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.push(res);

  req.on("close", () => {
    clients = clients.filter(c => c !== res);
  });
};

// 🔁 Broadcast Logout berdasarkan user_id
exports.broadcastLogout = (user_id) => {
  const payload = JSON.stringify({ user_id });
  clients.forEach(res => res.write(`event: unlock\ndata: ${payload}\n\n`));
};

// 📢 Broadcast Lock berdasarkan user_id
exports.broadcastLock = (user_id) => {
  const payload = JSON.stringify({ user_id });
  clients.forEach(res => res.write(`event: lock\ndata: ${payload}\n\n`));
};

// 📢 Broadcast Unlock berdasarkan user_id
exports.broadcastUnlock = (user_id) => {
  const payload = JSON.stringify({ user_id });
  clients.forEach(res => res.write(`event: unlock_account\ndata: ${payload}\n\n`));
};

// ✅ Broadcast Timer Update (tidak perlu diubah karena general)
exports.broadcastTimerUpdate = () => {
  const payload = JSON.stringify({ type: "timer-updated" });
  clients.forEach(res => res.write(`data: ${payload}\n\n`));
};
