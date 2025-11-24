import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import configRoutes from "./routes/configRoutes.js";
import { connectToDatabase } from "./config/db.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ensureDbConnection = (() => {
  let connectionPromise;

  return () => {
    if (!connectionPromise) {
      if (!process.env.MONGODB_URI) {
        connectionPromise = Promise.reject(
          new Error("Missing MongoDB connection string (MONGODB_URI).")
        );
      } else {
        connectionPromise = connectToDatabase(process.env.MONGODB_URI);
      }
    }
    return connectionPromise;
  };
})();

ensureDbConnection().catch((error) => {
  console.error("Initial Mongo connection failed:", error.message);
});

app.use(async (_req, _res, next) => {
  try {
    await ensureDbConnection();
    next();
  } catch (error) {
    next(error);
  }
});

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/admin/mobile-config", (_req, res) => {
  res.sendFile(path.join(__dirname, "views/mobileConfig.html"));
});

app.use("/api/config", configRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    message: err.message || "Internal server error"
  });
});

export default app;

