const express = require("express");
const router = express.Router();

// ✅ Safaricom callback URL
router.post("/callback", (req, res) => {
    console.log("🔥 SAFARicom CALLBACK RECEIVED 🔥");
    console.log(JSON.stringify(req.body, null, 2));

    // MUST respond with 200 so Safaricom stops retrying
    res.status(200).json({ message: "Callback received successfully" });
});

module.exports = router;
