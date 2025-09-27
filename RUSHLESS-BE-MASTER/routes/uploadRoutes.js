const express = require('express');
const multer = require('multer');
const path = require('path');
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

// Endpoint untuk upload gambar (tetap seperti sebelumnya)
router.post('/upload-image', uploadDisk.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = `/api/uploads/images/${req.file.filename}`;
  res.json({ path: filePath });
});

// Endpoint BARU untuk parsing .docx
// router.post('/upload/parse-docx', protect, uploadMemory.single('file'), parseDocx);

// Endpoint BARU untuk parsing .zip dari MS Word HTML
router.post('/upload/parse-zip', protect, uploadMemory.single('file'), parseZip);


module.exports = router;