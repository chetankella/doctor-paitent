const Joi = require("joi");

const createDepartmentSchema = Joi.object({
    departmentName: Joi.string().min(2).max(150).required(),
    departmentEmail: Joi.string().email().required(),
    adminEmail: Joi.string().email().required(),
    description: Joi.string().allow("", null)
});

const acceptInviteSchema = Joi.object({
    token: Joi.string().required(),
    name: Joi.string().min(2).max(150).required(),
    password: Joi.string().min(8).max(128).required()
});

module.exports = {
    createDepartmentSchema,
    acceptInviteSchema
};

