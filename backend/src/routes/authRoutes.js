const express = require("express");

const {
  sendOtp,
  verifyOtp,
} = require("../controllers/authController");

const router = express.Router();


// POST /api/auth/send-otp
router.post("/send-otp", sendOtp);


// POST /api/auth/verify-otp
router.post("/verify-otp", verifyOtp);


module.exports = router;