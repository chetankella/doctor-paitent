const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
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
    date: {
        type: Date, // YYYY-MM-DD start of day
        required: true,
        index: true
    },
    time: {
        type: String, // e.g., "10:00 AM"
        required: true
    },
    status: {
        type: String,
        enum: ["BOOKED", "COMPLETED", "CANCELLED"],
        default: "BOOKED",
        required: true,
        index: true
    },
    accessGrantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AccessGrant",
        default: null
    },
    shareRecordsToken: {
        type: String,
        default: null
    },
    prescriptionUrl: {
        type: String,
        default: null
    },
    prescriptionName: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentSchema);
