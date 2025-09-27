const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const mammoth = require("mammoth");
const unzipper = require("unzipper");
const { v4: uuidv4 } = require("uuid");

// Regex deteksi soal & opsi
const questionNumberRegex = /^\s*\d+[\.\)]?\s*/;
const optionRegex = /^\s*[A-Ea-e][\.\)]?\s*/;
const answerRegex = /^JAWABAN\s*[:：-]?\s*([A-Ea-e])/i;
const keywordQuestionRegex = /(soal|pertanyaan)/i;
const keywordOptionRegex = /^(pilihan|opsi)\s+[A-Ea-e]/i;

function cleanHtml(html) {
  return html.replace(/\r?\n|\r/g, " ").replace(/\s\s+/g, " ").trim();
}

const parseZip = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ message: "Tidak ada file .docx yang diunggah." });
  }

  try {
    // --- STEP 1: Convert DOCX → HTML dengan Mammoth (gambar inline base64) ---
    const { value: html } = await mammoth.convertToHtml(
      { buffer: req.file.buffer },
      {
        convertImage: mammoth.images.inline((element) => {
          return element.read("base64").then((imageBuffer) => {
            return {
              src: `data:${element.contentType};base64,${imageBuffer}`,
            };
          });
        }),
      }
    );

    // --- STEP 2: Parsing soal dari HTML ---
    const $ = cheerio.load(html);
    const questions = [];
    let currentQuestion = null;

    $("p").each((_, element) => {
      const el = $(element);
      let innerHtml = el.html() || "";
      innerHtml = innerHtml.trim();
      const text = cleanHtml(el.text().trim());

      if (!text && !el.find("img").length) return;

      // Deteksi soal baru
      if (questionNumberRegex.test(text) || keywordQuestionRegex.test(text)) {
        if (currentQuestion) questions.push(currentQuestion);
        currentQuestion = {
          soal: cleanHtml(
            innerHtml
              .replace(questionNumberRegex, "")
              .replace(keywordQuestionRegex, "")
          ),
          opsi: [],
          jawaban: "",
          tipe_soal: "pilihan_ganda",
          detected_by: questionNumberRegex.test(text) ? "regex" : "keyword",
        };
        return;
      }

      if (!currentQuestion) return;

      // Deteksi jawaban
      if (answerRegex.test(text)) {
        const match = text.match(answerRegex);
        currentQuestion.jawaban = match[1].toUpperCase();
        questions.push(currentQuestion);
        currentQuestion = null;
        return;
      }

      // Deteksi opsi
      if (
        optionRegex.test(text) ||
        keywordOptionRegex.test(text) ||
        el.is("li")
      ) {
        currentQuestion.opsi.push(
          cleanHtml(
            innerHtml.replace(optionRegex, "").replace(keywordOptionRegex, "")
          )
        );
        return;
      }

      console.log(innerHtml)

      // Tambahan ke soal (teks/gambar)
      currentQuestion.soal += `<br>${innerHtml}`;
    });

    if (currentQuestion) questions.push(currentQuestion);

    // Cleanup
    questions.forEach((q) => {
      q.soal = q.soal.replace(/^<br>/, "").trim();
      if (q.opsi.length === 0 || !q.jawaban) {
        console.warn("⚠️ Soal mungkin incomplete:", q.soal);
      }
    });

    res.status(200).json(questions);
  } catch (err) {
    console.error("❌ Error parsing docx:", err);
    res
      .status(500)
      .json({ message: "Gagal memproses file docx", error: err.message });
  }
};

module.exports = { parseZip };
