const mongoose = require("mongoose");

const INVITE_STATUS = ["PENDING", "ACCEPTED", "EXPIRED"];
const INVITE_TYPE = ["DOCTOR", "STAFF"];

const doctorInviteSchema = new mongoose.Schema(
    {
        // doctorId is set only when an existing doctor is invited
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        // email is set when inviting someone who has no existing account
        email: {
            type: String,
            lowercase: true,
            trim: true,
            default: null
        },

        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true
        },

        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            default: null
        },

        // "DOCTOR" or "STAFF" — reuse this model for both invite types
        type: {
            type: String,
            enum: INVITE_TYPE,
            default: "DOCTOR"
        },

        role: {
            type: String,
            enum: ["OWNER", "CONSULTANT", "RESIDENT"],
            default: "CONSULTANT"
        },

        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        token: {
            type: String,
            required: true
        },

        expiresAt: {
            type: Date,
            required: true
        },

        status: {
            type: String,
            enum: INVITE_STATUS,
            default: "PENDING"
        }
    },
    { timestamps: true }
);

doctorInviteSchema.index({ token: 1 });
doctorInviteSchema.index({ email: 1, organizationId: 1, status: 1 });
doctorInviteSchema.index({ doctorId: 1, organizationId: 1, status: 1 });
doctorInviteSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("DoctorInvite", doctorInviteSchema);
