const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

router.use(authMiddleware);

router.get("/user", dashboardController.getUserInfo);
router.get("/dashboard/summary", dashboardController.getSummary);
router.get("/dashboard/recent", dashboardController.getRecentExam);
router.get("/dashboard/upcoming", dashboardController.getUpcomingExams);

module.exports = router;
