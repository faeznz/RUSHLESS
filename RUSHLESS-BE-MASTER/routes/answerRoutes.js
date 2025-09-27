const express = require("express");
const router = express.Router();
const answerController = require("../controllers/answerController");
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

router.use(authMiddleware);

router.get("/show-result", answerController.cekTampilkanHasil); 
router.post("/", answerController.simpanJawaban);
router.get("/:course_id", answerController.getJawabanUser);
router.get("/last-attempt", answerController.getLastAttempt);


module.exports = router;
