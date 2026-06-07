const mongoose = require("mongoose");

const ORGANIZATION_TYPES = ["HOSPITAL", "CLINIC", "LAB", "TELEMEDICINE"];
const ORGANIZATION_STATUS = ["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION"];
const VERIFICATION_STATUS = ["PENDING", "VERIFIED", "REJECTED"];

const organizationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        type: {
            type: String,
            enum: ORGANIZATION_TYPES,
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

        // Address
        addressLine1: {
            type: String,
            required: true
        },
        addressLine2: {
            type: String
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

        // India legal / verification
        clinicalEstablishmentNumber: {
            type: String,
            trim: true
        },
        GSTNumber: {
            type: String,
            trim: true
        },
        PANNumber: {
            type: String,
            trim: true
        },
        NABHAccreditationNumber: {
            type: String,
            trim: true
        },

        // Operational configuration
        subscriptionPlan: {
            type: String,
            default: "FREE"
        },
        maxDoctors: {
            type: Number,
            default: 10
        },
        maxStaff: {
            type: Number,
            default: 50
        },
        status: {
            type: String,
            enum: ORGANIZATION_STATUS,
            default: "PENDING_VERIFICATION"
        },

        createdByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        superAdminUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        
        verifiedByAdminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        verificationStatus: {
            type: String,
            enum: VERIFICATION_STATUS,
            default: "PENDING"
        },
        verificationNotes: {
            type: String
        },

        superAdminInviteToken: {
            type: String,
            default: null
        },
        superAdminInviteExpires: {
            type: Date,
            default: null
        },

        // Copied from OrganizationRequest on approval — used by setupSuperAdmin
        superAdminEmail: {
            type: String,
            lowercase: true,
            trim: true,
            default: null
        },
        superAdminName: {
            type: String,
            default: null
        },
        superAdminPhone: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
);

// Indexes
organizationSchema.index({ name: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ verificationStatus: 1 });
organizationSchema.index({ clinicalEstablishmentNumber: 1 }, { sparse: true, unique: true });
organizationSchema.index({ GSTNumber: 1 }, { sparse: true, unique: true });
organizationSchema.index({ PANNumber: 1 }, { sparse: true, unique: true });
organizationSchema.index({ NABHAccreditationNumber: 1 }, { sparse: true });

module.exports = mongoose.model("Organization", organizationSchema);
