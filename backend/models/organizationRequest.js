const mongoose = require("mongoose");

const organizationRequestSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    type: {
        type: String,
        enum: ["HOSPITAL", "CLINIC", "LAB", "TELEMEDICINE"],
        required: true
    },

    description: {
        type: String,
        default: null
    },

    contactPhone: {
        type: String,
        required: true
    },

    contactEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },

    website: {
        type: String,
        default: null
    },

    addressLine1: {
        type: String,
        required: true
    },

    addressLine2: {
        type: String,
        default: null
    },

    city: {
        type: String,
        required: true
    },

    state: {
        type: String,
        required: true
    },

    country: {
        type: String,
        required: true,
        default: "India"
    },

    pincode: {
        type: String,
        required: true
    },

    clinicalEstablishmentNumber: {
        type: String,
        default: null
    },

    GSTNumber: {
        type: String,
        default: null
    },

    PANNumber: {
        type: String,
        default: null
    },

    NABHAccreditationNumber: {
        type: String,
        default: null
    },

    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING"
    },

    submittedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    superAdminEmail: {
            type: String,
            lowercase: true,
            trim: true,
            required: true
        },

        superAdminPhone: {
            type: String,
            required: true
        },

        superAdminName: {
            type: String,
            required: true
        },

    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    reviewedAt: {
        type: Date,
        default: null
    },

    rejectionReason: {
        type: String,
        default: null
    }

}, { timestamps: true });

organizationRequestSchema.index({ status: 1 });
organizationRequestSchema.index({ contactEmail: 1 });
organizationRequestSchema.index({ clinicalEstablishmentNumber: 1 });
organizationRequestSchema.index({ GSTNumber: 1 });
organizationRequestSchema.index({ PANNumber: 1 });

module.exports = mongoose.model("OrganizationRequest", organizationRequestSchema);
