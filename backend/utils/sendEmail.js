const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, html) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    try {
        console.log(`[sendEmail] Attempting to send email to ${to} ...`);
        // Strip HTML tags for a plain-text fallback
        const textFallback = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

        const info = await transporter.sendMail({
            from: `"Healthcare Platform" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text: textFallback,
            html
        });
        console.log(`[sendEmail] Success! Message ID: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`[sendEmail] Error sending email to ${to}:`, error.message);
        throw error;
    }
}

module.exports = sendEmail;