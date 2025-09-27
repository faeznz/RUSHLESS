const Tesseract = require('tesseract.js');
const Jimp = require('jimp');

const parseImageWithOCR = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Tidak ada file gambar yang diunggah.' });
  }

  try {
    const imageBuffer = req.file.buffer;
    const languages = 'ind+eng+ara';

    console.log('Memulai pra-pemrosesan gambar dengan Jimp...');

    // Pra-pemrosesan gambar untuk meningkatkan akurasi OCR
    const image = await Jimp.read(imageBuffer);
    image
      .greyscale() // 1. Ubah ke hitam-putih
      .contrast(0.5) // 2. Tingkatkan kontras
      .posterize(2)  // 3. Reduksi warna untuk mempertajam (mirip threshold)
      .invert();     // 4. Balikkan warna (Tesseract kadang lebih suka teks putih di atas hitam)

    const processedImageBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

    console.log('Pra-pemrosesan selesai. Memulai proses OCR dengan Tesseract...');

    const { data: { text } } = await Tesseract.recognize(
      processedImageBuffer,
      languages,
      { 
        logger: m => { if(m.status === 'recognizing text') console.log(m) } // Log hanya saat proses pengenalan
      }
    );
    console.log('Proses OCR selesai.');

    if (!text) {
      return res.status(500).json({ message: 'Tidak ada teks yang terdeteksi oleh Tesseract OCR.' });
    }

    res.status(200).json({ text });

  } catch (error) {
    console.error('OCR Controller Error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memproses gambar.', error: error.message });
  }
};

module.exports = {
  parseImageWithOCR,
};
