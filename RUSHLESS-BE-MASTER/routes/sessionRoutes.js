const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

router.use(authMiddleware);

router.post("/", sessionController.updateSessionStatus);

module.exports = router;
