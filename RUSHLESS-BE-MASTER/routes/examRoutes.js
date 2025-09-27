const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");
const { streamSession } = require("../controllers/examSSE");
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

router.get("/session/stream", streamSession);

router.use(authMiddleware);

router.get("/siswa", examController.getSiswaWithStatus);
router.delete("/reset/:course_id", onlyRole("admin"), examController.resetUjian);
router.post("/logout-user", onlyRole("admin"), examController.logoutUser);
router.post("/lock-user", onlyRole("admin"), examController.lockLogin);
router.post("/unlock-user", onlyRole("admin"), examController.unlockLogin);
router.post("/add-timer", onlyRole("admin"), examController.addTimer);
router.post("/reset-kelas", onlyRole("admin"), examController.resetUjianByKelas);
router.post("/reset-semua", onlyRole("admin"), examController.resetSemuaMengerjakan);
router.post("/unlock-all", onlyRole("admin"), examController.unlockAllUsers);
router.post("/status", examController.setStatusUjian);


module.exports = router;
