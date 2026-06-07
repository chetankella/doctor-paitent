const mongoose = require("mongoose");

const ORG_ADMIN_ROLES = ["OWNER", "ADMIN", "MANAGER"];
const ORG_ADMIN_STATUS = ["ACTIVE", "INACTIVE"];

const organizationAdminSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
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

        role: {
            type: String,
            enum: ORG_ADMIN_ROLES,
            required: true
        },

        status: {
            type: String,
            enum: ORG_ADMIN_STATUS,
            default: "ACTIVE"
        },

        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        joinedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

organizationAdminSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
organizationAdminSchema.index({ organizationId: 1, status: 1 });
organizationAdminSchema.index({ organizationId: 1, departmentId: 1 });

module.exports = mongoose.model("OrganizationAdmin", organizationAdminSchema);
