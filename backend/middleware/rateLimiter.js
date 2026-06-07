const rateLimit = require("express-rate-limit");

const doctorRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10, 
    message: {
        message: "Too many requests. Please try again later."
    }
});

const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 15,
    message: "Too many OTP requests. Try later."
});

module.exports = {
    otpLimiter,
    doctorRequestLimiter
};