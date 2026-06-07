const Joi = require("joi");

const doctorSetPasswordSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    password: Joi.string().min(8).max(50).required()
});

const doctorSetupProfileSchema = Joi.object({
    licenseNumber: Joi.string().min(5).max(50).required(),
    specialization: Joi.string().min(3).max(100).required(),
    experience: Joi.number().integer().min(0).max(60).required()
});

const staffSetupFromInviteSchema = Joi.object({
    name: Joi.string().min(3).max(100).required(),
    password: Joi.string().min(8).max(50).required(),
    designation: Joi.string().min(2).max(100).required()
});

module.exports = {
    doctorSetPasswordSchema,
    doctorSetupProfileSchema,
    staffSetupFromInviteSchema
};
