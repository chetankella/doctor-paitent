const mongoose = require("mongoose");

const doctorAvailabilitySchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
        required: true,
        index: true
    },
    date: {
        type: Date, // YYYY-MM-DD (start of day)
        required: true,
        index: true
    },
    slots: [
        {
            time: {
                type: String, // e.g. "10:00 AM"
                required: true
            },
            isBooked: {
                type: Boolean,
                default: false
            },
            bookedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null
            }
        }
    ]
}, { timestamps: true });

// Ensure unique availability document per doctor per day
doctorAvailabilitySchema.index({ doctorId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DoctorAvailability", doctorAvailabilitySchema);
