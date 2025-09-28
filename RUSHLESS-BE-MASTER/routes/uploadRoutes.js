const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { parseZip } = require('../controllers/uploadController');
const protect = require('../middlewares/authMiddleware');

// Konfigurasi multer untuk upload gambar ke disk
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/images/'),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Konfigurasi multer untuk memproses file di memori (untuk .docx)
const memoryStorage = multer.memoryStorage();

const uploadDisk = multer({ storage: diskStorage });
const uploadMemory = multer({ storage: memoryStorage });

// ✅ Endpoint untuk upload gambar → kirim Base64
router.post('/upload-image', uploadDisk.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    // Baca file dari disk
    const filePath = req.file.path; // full path
    const fileBuffer = fs.readFileSync(filePath);

    // Konversi ke base64
    const mimeType = req.file.mimetype; // misalnya 'image/png'
    const base64String = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

    // Optional: hapus file fisik kalau tidak perlu disimpan
    // fs.unlinkSync(filePath);

    res.json({ path: base64String });
  } catch (err) {
    console.error('Gagal konversi ke base64:', err);
    res.status(500).json({ error: 'Gagal konversi file' });
  }
});

// Endpoint BARU untuk parsing .zip dari MS Word HTML
router.post('/upload/parse-zip', protect, uploadMemory.single('file'), parseZip);

module.exports = router;
