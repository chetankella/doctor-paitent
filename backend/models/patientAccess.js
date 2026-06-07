const mongoose = require("mongoose");

const patientAccessSchema = new mongoose.Schema({

    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true,
        index: true
    },

    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
        required: true,
        index: true
    },

    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        default: null,
        index: true
    },

    accessType: {
        type: String,
        enum: ["EMERGENCY", "APPOINTMENT", "MANUAL", "ORGANIZATION"],
        required: true,
        index: true
    },

    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
        // appointmentId OR qrTokenId
    },

    scope: {
        type: String,
        enum: ["SUMMARY", "FULL_PROFILE", "FULL_WITH_WRITE"],
        required: true
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

    status: {
        type: String,
        enum: ["ACTIVE", "EXPIRED", "REVOKED"],
        default: "ACTIVE",
        index: true
    },

    createdBy: {
        type: String,
        enum: ["SYSTEM", "PATIENT", "ADMIN"],
        required: true
    }

}, { timestamps: true });

module.exports = mongoose.model("PatientAccess", patientAccessSchema);