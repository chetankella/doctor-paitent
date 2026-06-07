const mongoose = require("mongoose");

const DOCTOR_ORG_ROLES = ["OWNER", "CONSULTANT", "RESIDENT"];
const DOCTOR_ORG_STATUS = ["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"];

const doctorOrganizationSchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
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
        enum: DOCTOR_ORG_ROLES,
        required: true
    },

    status: {
        type: String,
        enum: DOCTOR_ORG_STATUS,
        default: "PENDING"
    },

    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    joinedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

doctorOrganizationSchema.index({ doctorId: 1, organizationId: 1 }, { unique: true });
doctorOrganizationSchema.index({ doctorId: 1, status: 1 });
doctorOrganizationSchema.index({ organizationId: 1, departmentId: 1 });

module.exports = mongoose.model("DoctorOrganization", doctorOrganizationSchema);
