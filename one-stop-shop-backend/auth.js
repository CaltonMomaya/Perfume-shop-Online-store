const express = require("express");
const router = express.Router();
const sendOTP = require("./email");

router.post("/send-otp", async (req, res) => {
    const { email } = req.body;

    // generate otp
    const otp = Math.floor(100000 + Math.random() * 900000);

    try {
        await sendOTP(email, otp);
        res.json({ success: true, message: "OTP sent!", otp });
    } catch (error) {
        console.error("Email error:", error);
        res.status(500).json({ success: false, message: "Email failed" });
    }
});
