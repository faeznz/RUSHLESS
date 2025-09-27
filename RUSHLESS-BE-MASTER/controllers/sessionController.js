const db = require("../models/database");

exports.updateSessionStatus = async (req, res) => {
  const { user_id, status } = req.body;

  if (!user_id || !["online", "offline"].includes(status)) {
    return res.status(400).json({ message: "Data tidak valid" });
  }

  try {
    const connection = await db;
    const now = new Date();

    const [rows] = await connection.query(
      "SELECT * FROM session_status WHERE user_id = ?",
      [user_id]
    );

    if (rows.length > 0) {
      await connection.query(
        "UPDATE session_status SET status = ?, last_update = ? WHERE user_id = ?",
        [status, now, user_id]
      );
    } else {
      await connection.query(
        "INSERT INTO session_status (user_id, status, last_update) VALUES (?, ?, ?)",
        [user_id, status, now]
      );
    }

    res.json({ message: `Status user ${user_id} diubah ke ${status}` });
  } catch (err) {
    console.error("❌ Gagal update status:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.startAutoSessionChecker = () => {
  setInterval(async () => {
    try {
      const connection = await db;
      const [rows] = await connection.query(
        "SELECT user_id, last_update FROM session_status WHERE status = 'online'"
      );

      const now = new Date();
      for (let row of rows) {
        const lastUpdate = new Date(row.last_update);
        const diffMinutes = (now - lastUpdate) / (1000 * 60);

        if (diffMinutes > 20) {
          await connection.query(
            "UPDATE session_status SET status = 'offline' WHERE user_id = ?",
            [row.user_id]
          );
        }
      }
    } catch (err) {
      console.error(" Gagal auto update session:", err.message);
    }
  }, 5 * 60 * 1000);
};