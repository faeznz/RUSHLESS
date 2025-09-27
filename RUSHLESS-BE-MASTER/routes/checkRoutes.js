const express = require("express");
const router = express.Router();
const checkController = require("../controllers/checkController");
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

router.use(authMiddleware);

router.get("/hasil", checkController.checkHasil);
router.get("/course-access", checkController.checkCourseAccess);

module.exports = router;
