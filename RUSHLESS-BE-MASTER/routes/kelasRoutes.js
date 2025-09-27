const express = require("express");
const router = express.Router();
const kelasController = require("../controllers/kelasController");
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

router.use(authMiddleware);

router.post("/",  onlyRole("admin"), kelasController.tambahKelas);
router.get("/", kelasController.getSemuaKelas);
router.delete("/:id", onlyRole("admin"), kelasController.hapusKelas);
router.put("/:id", onlyRole("admin"), kelasController.ubahKelas);

module.exports = router;
