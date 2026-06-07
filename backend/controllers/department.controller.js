const mongoose = require("mongoose");
const Department = require("../models/department");
const DepartmentService = require("../services/department.service");
const { withTenant } = require("../services/tenantQuery.service");

const createDepartment = async (req, res) => {
    try {
        const { departmentName, departmentEmail, description, adminEmail } = req.body;

        const organizationId = req.organizationId;

        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: "Organization not found for this user"
            });
        }

        const result = await DepartmentService.createDepartment(
            { departmentName, departmentEmail, description, adminEmail },
            req.user.id,
            organizationId
        );

        res.status(201).json({
            success: true,
            message: "Department created successfully",
            data: {
                department: {
                    id: result.department._id,
                    name: result.department.departmentName,
                    email: result.department.departmentEmail,
                    code: result.department.departmentCode,
                    description: result.department.description,
                    status: result.department.status
                },
                invite: result.invite ? {
                    id: result.invite._id,
                    email: result.invite.email,
                    expiresAt: result.invite.expiresAt
                } : null
            }
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Department already exists for this organization"
            });
        }
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const listDepartments = async (req, res) => {
    try {
        const DoctorOrganization = require("../models/doctorOrganization");
        const Staff = require("../models/staff");

        const departments = await DepartmentService.getDepartments(req.organizationId);

        // Enrich with counts in parallel
        const enriched = await Promise.all(
            departments.map(async (dept) => {
                const [doctorCount, staffCount] = await Promise.all([
                    DoctorOrganization.countDocuments({
                        organizationId: req.organizationId,
                        departmentId: dept._id,
                        status: "ACTIVE"
                    }),
                    Staff.countDocuments({
                        organizationId: req.organizationId,
                        departmentId: dept._id,
                        status: "active"
                    })
                ]);
                const deptObj = dept.toObject();
                return { ...deptObj, doctorCount, staffCount };
            })
        );

        res.json({
            success: true,
            data: enriched
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const verifyInviteToken = async (req, res) => {
    try {
        const { token } = req.params;

        const result = await DepartmentService.verifyInviteToken(token);

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const acceptInvite = async (req, res) => {
    try {
        const { token, name, password } = req.body;

        if (!token || !name || !password) {
            return res.status(400).json({
                success: false,
                message: "Token, name, and password are required"
            });
        }

        const result = await DepartmentService.acceptInvite(token, { name, password });

        res.status(201).json({
            success: true,
            message: "Department admin account created successfully",
            data: {
                userId: result.user._id,
                email: result.user.email,
                organizationId: result.organizationId
            }
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createDepartment,
    listDepartments,
    verifyInviteToken,
    acceptInvite
};
