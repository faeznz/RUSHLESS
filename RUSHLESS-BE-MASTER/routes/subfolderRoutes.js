const express = require("express");
const router = express.Router();
const subfolderController = require("../controllers/subfolderController");
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

router.use(authMiddleware);

router.get("/", subfolderController.getSubfolders);
router.post("/", onlyRole(["admin", "guru"]), subfolderController.createSubfolder);
router.put("/:oldName/rename", onlyRole(["admin", "guru"]), subfolderController.renameSubfolder);
router.put("/:name/toggle-visibility", subfolderController.toggleVisibility);
router.put("/move-course", onlyRole(["admin", "guru"]), subfolderController.moveCourse);
router.delete('/:name', onlyRole(["admin", "guru"]), subfolderController.deleteSubfolder);

module.exports = router;
