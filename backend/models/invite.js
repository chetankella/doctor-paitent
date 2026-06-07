const mongoose = require("mongoose");

const INVITE_TYPES   = ["DEPARTMENT_ADMIN", "DOCTOR", "STAFF"];
const INVITE_STATUS  = ["PENDING", "ACCEPTED", "EXPIRED"];
const DOCTOR_ROLES   = ["OWNER", "CONSULTANT", "RESIDENT"];

const inviteSchema = new mongoose.Schema(
    {
        /** Who is being invited */
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },

        /** Invite category */
        type: {
            type: String,
            enum: INVITE_TYPES,
            required: true
        },

        /** Clinical role — only meaningful for DOCTOR type */
        role: {
            type: String,
            enum: [...DOCTOR_ROLES, null],
            default: null
        },

        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true
        },

        /** Optional — scopes the invite to a specific department */
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            default: null
        },

        /** SHA-256 hash of the raw token sent in the email */
        tokenHash: {
            type: String,
            required: true,
            unique: true
        },

        expiresAt: {
            type: Date,
            required: true
        },

        status: {
            type: String,
            enum: INVITE_STATUS,
            default: "PENDING"
        },

        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        /** Set when the invite is accepted */
        acceptedAt: {
            type: Date,
            default: null
        },

        /** Set when the user completes onboarding */
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    { timestamps: true }
);

// Fast token lookup (unique constraint above already creates this index)

// Duplicate invite prevention
inviteSchema.index({ email: 1, organizationId: 1, type: 1, status: 1 });

// Filter by org
inviteSchema.index({ organizationId: 1, status: 1 });

// MongoDB TTL — automatically deletes documents after expiresAt
// (cleanup only; status check in code is still the authoritative gate)
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Invite", inviteSchema);
