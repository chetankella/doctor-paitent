const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },

    password: {
        type: String,
        default: null
    },

    role: {
        type: String,
        enum: ["admin", "doctor", "staff", "patient", "org_super_admin", "department_admin", "manager", ],
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    onboardingCompleted: {
        type: Boolean,
        default: false
        },

    otp: String,
    otpExpires: Date,
    otpAttempts: {
         type: Number,
        default: 0
        },
    otpBlockedUntil: Date,
    setupToken: String,
    setupTokenExpires: Date

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
