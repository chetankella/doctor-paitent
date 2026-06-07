const mongoose = require("mongoose");

const DEPARTMENT_STATUS = ["ACTIVE", "INACTIVE"];

const departmentSchema = new mongoose.Schema(
    {
        userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null
            },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true
        },

        departmentName: {
            type: String,
            required: true,
            trim: true
        },

        departmentEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },

        departmentCode: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String
        },

        status: {
            type: String,
            enum: DEPARTMENT_STATUS,
            default: "ACTIVE"
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
);

// Unique department per organization by name/email/code
departmentSchema.index(
    { organizationId: 1, departmentName: 1 },
    { unique: true }
);
departmentSchema.index(
    { organizationId: 1, departmentEmail: 1 },
    { unique: true }
);
departmentSchema.index(
    { organizationId: 1, departmentCode: 1 },
    { unique: true }
);

module.exports = mongoose.model("Department", departmentSchema);