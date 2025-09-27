const express = require("express");
const router = express.Router();
const webMngController = require("../controllers/webMngController");
const multer = require("multer");
const path = require("path");
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.random().toString(36).substring(2, 8);
    cb(null, unique + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Format file tidak didukung"), false);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

// Public route
router.get("/web-settings", webMngController.getSettings);
router.get("/mode", webMngController.getAppMode);
router.post("/mode", webMngController.setAppMode);

// Apply authentication to all subsequent routes
router.use(authMiddleware);

// Protected routes are now individually authorized
router.put("/web-settings", onlyRole("admin"), upload.single("logo"), webMngController.updateSettings);
router.get("/db/tables", onlyRole("admin"), webMngController.getAllTables);
router.delete("/db/:tableName", onlyRole("admin"), webMngController.deleteTable);
router.post("/db/reset", onlyRole("admin"), webMngController.resetDatabase);
router.post("/restart-server", onlyRole("admin"), webMngController.restartServer);

router.get("/cors-config", onlyRole("admin"), webMngController.getCorsConfig);
router.post("/cors-config", onlyRole("admin"), webMngController.updateCorsConfig);

module.exports = router;