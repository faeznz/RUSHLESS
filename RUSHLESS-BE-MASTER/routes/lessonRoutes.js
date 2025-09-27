const express = require("express");
const router = express.Router();
const lessonController = require("../controllers/lessonController");
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

router.use(authMiddleware);

router.post("/", onlyRole(["admin", "guru"]), lessonController.createLesson);
router.get("/course/:courseId", lessonController.getLessonsByCourse);
router.get("/:lessonId", lessonController.getLesson);
router.put("/:lessonId", onlyRole(["admin", "guru"]), lessonController.updateLesson);
router.delete("/:lessonId", onlyRole(["admin", "guru"]), lessonController.deleteLesson);
router.post("/reorder", onlyRole(["admin", "guru"]), lessonController.reorderLessons);
router.post("/:lessonId/complete", onlyRole("siswa"), lessonController.markLessonAsCompleted);
router.get("/course/:courseId/completion", onlyRole("siswa"), lessonController.getCompletionStatusForCourse);

module.exports = router;
