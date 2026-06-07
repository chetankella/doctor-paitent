const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const Organization = require("../models/organization");
const User = require("../models/user");
const OrganizationAdmin = require("../models/organizationAdmin");
const Doctor = require("../models/doctor");
const DoctorOrganization = require("../models/doctorOrganization");
const { encrypt } = require("../utils/licCrypto");
const { logAction } = require("../services/audit.service");

const setupSuperAdmin = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { token, name, password, licenseNumber, specialization, experience } = req.body;

        if (!token || !name || !password) {
            return res.status(400).json({
                success: false,
                message: "Token, name, and password are required"
            });
        }

        session.startTransaction();

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const organization = await Organization.findOne({
            superAdminInviteToken: hashedToken,
            superAdminInviteExpires: { $gt: Date.now() }
        }).session(session);

        if (!organization) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Invalid or expired setup token"
            });
        }

        const existingUser = await User.findOne({ email: organization.superAdminEmail }).session(session);
        
        let user;
        if (existingUser) {
            user = existingUser;
            user.name = name;
            user.password = await bcrypt.hash(password, 10);
            user.isVerified = true;
            user.onboardingCompleted = true;
            user.setupToken = undefined;
            user.setupTokenExpires = undefined;
            await user.save({ session });
        } else {
            const userResults = await User.create([{
                name: name || organization.superAdminName,
                email: organization.superAdminEmail,
                password: await bcrypt.hash(password, 10),
                role: organization.type === "CLINIC" ? "doctor" : "org_super_admin",
                isVerified: true,
                onboardingCompleted: true
            }], { session });
            user = userResults[0];
        }

        const adminResults = await OrganizationAdmin.create([{
            userId: user._id,
            organizationId: organization._id,
            role: "OWNER",
            status: "ACTIVE",
            joinedAt: new Date()
        }], { session });

        organization.superAdminUserId = user._id;
        organization.createdByUserId = user._id;
        organization.status = "ACTIVE";
        organization.superAdminInviteToken = undefined;
        organization.superAdminInviteExpires = undefined;
        await organization.save({ session });

        let doctor = null;
        if (organization.type === "CLINIC" && licenseNumber && specialization) {
            const licenseHash = crypto
                .createHmac("sha256", process.env.LICENSE_SECRET)
                .update(String(licenseNumber))
                .digest("hex");

            const doctorResults = await Doctor.create([{
                userId: user._id,
                specialization,
                experience: experience || 0,
                hospitalName: organization.name,
                licenseHash,
                licenseEncrypted: encrypt(String(licenseNumber)),
                status: "active"
            }], { session });

            doctor = doctorResults[0];

            await DoctorOrganization.create([{
                doctorId: doctor._id,
                organizationId: organization._id,
                departmentId: null,
                role: "OWNER",
                status: "ACTIVE",
                invitedBy: user._id,
                joinedAt: new Date()
            }], { session });
        }

        await logAction({
            userId: user._id,
            action: "super_admin_created",
            entity: "Organization",
            entityId: organization._id,
            organizationId: organization._id,
            description: `Super admin account created for organization ${organization.name}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: "Super admin account created successfully",
            data: {
                organizationId: organization._id,
                organizationName: organization.name,
                organizationType: organization.type,
                userId: user._id,
                isClinicOwner: organization.type === "CLINIC" && doctor !== null
            }
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error("Super admin setup error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        session.endSession();
    }
};

const verifySuperAdminToken = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Token is required"
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const organization = await Organization.findOne({
            superAdminInviteToken: hashedToken,
            superAdminInviteExpires: { $gt: Date.now() }
        }).select("name type contactEmail");

        if (!organization) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired setup token"
            });
        }

        res.status(200).json({
            success: true,
            data: {
                organizationName: organization.name,
                organizationType: organization.type,
                contactEmail: organization.contactEmail,
                requiresLicense: organization.type === "CLINIC"
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    setupSuperAdmin,
    verifySuperAdminToken
};
