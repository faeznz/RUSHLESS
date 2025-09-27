const getDb = require("../models/database");

exports.tambahKelas = async (req, res) => {
  const { nama_kelas } = req.body;
  if (!nama_kelas) {
    return res.status(400).json({ error: "Nama kelas wajib diisi" });
  }

  try {
    const db = await getDb;
    const sql = "INSERT INTO kelas (nama_kelas) VALUES (?)";
    await db.query(sql, [nama_kelas]);
    res.status(201).json({ message: "Kelas berhasil ditambahkan" });
  } catch (err) {
    console.error("Gagal tambah kelas:", err);
    res.status(500).json({ error: "Gagal menambahkan kelas" });
  }
};

exports.getSemuaKelas = async (req, res) => {
  try {
    const db = await getDb;
    const [rows] = await db.query("SELECT * FROM kelas");
    res.json(rows);
  } catch (err) {
    console.error("Gagal ambil data kelas:", err);
    res.status(500).json({ error: "Gagal ambil data kelas" });
  }
};

exports.hapusKelas = async (req, res) => {
    const { id } = req.params;
    try {
      const db = await require("../models/database");
      await db.query("DELETE FROM kelas WHERE id = ?", [id]);
      res.json({ message: "Kelas berhasil dihapus" });
    } catch (err) {
      console.error("Gagal hapus kelas:", err);
      res.status(500).json({ error: "Gagal menghapus kelas" });
    }
  };
  
  exports.ubahKelas = async (req, res) => {
    const { id } = req.params;
    const { nama_kelas } = req.body;
  
    if (!nama_kelas) {
      return res.status(400).json({ error: "Nama kelas wajib diisi" });
    }
  
    try {
      const db = await require("../models/database");
      await db.query("UPDATE kelas SET nama_kelas = ? WHERE id = ?", [nama_kelas, id]);
      res.json({ message: "Kelas berhasil diubah" });
    } catch (err) {
      console.error("Gagal ubah kelas:", err);
      res.status(500).json({ error: "Gagal mengubah kelas" });
    }
  };
  
