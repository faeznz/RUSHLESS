const express = require("express");
const router = express.Router();
const controller = require("../controllers/studentWorkLogController");
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

router.use(authMiddleware);

router.post("/", controller.logJawaban);
router.get("/course/:course_id", controller.getLogByCourse);
router.get("/course/:courseId/user/:userId/attempt/:attemp", controller.getLogDetail);

module.exports = router;
