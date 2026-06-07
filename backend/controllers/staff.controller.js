const bcrypt = require("bcrypt");
const crypto = require("crypto");

const User = require("../models/user");
const Staff = require("../models/staff");
const DoctorInvite = require("../models/doctorInvite");
const { logAction } = require("../services/audit.service");

// Bug 6 fix: hash raw invite token before DB lookup
function hashToken(raw) {
    return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Complete staff onboarding from an invitation token.
 * POST /staff/setup/:token
 */
const staffSetupFromInvite = async (req, res) => {
    try {
        const { token } = req.params;
        const { name, password, designation } = req.body || {};

        if (!token) {
            return res.status(400).json({ success: false, message: "Token is required" });
        }

        // Bug 6 fix: hash before lookup
        const hashedToken = hashToken(token);

        const invite = await DoctorInvite.findOne({
            token: hashedToken,
            type: "STAFF",
            status: "PENDING",
            expiresAt: { $gt: new Date() }
        });

        if (!invite) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired invitation token"
            });
        }

        const inviteEmail = invite.email;

        if (!inviteEmail) {
            return res.status(400).json({ success: false, message: "Invitation email not found" });
        }

        // Find or create user
        let user = await User.findOne({ email: inviteEmail });

        if (user && user.role !== "staff") {
            return res.status(400).json({
                success: false,
                message: "Email already exists with a different role"
            });
        }

        const hashedPassword = await bcrypt.hash(String(password), 10);

        if (!user) {
            user = await User.create({
                name,
                email: inviteEmail,
                password: hashedPassword,
                role: "staff",
                isVerified: true,
                onboardingCompleted: true
            });
        } else {
            user.name = name;
            user.password = hashedPassword;
            user.isVerified = true;
            user.onboardingCompleted = true;
            user.setupToken = undefined;
            user.setupTokenExpires = undefined;
            await user.save();
        }

        // Create staff profile or update existing
        let staff = await Staff.findOne({ userId: user._id });
        if (!staff) {
            staff = await Staff.create({
                userId: user._id,
                organizationId: invite.organizationId,
                departmentId: invite.departmentId || null,
                designation: designation || "Staff",
                status: "active"
            });
        }

        invite.status = "ACCEPTED";
        await invite.save();

        await logAction({
            userId: user._id,
            action: "staff_onboarded",
            entity: "DoctorInvite",
            entityId: invite._id,
            organizationId: invite.organizationId,
            departmentId: invite.departmentId || null,
            description: `Staff account created for ${inviteEmail} in organization ${invite.organizationId}`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(201).json({
            success: true,
            message: "Staff account set up successfully",
            data: {
                userId: user._id,
                email: user.email,
                organizationId: invite.organizationId
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Verify a staff invite token before the user fills in the form.
 * GET /staff/verify-token/:token
 */
const verifyStaffInviteToken = async (req, res) => {
    try {
        const { token } = req.params;

        // Bug 6 fix: hash before lookup
        const hashedToken = hashToken(token);

        const invite = await DoctorInvite.findOne({
            token: hashedToken,
            type: "STAFF",
            status: "PENDING",
            expiresAt: { $gt: new Date() }
        }).populate("organizationId", "name type");

        if (!invite) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired invitation token"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                email: invite.email,
                organizationName: invite.organizationId?.name,
                organizationType: invite.organizationId?.type
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    staffSetupFromInvite,
    verifyStaffInviteToken
};
