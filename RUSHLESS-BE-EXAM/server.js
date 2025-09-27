require('dotenv').config();
const express = require('express');
const cors  = require('cors');
const logger = require('./utils/logger');
const checkDB = require('./utils/dbCheck');

const app = express();
const PORT = process.env.PORT || 4000;

// ---------- middleware log ----------
app.use((req, res, next) => {
  logger(`${req.method} ${req.originalUrl} - ${req.ip}`);
  next();
});

const allowedOrigins = ["http://localhost:3000", "http://192.168.0.12:3000"];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin); // allow
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());

// ---------- routes ----------
const sseRoutes   = require('./routes/sseRoutes');
const ujianRoutes = require('./routes/ujianRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/api/v1/stream', sseRoutes);
app.use('/api/v1/ujian', ujianRoutes);
app.use('/api/v1/auth', authRoutes);

// ---------- error 404 ----------
app.use((req, res) => {
  logger(`404 - ${req.originalUrl}`);
  res.status(404).json({ message: 'Endpoint tidak ditemukan' });
});

// ---------- error handler ----------
app.use((err, req, res, next) => {
  logger(`ERROR - ${err.message}`);
  res.status(500).json({ message: 'Internal server error' });
});

(async () => {
  await checkDB();
  app.listen(PORT, "0.0.0.0", () => logger(`🚀 Server ujian berjalan di port ${PORT}`));
})();