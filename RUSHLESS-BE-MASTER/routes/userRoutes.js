const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const onlyRole = require("../middlewares/onlyRole");

router.get("/users", authMiddleware, userController.getAllUsers);
router.get("/users/:id", authMiddleware, userController.getUserById);
router.post("/users", onlyRole("admin"), authMiddleware, userController.createUser);
router.put("/users/:id/change-password", authMiddleware, userController.changePassword);
router.put("/users/:id", onlyRole("admin"), authMiddleware, userController.updateUser);
router.delete("/users/:id", onlyRole("admin"), authMiddleware, userController.deleteUser);
router.post("/users/import", onlyRole("admin"), authMiddleware, userController.importUsers);

module.exports = router;
