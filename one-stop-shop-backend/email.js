const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "nyankieyacalton@gmail.com",
        pass: "ncef veje kaex qjhb"
    }
});

async function sendOTP(email, otp) {
    const mailOptions = {
        from: "Your Shop <YOUR_GMAIL@gmail.com>",
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP is: ${otp}`
    };

    await transporter.sendMail(mailOptions);
}

module.exports = sendOTP;
