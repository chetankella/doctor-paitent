const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
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

        designation: {
            type: String,
            required: true,
            trim: true
        },

        status: {
            type: String,
            enum: ["active", "inactive", "suspended"],
            default: "active"
        }
    },
    { timestamps: true }
);

staffSchema.index({ organizationId: 1, status: 1 });
staffSchema.index({ departmentId: 1, status: 1 });

module.exports = mongoose.model("Staff", staffSchema);
