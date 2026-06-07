const mongoose = require("mongoose");
const crypto = require("crypto");

const accessGrantSchema = new mongoose.Schema({
    grantId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        default: null,
        index: true
    },

    scope: {
        type: String,
        enum: ["EMERGENCY", "SUMMARY", "FULL_PROFILE", "FULL_WITH_WRITE"],
        required: true
    },

    accessTokenHash: {
        type: String,
        required: true,
        index: true
    },

    source: {
        type: String,
        enum: ["PATIENT_GRANTED", "REQUEST_APPROVED", "APPOINTMENT", "ORGANIZATION"],
        required: true
    },

    reason: {
        type: String,
        default: null
    },

    status: {
        type: String,
        enum: ["ACTIVE", "EXPIRED", "REVOKED"],
        default: "ACTIVE",
        index: true
    },

    grantedAt: {
        type: Date,
        default: Date.now
    },

    expiresAt: {
        type: Date,
        required: true,
        index: true
    },

    revokedAt: {
        type: Date,
        default: null
    },

    revokedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    }
}, { timestamps: true });

/**
 * Generate a unique grant ID
 */
accessGrantSchema.statics.generateGrantId = function () {
    return `grant_${crypto.randomBytes(6).toString("hex")}`;
};

/**
 * Generate an opaque access token and return both raw + hash
 */
accessGrantSchema.statics.generateAccessToken = function () {
    const raw = `pat_${crypto.randomBytes(24).toString("base64url")}`;
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    return { raw, hash };
};

/**
 * Hash a raw access token for comparison
 */
accessGrantSchema.statics.hashToken = function (rawToken) {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
};

/**
 * Check if grant is currently valid
 */
accessGrantSchema.methods.isValid = function () {
    return this.status === "ACTIVE" && this.expiresAt > new Date();
};

// Compound indices for common queries
accessGrantSchema.index({ patientId: 1, status: 1, expiresAt: 1 });
accessGrantSchema.index({ doctorId: 1, status: 1, expiresAt: 1 });

module.exports = mongoose.model("AccessGrant", accessGrantSchema);
