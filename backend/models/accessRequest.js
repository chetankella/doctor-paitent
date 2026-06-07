const mongoose = require("mongoose");
const crypto = require("crypto");

const accessRequestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    patientEmail: {
        type: String,
        required: true
    },

    scope: {
        type: String,
        enum: ["SUMMARY", "FULL_PROFILE", "FULL_WITH_WRITE"],
        required: true
    },

    reason: {
        type: String,
        required: true
    },

    requestedDays: {
        type: Number,
        required: true,
        min: 1,
        max: 365
    },

    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED", "EXPIRED"],
        default: "PENDING",
        index: true
    },

    respondedAt: {
        type: Date,
        default: null
    },

    grantId: {
        type: String,
        default: null // populated on approval, links to AccessGrant
    },

    expiresAt: {
        type: Date,
        required: true,
        index: true
        // request itself expires in 7 days if not answered
    }
}, { timestamps: true });

/**
 * Generate a unique request ID
 */
accessRequestSchema.statics.generateRequestId = function () {
    return `req_${crypto.randomBytes(6).toString("hex")}`;
};

// Compound index for patient's pending requests
accessRequestSchema.index({ patientId: 1, status: 1 });
accessRequestSchema.index({ doctorId: 1, status: 1 });

module.exports = mongoose.model("AccessRequest", accessRequestSchema);
