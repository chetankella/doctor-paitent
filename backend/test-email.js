require('dotenv').config();
const nodemailer = require("nodemailer");

async function testEmail() {
    try {
        console.log("Checking credentials...");
        console.log("USER:", process.env.EMAIL_USER);
        
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        console.log("Verifying connection to Gmail SMTP...");
        await transporter.verify();
        console.log("Connection verified!");

        console.log("Attempting to send a test email to the user email...");
        await transporter.sendMail({
            from: `"Test Script" <${process.env.EMAIL_USER}>`,
            to: "test@example.com", // Dummy email, or send to self
            subject: "Test Delivery",
            text: "This is a test from the backend.",
            html: "<p>This is a test</p>"
        });

        console.log("Test email sent smoothly!");
    } catch (e) {
        console.error("Error during email test:", e.message);
    }
}

testEmail();
