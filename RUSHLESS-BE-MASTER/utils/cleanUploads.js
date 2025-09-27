const fs = require("fs");
const path = require("path");
const dbPromise = require("../models/database");

async function cleanUnusedUploads() {
  const uploadDir = path.join(__dirname, "../public/uploads");
  if (!fs.existsSync(uploadDir)) return;

  const filesInUpload = fs.readdirSync(uploadDir);
  const connection = await dbPromise;

  const [questions] = await connection.query("SELECT soal, opsi FROM questions");
  const [settings] = await connection.query("SELECT logo FROM web_settings");

  const usedImages = new Set();

  // Logo situs
  if (settings && settings[0]?.logo) {
    const logo = settings[0].logo;
    const logoMatch = logo.match(/\/uploads\/([^"]+)/);
    if (logoMatch) {
      usedImages.add(logoMatch[1]);
    }
  }

  // Gambar dari soal dan opsi
  questions.forEach(row => {
    const soal = row.soal || "";
    let opsiList = [];
    try {
      opsiList = JSON.parse(row.opsi || "[]");
    } catch (err) {}

    const htmlList = [soal, ...opsiList];
    htmlList.forEach(html => {
      const matches = html.match(/src="\/uploads\/([^"]+)"/g);
      if (matches) {
        matches.forEach(match => {
          const filename = match.match(/\/uploads\/([^"]+)"/)[1];
          usedImages.add(filename);
        });
      }
    });
  });

  const deleted = [];
  filesInUpload.forEach(file => {
    const filePath = path.join(uploadDir, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat.isFile() && !usedImages.has(file)) {
        fs.unlinkSync(filePath);
        deleted.push(file);
      }
    } catch (err) {
      console.error(`Gagal memproses ${filePath}: ${err.message}`);
    }
  });

  if (deleted.length > 0) {
    console.log("🧹 Upload cleaner: file dihapus:", deleted.join(", "));
  }
}

module.exports = cleanUnusedUploads;
