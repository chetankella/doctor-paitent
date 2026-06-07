
const Doctor = require("../models/doctor");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const DoctorInvite = require("../models/doctorInvite");
const DoctorOrganization = require("../models/doctorOrganization");

const { encrypt } = require("../utils/licCrypto");
const sendEmail = require("../utils/sendEmail");
const { logAction } = require("../services/audit.service");
const { findInviteByToken } = require("../services/invite.service"); // PHASE 5 dual-read

// Bug 6 fix: hash raw invite token before DB lookup
function hashToken(raw) {
    return crypto.createHash("sha256").update(raw).digest("hex");
}

const doctorSetPassword = async (req, res) => {
    try {
        const { name, password } = req.body;

        // PHASE 5 — dual-read: check unified Invite model first, fall back to legacy DoctorInvite
        const found = await findInviteByToken(req.params.token, "DOCTOR");

        if (!found) {
            return res.status(400).json({ success: false, message: "Invalid or expired token" });
        }

        const { source, invite } = found;

        // Normalise field names: unified model uses `tokenHash`, legacy uses `token`
        const inviteEmail = String(invite.email).trim().toLowerCase();

        if (!inviteEmail) {
            return res.status(400).json({ success: false, message: "Invite email missing, please contact admin" });
        }

        const hashedPassword = await bcrypt.hash(String(password), 10);

        // Find or create the User record
        let user = await User.findOne({ email: inviteEmail });

        if (user && user.role !== "doctor") {
            return res.status(400).json({
                success: false,
                message: "Email already registered with a different role"
            });
        }

        if (!user) {
            user = await User.create({
                name,
                email: inviteEmail,
                password: hashedPassword,
                role: "doctor",
                isVerified: true,
                onboardingCompleted: false
            });
        } else {
            user.name = name;
            user.password = hashedPassword;
            user.isVerified = true;
            user.setupToken = undefined;
            user.setupTokenExpires = undefined;
            await user.save();
        }

        // Mark invite as ACCEPTED in whichever model it came from
        invite.status = "ACCEPTED";
        if (source === "unified") {
            invite.acceptedAt = new Date();
            invite.userId = user._id;
        }
        await invite.save();

        // Also mark the counterpart legacy record ACCEPTED (if this was a unified hit)
        if (source === "unified") {
            const hashedTok = crypto.createHash("sha256").update(req.params.token).digest("hex");
            await DoctorInvite.updateOne(
                { token: hashedTok, status: "PENDING" },
                { $set: { status: "ACCEPTED" } }
            );
        }

        await logAction({
            userId: user._id,
            action: "doctor_password_set",
            entity: source === "unified" ? "Invite" : "DoctorInvite",
            entityId: invite._id,
            organizationId: invite.organizationId || null,
            description: `Doctor account activated for ${inviteEmail} (source: ${source})`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        res.json({ success: true, message: "Account setup successful" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const doctorSetupProfile = async (req, res) => {
    try {
        const { licenseNumber, specialization, experience } = req.body;
        const userId = req.user.id;

        let user = await User.findById(userId);
        if (!user || user.role !== "doctor") {
            return res.status(403).json({ success: false, message: "Unauthorized or invalid role" });
        }

        if (user.onboardingCompleted) {
            return res.status(400).json({ success: false, message: "Profile already set up" });
        }

        const licenseHash = crypto
            .createHmac("sha256", process.env.LICENSE_SECRET)
            .update(String(licenseNumber))
            .digest("hex");

        const existingLicense = await Doctor.findOne({ licenseHash });
        if (existingLicense) {
            return res.status(400).json({ success: false, message: "License already registered" });
        }

        const encryptedLicense = encrypt(String(licenseNumber));

        // Create doctor profile
        let doctor = await Doctor.findOne({ userId: user._id });
        if (!doctor) {
            doctor = await Doctor.create({
                userId: user._id,
                specialization,
                experience,
                hospitalName: null,
                licenseHash,
                licenseEncrypted: encryptedLicense,
                licenseDocumentUrl: req.file ? req.file.path : null,
                status: "active"
            });
        } else {
            doctor.specialization = specialization;
            doctor.experience = experience;
            doctor.licenseHash = licenseHash;
            doctor.licenseEncrypted = encryptedLicense;
            if (req.file) doctor.licenseDocumentUrl = req.file.path;
            await doctor.save();
        }

        // Mark user onboarding completed
        user.onboardingCompleted = true;
        await user.save();

        // Find all accepted invites for this user and create organization memberships
        const invites = await DoctorInvite.find({
            email: user.email,
            status: "ACCEPTED"
        });

        for (const invite of invites) {
            const existingMembership = await DoctorOrganization.findOne({
                doctorId: doctor._id,
                organizationId: invite.organizationId
            });

            if (existingMembership) {
                existingMembership.status = "ACTIVE";
                existingMembership.departmentId = invite.departmentId || existingMembership.departmentId;
                existingMembership.role = invite.role || existingMembership.role;
                await existingMembership.save();
            } else {
                await DoctorOrganization.create({
                    doctorId: doctor._id,
                    organizationId: invite.organizationId,
                    departmentId: invite.departmentId || null,
                    role: invite.role || "CONSULTANT",
                    status: "ACTIVE",
                    invitedBy: invite.invitedBy,
                    joinedAt: new Date()
                });
            }
        }

        await logAction({
            userId: user._id,
            action: "doctor_profile_setup",
            entity: "Doctor",
            entityId: doctor._id,
            description: `Doctor profile completed for ${user.email}`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            success: true,
            message: "Doctor profile setup completed successfully"
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


const doctorProfile = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const doctor = await Doctor.findOne({ userId: req.user.id })
            .select("-licenseHash -licenseEncrypted -__v")
            .populate("userId", "name email");

        if (!doctor) {
            return res.status(404).json({ success: false, message: "Doctor profile not found" });
        }

        const organizations = await DoctorOrganization.find({
            doctorId: doctor._id,
            status: "ACTIVE"
        }).populate("organizationId", "name type");

        return res.status(200).json({
            success: true,
            data: { doctor, organizations }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const verifyDoctorInviteToken = async (req, res) => {
    try {
        const { token } = req.params;

        // Bug 6 fix: hash before lookup
        const hashedToken = hashToken(token);

        const invite = await DoctorInvite.findOne({
            token: hashedToken,
            type: "DOCTOR",
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
                role: invite.role,
                organizationName: invite.organizationId?.name,
                organizationType: invite.organizationId?.type
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    doctorSetPassword,
    doctorSetupProfile,
    verifyDoctorInviteToken,
    doctorProfile
};
