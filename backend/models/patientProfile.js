const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true
    },

    dateOfBirth: {
        type: Date,
        required: true
    },

    gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: true
    },

    bloodGroup: {
        type: String,
        enum: [
            "A+","A-","B+","B-",
            "AB+","AB-","O+","O-"
        ],
        index: true
    },

    phoneNumber: {
        type: String,
        index: true
    },

    heightCm: Number,
    weightKg: Number,
    // 🚑 Emergency Critical Alerts
    criticalAlerts: [{
        type: String 
    }],

    allergies: [String],
    chronicConditions: [String],
    currentMedications: [String],
    pastSurgeries: [String],
    familyHistory: [String],

    organDonor: {
        type: Boolean,
        default: false
    },

    lifestyle: {
        smoking: {
            type: String,
            enum: ["never", "former", "current"]
        },
        alcohol: {
            type: String,
            enum: ["none", "occasional", "regular"]
        }
    },

    emergencyContact: {
        name: String,
        relation: String,
        phone: String
    },

    insurance: {
        provider: String,
        policyNumber: String
    },

    primaryPhysician: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor"
    },

    emergencyAccessEnabled: {
        type: Boolean,
        default: true
    },

    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    status: {
        type: String,
        enum: ["active", "inactive", "suspended"],
        default: "active"
    }

}, { timestamps: true });

module.exports = mongoose.model("Patient", patientSchema);