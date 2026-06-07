const mongoose = require("mongoose");

const appointmentMessageSchema = new mongoose.Schema({
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
        required: true,
        index: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    senderRole: {
        type: String,
        enum: ["doctor", "patient"],
        required: true
    },
    content: {
        type: String,
        default: ""
    },
    fileUrl: {
        type: String,
        default: null
    },
    fileName: {
        type: String,
        default: null
    },
    fileType: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model("AppointmentMessage", appointmentMessageSchema);
