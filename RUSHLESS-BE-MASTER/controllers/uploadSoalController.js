const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

async function parsePdfToDb(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF required" });

    const pdfPath = req.file.path;
    const pdfData = new Uint8Array(fs.readFileSync(pdfPath));
    const pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;

    // Folder untuk menyimpan gambar
    const imgFolder = path.join(__dirname, "../storage");
    if (!fs.existsSync(imgFolder)) fs.mkdirSync(imgFolder, { recursive: true });

    let fullText = "";
    const gambarMap = []; // { placeholder, path, page }

    let imgCounter = 0;

    // Ekstrak teks + gambar per halaman
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);

      // 1️⃣ Ekstrak teks
      const textContent = await page.getTextContent();
      let pageText = textContent.items.map(i => i.str).join("\n");

      // 2️⃣ Deteksi gambar di page
      const opList = await page.getOperatorList();
      for (let i = 0; i < opList.fnArray.length; i++) {
        if (opList.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
          const placeholder = `[IMAGE_${++imgCounter}]`;
          const imgName = `${Date.now()}-${uuidv4()}.png`;
          const imgPath = `/storage/${imgName}`;

          // Simpan dummy PNG (implementasi ekstrak gambar sebenarnya lebih kompleks)
          fs.writeFileSync(path.join(imgFolder, imgName), "");

          // Ganti posisi gambar di teks dengan placeholder
          pageText += ` ${placeholder}`;

          // Simpan mapping placeholder → path
          gambarMap.push({ placeholder, path: imgPath, page: pageNum });
        }
      }

      fullText += pageText + "\n";
    }

    // 3️⃣ Normalisasi line break
    fullText = fullText.replace(/\r\n/g, "\n").replace(/\n\s*\n/g, "\n");

    // 4️⃣ Split per soal berdasarkan nomor
    const sections = fullText.split(/\n(?=\d+\.)/);
    const hasil = [];

    for (const sec of sections) {
      const nomorMatch = sec.match(/^(\d+)\./);
      if (!nomorMatch) continue;

      const nomor = nomorMatch[1];

      // Ambil jawaban
      const jawabanMatch = sec.match(/Jawaban:\s*([A-D])/i);
      const jawaban = jawabanMatch ? jawabanMatch[1].toUpperCase() : "";

      // Ambil opsi
      const opsiMatches = [...sec.matchAll(/^([A-D])\.\s*(.+)$/gim)];
      const opsi = opsiMatches.map(o => o[2].trim());

      // Ambil teks soal (hapus nomor, opsi, jawaban)
      let lines = sec.split("\n");
      lines = lines.filter(l => !l.match(/^[A-D]\./) && !l.match(/Jawaban:/i));
      let soal = lines.join(" ").replace(/^\d+\./, "").trim();

      // 5️⃣ Attach gambar di soal/opsi berdasarkan placeholder
      const gambarDiSoal = gambarMap.filter(g => soal.includes(g.placeholder) || opsi.some(o => o.includes(g.placeholder)));

      hasil.push({ nomor, soal, opsi, jawaban, gambar: gambarDiSoal });
    }

    console.log("Hasil parsing PDF:", hasil);
    res.json({ message: "Parsing selesai, cek console", data: hasil });

  } catch (err) {
    console.error("Error saat parsing PDF:", err);
    res.status(500).json({ message: "Terjadi error saat parsing PDF", error: err.toString() });
  }
}

module.exports = { parsePdfToDb };
