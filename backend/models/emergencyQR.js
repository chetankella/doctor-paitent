const mongoose = require("mongoose");
const crypto = require("crypto");

const emergencyQRSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    referenceCode: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    status: {
        type: String,
        enum: ["ACTIVE", "EXPIRED", "REVOKED"],
        default: "ACTIVE",
        index: true
    },

    expiresAt: {
        type: Date,
        required: true,
        index: true
    },

    maxScans: {
        type: Number,
        default: 10
    },

    scansUsed: {
        type: Number,
        default: 0
    },

    includeInsurance: {
        type: Boolean,
        default: false
    },

    qrCodeImage: {
        type: String // base64 data URL
    },

    revokedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

/**
 * Generate a unique reference code in format EMR-XXXX-XXXX
 */
emergencyQRSchema.statics.generateReferenceCode = function () {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
    let part1 = "", part2 = "";
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 4; i++) {
        part1 += chars[bytes[i] % chars.length];
        part2 += chars[bytes[i + 4] % chars.length];
    }
    return `EMR-${part1}-${part2}`;
};

/**
 * Check if this QR is still valid (not expired, not revoked, scans remaining)
 */
emergencyQRSchema.methods.isValid = function () {
    return (
        this.status === "ACTIVE" &&
        this.expiresAt > new Date() &&
        this.scansUsed < this.maxScans
    );
};

/**
 * Record a scan and return updated doc
 */
emergencyQRSchema.methods.recordScan = async function () {
    this.scansUsed += 1;
    if (this.scansUsed >= this.maxScans) {
        this.status = "EXPIRED";
    }
    return this.save();
};

module.exports = mongoose.model("EmergencyQR", emergencyQRSchema);
