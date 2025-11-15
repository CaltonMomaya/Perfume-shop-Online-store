const functions = require("firebase-functions");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: true });

exports.sendOtpEmail = functions.https.onRequest((req, res) => {
    // Apply CORS middleware FIRST
    cors(req, res, async () => {

        // Allow all origins
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Headers", "Content-Type");
        res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

        // Handle OPTIONS preflight
        if (req.method === "OPTIONS") {
            return res.status(204).send("");
        }

        if (req.method !== "POST") {
            return res.status(405).send("Method Not Allowed");
        }

        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });

        const { otp, username, role, recipientEmail } = req.body;

        try {
            await transporter.sendMail({
                from: emailUser,
                to: recipientEmail || emailUser,
                subject: `OTP Verification Code - ${username}`,
                html: `
                    <h2>OTP Verification Code</h2>
                    <p>User: <strong>${username}</strong></p>
                    <p>Role: <strong>${role}</strong></p>
                    <h1 style="background:#3498db;padding:10px;color:white;text-align:center;">
                        ${otp}
                    </h1>
                `
            });

            return res.json({ success: true, message: "OTP sent", otp });

        } catch (error) {
            console.error("Email error:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    });
});
