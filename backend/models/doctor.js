const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    specialization: {
        type: String,
        required: true
    },

    experience: {
        type: Number,
        required: true
    },

    hospitalName: {
        type: String
    },

    
    licenseEncrypted: {
        type: String,
        required: true
    },

 
    licenseHash: {
        type: String,
        required: true,
        unique: true
    },


    licenseDocumentUrl: {
        type: String,
        default: null
    },

    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "active", "suspended"],
        default: "active"
    },

    rating: {
        type: Number,
        default: 4.5
    },

    ratingCount: {
        type: Number,
        default: 10
    },

    consultationFee: {
        type: Number,
        default: 500
    },

    bio: {
        type: String,
        default: "Experienced healthcare specialist committed to patient well-being."
    },

    qualifications: {
        type: [String],
        default: ["MBBS", "MD"]
    },

    symptoms: {
        type: [String],
        default: []
    },

    profileImage: {
        type: String,
        default: ""
    },

    isAvailableForVideoConsult: {
        type: Boolean,
        default: false,
        index: true
    },

    videoConsultFee: {
        type: Number,
        default: null   // null means: use consultationFee
    }

}, { timestamps: true });

module.exports = mongoose.model("Doctor", doctorSchema);
