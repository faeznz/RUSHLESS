const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

router.use(authMiddleware);

router.get('/courses/:courseId/user/:userId/hasil', resultController.getUserExamResult);
router.get('/courses/:courseId/user/:userId/:attempt/jawaban-detail', resultController.getJawabanDetail);

module.exports = router;
