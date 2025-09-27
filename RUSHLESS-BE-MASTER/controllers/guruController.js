const dbPromise = require("../models/database");

exports.getAllGuru = async (req, res) => {
    try {
      const db = await require("../models/database");
      const [rows] = await db.query("SELECT id, name AS nama FROM users WHERE role = 'guru'");
      res.json(rows);
    } catch (err) {
      console.error("Gagal ambil data guru:", err);
      res.status(500).json({ error: "Gagal mengambil data guru" });
    }
  };
  

exports.getAllKelas = async (req, res) => {
    try {
      const db = await dbPromise;
      const [rows] = await db.query("SELECT nama_kelas FROM kelas ORDER BY nama_kelas ASC");
      const kelasList = rows.map(row => row.nama_kelas);
      res.json(kelasList);
    } catch (err) {
      console.error("Gagal ambil data kelas:", err);
      res.status(500).json({ error: "Gagal mengambil data kelas" });
    }
  };  

exports.getGuruKelas = async (req, res) => {
  try {
    const db = await dbPromise;
    const [rows] = await db.query("SELECT * FROM guru_kelas");
    res.json(rows);
  } catch (err) {
    console.error("Gagal ambil data guru_kelas:", err);
    res.status(500).json({ error: "Gagal mengambil data pengajaran" });
  }
};

exports.setGuruKelas = async (req, res) => {
  const { guruId, kelasList } = req.body;

  if (!guruId || !Array.isArray(kelasList)) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

  try {
    const db = await dbPromise;

    await db.query("DELETE FROM guru_kelas WHERE guru_id = ?", [guruId]);

    const inserts = kelasList.map(kelas =>
      db.query("INSERT INTO guru_kelas (guru_id, kelas) VALUES (?, ?)", [guruId, kelas])
    );
    await Promise.all(inserts);

    res.json({ success: true, message: "Data berhasil disimpan" });
  } catch (err) {
    console.error("Gagal simpan guru_kelas:", err);
    res.status(500).json({ error: "Gagal menyimpan data pengajaran" });
  }
};

exports.batchUpdateGuruKelas = async (req, res) => {
  const { pengajaran } = req.body;

  if (!pengajaran || typeof pengajaran !== 'object') {
    return res.status(400).json({ error: "Data tidak lengkap atau format salah" });
  }

  const db = await dbPromise;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query("DELETE FROM guru_kelas");

    const inserts = [];
    for (const guruId in pengajaran) {
      const kelasList = pengajaran[guruId];
      if (Array.isArray(kelasList)) {
        kelasList.forEach(kelas => {
          inserts.push([guruId, kelas]);
        });
      }
    }

    if (inserts.length > 0) {
      await connection.query("INSERT INTO guru_kelas (guru_id, kelas) VALUES ?", [inserts]);
    }

    await connection.commit();
    res.json({ success: true, message: "Data berhasil disimpan" });
  } catch (err) {
    await connection.rollback();
    console.error("Gagal simpan guru_kelas batch:", err);
    res.status(500).json({ error: "Gagal menyimpan data pengajaran" });
  } finally {
    connection.release();
  }
};

exports.getKelasByNamaGuru = async (req, res) => {
    const namaGuru = req.params.nama;
  
    try {
      const db = await require("../models/database");
      const [users] = await db.query("SELECT id FROM users WHERE name = ?", [namaGuru]);
      if (users.length === 0) return res.status(404).json([]);
  
      const guruId = users[0].id;
      const [kelas] = await db.query("SELECT kelas FROM guru_kelas WHERE guru_id = ?", [guruId]);
  
      res.json(kelas.map(k => k.kelas));
    } catch (err) {
      console.error("Gagal ambil kelas berdasarkan guru:", err);
      res.status(500).json({ error: "Gagal ambil kelas guru" });
    }
  };
  