const express = require("express");
const router = express.Router();
const { login, isLogin, refreshToken, logout } = require("../controllers/authController");

router.post("/login", login);
router.get("/islogin", isLogin);
router.get("/refresh-token", refreshToken);
router.post("/logout", logout);

module.exports = router;
