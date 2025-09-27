const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { mulaiUjian, kirimJawaban, selesaiUjian, tandaiRagu } = require('../controllers/ujianController');
const soalController = require('../controllers/soalController');
const { checkPermission } = require('../controllers/permissionCourseController');

router.post('/mulai', mulaiUjian);
router.post('/jawab', kirimJawaban);
router.post('/ragu', tandaiRagu);
router.post('/selesai', selesaiUjian); 

router.get('/course/soal', soalController.getAllSoalByCourse);
router.get('/course/:courseId/:userId/permission', checkPermission);

module.exports = router;
