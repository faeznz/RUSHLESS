require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const dbPromise = require("./models/database"); // koneksi DB
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 5000;

const corsOriginsPath = path.join(__dirname, "cors_origins.json");

// 🔹 Setup CORS dinamis dari file JSON
async function setupCors() {
  let allowedOrigins = [];
  try {
    if (fs.existsSync(corsOriginsPath)) {
      const originsJson = fs.readFileSync(corsOriginsPath, "utf8");
      allowedOrigins = JSON.parse(originsJson);
    } else {
      // Fallback jika file tidak ada
      allowedOrigins = ["http://localhost:3000"];
      fs.writeFileSync(corsOriginsPath, JSON.stringify(allowedOrigins, null, 2));
    }
  } catch (error) {
    console.error("❌ Gagal membaca atau membuat file CORS origins:", error);
    allowedOrigins = ["http://localhost:3000"];
  }

  console.log("ℹ️ Origin CORS yang diizinkan:", allowedOrigins);

  app.use(cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (misal: dari Postman, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 Origin ditolak: ${origin}`);
        callback(new Error("Origin tidak diizinkan oleh CORS"));
      }
    },
    credentials: true
  }));
}

// 🔹 Inisialisasi aplikasi
(async () => {
  await setupCors();

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(cookieParser());
  app.use("/api/uploads", express.static(path.join(__dirname, "public", "uploads")));
  app.use(morgan(":method :url :status :res[content-length] - :response-time ms"));

  // === ROUTES ===
  const authRoutes = require("./routes/authRoutes");
  const sessionRoutes = require("./routes/sessionRoutes");
  const userRoutes = require("./routes/userRoutes");
  const kelasRoutes = require("./routes/kelasRoutes");
  const courseRoutes = require("./routes/courseRoutes");
  const answerRoutes = require("./routes/answerRoutes");
  const dashboardRoutes = require("./routes/dashboardRoutes");
  const resultRoutes = require("./routes/resultRoutes");
  const answerTrailRoutes = require("./routes/answerTrailRoutes");
  const subfolderRoutes = require("./routes/subfolderRoutes");
  const checkRoutes = require("./routes/checkRoutes");
  const studentworklog = require("./routes/studentWorkLogRoutes");
  const examRoutes = require("./routes/examRoutes");
  const guruRoutes = require("./routes/guruRoutes");
  const uploadRoutes = require("./routes/uploadRoutes");
  const webMngRoutes = require("./routes/webMngRoutes");
  const ocrRoutes = require("./routes/ocrRoutes");
  const lessonRoutes = require("./routes/lessonRoutes");
  const updateRoutes = require("./routes/updateRoutes"); // Impor rute pembaruan

  app.use("/api/exam", examRoutes);
  app.use("/api/studentworklog", studentworklog);
  app.use("/api/check", checkRoutes);
  app.use("/api/answertrail", answerTrailRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api", webMngRoutes);
  app.use("/api/jawaban", answerRoutes);
  app.use("/api", guruRoutes);
  app.use("/api", userRoutes);
  app.use("/api/session", sessionRoutes);
  app.use("/api/data/kelas", kelasRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api", dashboardRoutes);
  app.use("/api", resultRoutes);
  app.use("/api/subfolders", subfolderRoutes);
  app.use("/api", uploadRoutes);
  app.use("/api", ocrRoutes);
  app.use("/api/lessons", lessonRoutes);
  app.use("/api/update", updateRoutes); // Daftarkan rute pembaruan

  // === SERVICES ===
  const sessionController = require("./controllers/sessionController");
  sessionController.startAutoSessionChecker();

  const cleanUploads = require("./utils/cleanUploads");
  cleanUploads();
  setInterval(cleanUploads, 24 * 60 * 60 * 1000);

  app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server jalan di http://0.0.0.0:${PORT}`);
});
})
();
