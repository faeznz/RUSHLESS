const db = require("../models/database");

exports.getAllUsers = async (req, res) => {
  const connection = await db;

  const { name } = req.query;

  try {
    if (name) {
      const [rows] = await connection.query("SELECT * FROM users WHERE name = ?", [name]);

      if (rows.length === 0) {
        return res.status(404).json({ error: "User tidak ditemukan" });
      }

      return res.json(rows[0]);
    } else {
      const [rows] = await connection.query("SELECT * FROM users");
      res.json(rows);
    }
  } catch (err) {
    console.error("❌ Gagal ambil data user:", err.message);
    res.status(500).json({ error: "Gagal ambil data user" });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  const connection = await db;

  try {
    const [rows] = await connection.query("SELECT id, name, username, role, kelas FROM users WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Gagal ambil data user:", err.message);
    res.status(500).json({ error: "Gagal ambil data user" });
  }
};

exports.createUser = async (req, res) => {
  const { name, username, password, role, kelas } = req.body;
  const connection = await db;
  await connection.query(`
    INSERT INTO users (name, username, password, role, kelas)
    VALUES (?, ?, SHA2(?, 256), ?, ?)
  `, [name, username, password || "1234", role, kelas]);
  res.json({ message: "User ditambahkan" });
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, username, password, role, kelas } = req.body;
  const connection = await db;

  if (password) {
    await connection.query(`
      UPDATE users SET name=?, username=?, password=SHA2(?, 256), role=?, kelas=? WHERE id=?
    `, [name, username, password, role, kelas, id]);
  } else {
    await connection.query(`
      UPDATE users SET name=?, username=?, role=?, kelas=? WHERE id=?
    `, [name, username, role, kelas, id]);
  }

  res.json({ message: "User diperbarui" });
};

exports.changePassword = async (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;
  const userIdFromToken = req.user.userId; // from authMiddleware

  // Ensure users can only change their own password
  if (parseInt(id, 10) !== userIdFromToken) {
    return res.status(403).json({ message: "Anda tidak diizinkan untuk melakukan tindakan ini." });
  }

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: "Password lama dan baru diperlukan." });
  }

  const connection = await db;

  try {
    // Verify old password
    const [users] = await connection.query(
      "SELECT * FROM users WHERE id = ? AND password = SHA2(?, 256)",
      [id, oldPassword]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Password lama salah." });
    }

    // Update with new password
    await connection.query(
      "UPDATE users SET password = SHA2(?, 256) WHERE id = ?",
      [newPassword, id]
    );

    res.json({ message: "Password berhasil diubah." });
  } catch (error) {
    console.error("Gagal mengubah password:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const connection = await db;

  try {
    await connection.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "User dihapus" });
  } catch (err) {
    console.error("Gagal hapus user:", err.message);
    res.status(500).json({ error: "Gagal hapus user" });
  }
};

exports.importUsers = async (req, res) => {
  const db = await require("../models/database");
  const users = req.body.users;

  if (!Array.isArray(users)) {
    return res.status(400).json({ error: "Format users tidak valid" });
  }

  try {
    for (const user of users) {
      const { name, username, role, kelas, password } = user;

      if (!name || !username || !password) continue;

      const [existing] = await db.query(
        `SELECT id FROM users WHERE username = ?`,
        [username]
      );
      if (existing.length > 0) continue;

      await db.query(`
        INSERT INTO users (name, username, password, role, kelas)
        VALUES (?, ?, SHA2(?, 256), ?, ?)
      `, [
        name,
        username,
        password || "1234",
        role || "siswa",
        kelas || "",
      ]);
    }

    res.json({ message: "Import selesai." });
  } catch (err) {
    console.error("❌ Gagal impor:", err);
    res.status(500).json({ error: "Gagal impor pengguna" });
  }
};