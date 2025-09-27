const express = require("express");
const router = express.Router();
const guruController = require("../controllers/guruController");
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

router.use(authMiddleware);

router.get("/gurus", guruController.getAllGuru);
router.get("/kelas", guruController.getAllKelas);
router.get("/guru-kelas", guruController.getGuruKelas);
router.post("/guru-kelas", onlyRole("admin"), guruController.setGuruKelas);
router.post("/guru-kelas/batch-update", onlyRole("admin"), guruController.batchUpdateGuruKelas);
router.get("/guru-kelas/nama/:nama", guruController.getKelasByNamaGuru);

module.exports = router;
