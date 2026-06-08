const mongoose = require("mongoose");

const DAYS_OF_WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const daySlotSchema = new mongoose.Schema({
    time: { type: String, required: true }, // e.g. "09:00 AM"
    isAvailable: { type: Boolean, default: true }
}, { _id: false });

const doctorWeeklyScheduleSchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
        required: true,
        unique: true,
        index: true
    },
    sunday: [daySlotSchema],
    monday: [daySlotSchema],
    tuesday: [daySlotSchema],
    wednesday: [daySlotSchema],
    thursday: [daySlotSchema],
    friday: [daySlotSchema],
    saturday: [daySlotSchema]
}, { timestamps: true });

module.exports = mongoose.model("DoctorWeeklySchedule", doctorWeeklyScheduleSchema);
module.exports.DAYS_OF_WEEK = DAYS_OF_WEEK;
