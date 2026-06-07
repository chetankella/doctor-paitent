const Joi = require("joi");

const registerOrganizationSchema = Joi.object({

    name: Joi.string()
        .min(3)
        .max(150)
        .required(),

    type: Joi.string()
        .valid("HOSPITAL", "CLINIC", "LAB")
        .required(),

    description: Joi.string().allow("", null),

    contactPhone: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .required(),

    contactEmail: Joi.string()
        .email()
        .required(),

    website: Joi.string().uri().allow("", null),

    addressLine1: Joi.string().required(),
    addressLine2: Joi.string().allow("", null),

    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),

    pincode: Joi.string()
        .pattern(/^[0-9]{6}$/)
        .required(),

    clinicalEstablishmentNumber: Joi.string().allow("", null),
    GSTNumber: Joi.string().allow("", null),
    PANNumber: Joi.string().allow("", null),
    NABHAccreditationNumber: Joi.string().allow("", null)

});

const updateOrganizationSchema = Joi.object({
    name: Joi.string().min(3).max(150),
    description: Joi.string().allow("", null),
    contactPhone: Joi.string().pattern(/^[0-9]{10}$/),
    contactEmail: Joi.string().email(),
    website: Joi.string().uri().allow("", null),
    addressLine1: Joi.string(),
    addressLine2: Joi.string().allow("", null),
    city: Joi.string(),
    state: Joi.string(),
    country: Joi.string(),
    pincode: Joi.string().pattern(/^[0-9]{6}$/),
    clinicalEstablishmentNumber: Joi.string().allow("", null),
    GSTNumber: Joi.string().allow("", null),
    PANNumber: Joi.string().allow("", null),
    NABHAccreditationNumber: Joi.string().allow("", null)
}).min(1);

const inviteDoctorSchema = Joi.object({
    email: Joi.string().email().required(),
    departmentId: Joi.string().allow("", null),
    role: Joi.string().uppercase().valid("OWNER", "CONSULTANT", "RESIDENT").required()
});

const organizationRequestSchema = Joi.object({
    name: Joi.string()
        .min(3)
        .max(150)
        .required(),

    type: Joi.string()
        .valid("HOSPITAL", "CLINIC", "LAB", "TELEMEDICINE")
        .required(),

    description: Joi.string().allow("", null),

    contactPhone: Joi.string()
        .pattern(/^[0-9]{10,15}$/)
        .required(),

    contactEmail: Joi.string()
        .email()
        .required(),

    website: Joi.string().uri().allow("", null),

    addressLine1: Joi.string().required(),
    addressLine2: Joi.string().allow("", null),

    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),

    pincode: Joi.string()
        .pattern(/^[0-9]{5,10}$/)
        .required(),

    clinicalEstablishmentNumber: Joi.string().allow("", null),
    GSTNumber: Joi.string().allow("", null),
    PANNumber: Joi.string().allow("", null),
    NABHAccreditationNumber: Joi.string().allow("", null),

    superAdminEmail: Joi.string().email().required(),
    superAdminPhone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
    superAdminName: Joi.string().min(3).max(100).required()
});

const rejectOrganizationRequestSchema = Joi.object({
    rejectionReason: Joi.string()
        .min(10)
        .required()
});

const setupSuperAdminSchema = Joi.object({
    token: Joi.string()
        .required(),
    name: Joi.string()
        .min(3)
        .max(100)
        .required(),
    password: Joi.string()
        .min(8)
        .max(50)
        .required(),
    licenseNumber: Joi.string()
        .allow("", null),
    specialization: Joi.string()
        .allow("", null),
    experience: Joi.number()
        .integer()
        .min(0)
        .max(60)
        .allow(null)
});

const inviteStaffSchema = Joi.object({
    email: Joi.string().email().required(),
    departmentId: Joi.string().allow("", null),
    designation: Joi.string().min(2).max(100).required()
});

module.exports = {
    registerOrganizationSchema,
    updateOrganizationSchema,
    inviteDoctorSchema,
    inviteStaffSchema,
    organizationRequestSchema,
    rejectOrganizationRequestSchema,
    setupSuperAdminSchema
};