import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import configRoutes from "./routes/configRoutes.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    message: "Internal server error"
  });
});

export default app;

