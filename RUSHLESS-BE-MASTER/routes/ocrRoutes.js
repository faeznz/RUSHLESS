// ocrRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parseImageWithOCR } = require('../controllers/ocrController');
const protect = require('../middlewares/authMiddleware'); // Diubah: Impor langsung fungsinya

// Konfigurasi multer untuk menyimpan file di memori agar bisa langsung diproses
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Batas ukuran file 10MB
});

// Definisikan route untuk OCR. 
// Middleware 'protect' memastikan hanya user terotentikasi yang bisa akses.
// 'upload.single('image')' akan mengambil file dari field 'image' di form-data.
router.post('/ocr/parse-image', protect, upload.single('image'), parseImageWithOCR);

module.exports = router;
