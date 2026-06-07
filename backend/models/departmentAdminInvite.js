const mongoose = require("mongoose");

const INVITE_STATUS = ["PENDING", "ACCEPTED", "EXPIRED"];

const departmentAdminInviteSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },

        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: true
        },

        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true
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
        },

        acceptedAt: {
            type: Date,
            default: null
        },

        // Populated when the invite is accepted
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    { timestamps: true }
);

departmentAdminInviteSchema.index({ token: 1 });
departmentAdminInviteSchema.index({ email: 1, departmentId: 1, status: 1 });
departmentAdminInviteSchema.index({ organizationId: 1, status: 1 });
departmentAdminInviteSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("DepartmentAdminInvite", departmentAdminInviteSchema);
