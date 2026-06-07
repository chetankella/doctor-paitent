
const Joi = require("joi");

const verifyOtpSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().trim().min(4).max(10).required()
});

const resendOtpSchema = Joi.object({
    email: Joi.string().email().required()
});

const registerPatientSchema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(50).required()
});

const generateAccessTokenSchema = Joi.object({
    doctorEmail: Joi.string().email().required(),
    scope: Joi.string().valid("SUMMARY", "FULL_PROFILE", "FULL_WITH_WRITE").default("FULL_PROFILE"),
    expiryDays: Joi.number().integer().min(1).max(365).default(30)
});

const accessByEmailSchema = Joi.object({
    patientEmail: Joi.string().email().required()
});

const patientProfileSchema = Joi.object({

    dateOfBirth: Joi.date().required(),

    gender: Joi.string()
        .valid("male", "female", "other")
        .required(),

    bloodGroup: Joi.string()
        .valid(
            "A+","A-","B+","B-",
            "AB+","AB-","O+","O-"
        ),

    phoneNumber: Joi.string()
        .pattern(/^[0-9]{10}$/),

    heightCm: Joi.number().min(30).max(250),
    weightKg: Joi.number().min(2).max(300),

    allergies: Joi.array().items(Joi.string()),
    chronicConditions: Joi.array().items(Joi.string()),
    currentMedications: Joi.array().items(Joi.string()),
    pastSurgeries: Joi.array().items(Joi.string()),
    familyHistory: Joi.array().items(Joi.string()),

    lifestyle: Joi.object({
        smoking: Joi.string().valid("never", "former", "current"),
        alcohol: Joi.string().valid("none", "occasional", "regular")
    }),

    emergencyContact: Joi.object({
        name: Joi.string(),
        relation: Joi.string(),
        phone: Joi.string()
    }),

    insurance: Joi.object({
        provider: Joi.string(),
        policyNumber: Joi.string()
    }),

    address: Joi.object({
        line1: Joi.string(),
        city: Joi.string(),
        state: Joi.string(),
        country: Joi.string(),
        pincode: Joi.string()
    })

});


module.exports = {

    verifyOtpSchema,
    resendOtpSchema,
    registerPatientSchema,
    generateAccessTokenSchema,
    accessByEmailSchema,
    patientProfileSchema
};