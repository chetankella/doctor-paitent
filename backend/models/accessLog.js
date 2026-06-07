const mongoose = require("mongoose");

const accessLogSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    accessedBy: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null // null for anonymous emergency scans
        },
        type: {
            type: String,
            enum: ["DOCTOR", "EMERGENCY_SCAN", "PATIENT_SELF", "SYSTEM"],
            required: true
        },
        name: {
            type: String,
            default: "Anonymous"
        },
        email: {
            type: String,
            default: null
        }
    },

    accessType: {
        type: String,
        enum: ["GRANT", "EMERGENCY_QR", "REQUEST", "SELF"],
        required: true
    },

    grantId: {
        type: String,
        default: null
    },

    referenceCode: {
        type: String,
        default: null
    },

    scope: {
        type: String,
        enum: ["EMERGENCY", "SUMMARY", "FULL_PROFILE", "FULL_WITH_WRITE"],
        required: true
    },

    endpoint: {
        type: String,
        required: true
    },

    method: {
        type: String,
        enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        required: true
    },

    ipAddress: {
        type: String,
        default: null
    },

    userAgent: {
        type: String,
        default: null
    },

    responseStatus: {
        type: Number,
        default: null
    },

    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: false });

// Compound indices for common queries
accessLogSchema.index({ patientId: 1, timestamp: -1 });
accessLogSchema.index({ "accessedBy.userId": 1, timestamp: -1 });

// TTL index — auto-delete logs older than 2 years (730 days)
accessLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 730 * 24 * 60 * 60 });

module.exports = mongoose.model("AccessLog", accessLogSchema);
