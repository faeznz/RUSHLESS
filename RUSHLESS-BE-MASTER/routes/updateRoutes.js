const express = require("express");
const router = express.Router();
const updateController = require("../controllers/updateController");
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

// Rute untuk streaming log pembaruan
router.get("/stream", authMiddleware, updateController.streamUpdateLogs);

// Semua rute di bawah ini memerlukan otentikasi dan peran admin
router.use(authMiddleware);
router.use(onlyRole("admin"));

// Rute untuk memeriksa pembaruan
router.get("/check", updateController.checkUpdate);

// Rute untuk menginstal pembaruan
router.post("/install", updateController.installUpdate);

module.exports = router;