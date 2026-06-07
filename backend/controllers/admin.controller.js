const OrganizationRequest = require("../models/organizationRequest");
const User = require("../models/user");
const Doctor = require("../models/doctor");
const Organization = require("../models/organization");
const OrganizationRequestService = require("../services/organizationRequest.service");
const bcrypt = require("bcrypt");

const AuditService = require("../services/audit.service");


const setupFirstAdmin = async (req, res) => {
    try {
        // Security check: only allow if NO admins exist in the DB
        const adminCount = await User.countDocuments({ role: "admin" });
        if (adminCount > 0) {
            return res.status(403).json({ message: "An admin already exists. Please log in to create additional admins." });
        }

        const { name, email, password } = req.body;
        if (!password || password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new User({
            name,
            email,
            password: hashedPassword,
            role: "admin",
            isVerified: true,
            onboardingCompleted: true
        });

        await newAdmin.save();
        
        await AuditService.logAction({
            userId: newAdmin._id,
            action: "first_admin_setup",
            entity: "User",
            entityId: newAdmin._id,
            description: `First system admin created: ${email}`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        res.status(201).json({ success: true, message: "First Admin created successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const createAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!password || password.length < 8) {
            return res.status(400).json({ message: "password must be at least 8 characters" });
        }
        
        const existinguser = await User.findOne({ email });
        if (existinguser) {
            return res.status(400).json({ message: "email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new User({
            name,
            email,
            password: hashedPassword,
            role: "admin",
            isVerified: true,
            onboardingCompleted: true
        });
        
        await newAdmin.save();
        
        await AuditService.logAction({
            userId: req.user.id, // the admin who is creating this admin
            action: "admin_created",
            entity: "User",
            entityId: newAdmin._id,
            description: `New admin created: ${email}`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        res.status(201).json({ success: true, message: "ADMIN is Created" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


const getDashboardStats = async (req,res) => {
        try {
            const [
                totalDoctors,
                totalOrganizations,
                pendingOrgRequests,
                approvedOrgRequests,
                rejectedOrgRequests
            ] = await Promise.all([
                Doctor.countDocuments(),
                Organization.countDocuments(),
                OrganizationRequest.countDocuments({ status: "PENDING" }),
                OrganizationRequest.countDocuments({ status: "APPROVED" }),
                OrganizationRequest.countDocuments({ status: "REJECTED" })
            ]);

            res.status(200).json({
                success: true,
                data: {
                    totalDoctors,
                    totalOrganizations,
                    pendingOrganizationRequests: pendingOrgRequests,
                    approvedOrganizations: approvedOrgRequests,
                    rejectedOrganizations: rejectedOrgRequests,
                    totalPatients: 0
                }
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

const getOrganizationRequests = async (req, res) => {
    try {
        const { status, search } = req.query;
        
        const filters = {};
        if (status) {
            filters.status = status;
        }
        if (search) {
            filters.name = search;
        }

        const requests = await OrganizationRequestService.getAllRequests(filters);

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getOrganizationRequestById = async (req, res) => {
    try {
        const request = await OrganizationRequestService.getRequestById(req.params.id);

        res.status(200).json({
            success: true,
            data: request
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

const approveOrganizationRequest = async (req, res) => {
    try {
        const result = await OrganizationRequestService.approveRequest(
            req.params.id,
            req.user.id,
            req.body
        );

        res.status(200).json({
            success: true,
            message: "Organization request approved successfully",
            data: {
                organizationId: result.organization._id,
                requestId: result.request._id
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const rejectOrganizationRequest = async (req, res) => {
    try {
        const { rejectionReason } = req.body;

        if (!rejectionReason || rejectionReason.length < 10) {
            return res.status(400).json({
                success: false,
                message: "Rejection reason must be at least 10 characters"
            });
        }

        const request = await OrganizationRequestService.rejectRequest(
            req.params.id,
            req.user.id,
            rejectionReason
        );

        res.status(200).json({
            success: true,
            message: "Organization request rejected",
            data: request
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getOrganizationRequestStats = async (req, res) => {
    try {
        const stats = await OrganizationRequestService.getRequestStats();

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    setupFirstAdmin,
    createAdmin,
    getDashboardStats,
    getOrganizationRequests,
    getOrganizationRequestById,
    approveOrganizationRequest,
    rejectOrganizationRequest,
    getOrganizationRequestStats
}
