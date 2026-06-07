const mongoose = require("mongoose");
const crypto = require("crypto");

const clinicalNoteSchema = new mongoose.Schema({
    noteId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    grantId: {
        type: String,
        required: true,
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

    type: {
        type: String,
        enum: ["DIAGNOSIS", "PRESCRIPTION", "OBSERVATION", "FOLLOW_UP"],
        required: true
    },

    title: {
        type: String,
        required: true,
        maxlength: 200
    },

    content: {
        type: String,
        required: true
        // Should be encrypted at rest in production
    },

    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],

    severity: {
        type: String,
        enum: ["low", "moderate", "high", "critical"],
        default: "low"
    },

    followUpDate: {
        type: Date,
        default: null
    },

    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });

/**
 * Generate a unique note ID
 */
clinicalNoteSchema.statics.generateNoteId = function () {
    return `note_${crypto.randomBytes(6).toString("hex")}`;
};

// Don't return soft-deleted notes by default
clinicalNoteSchema.pre(/^find/, function () {
    if (!this.getQuery().isDeleted) {
        this.where({ isDeleted: false });
    }
});

// Compound indices
clinicalNoteSchema.index({ patientId: 1, doctorId: 1 });
clinicalNoteSchema.index({ grantId: 1, isDeleted: 1 });

module.exports = mongoose.model("ClinicalNote", clinicalNoteSchema);
