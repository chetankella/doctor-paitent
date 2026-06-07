const mongoose = require("mongoose");
const crypto = require("crypto");

const Organization = require("../models/organization");
const OrganizationAdmin = require("../models/organizationAdmin");
const Doctor = require("../models/doctor");
const DoctorOrganization = require("../models/doctorOrganization");
const DoctorInvite = require("../models/doctorInvite");
const Staff = require("../models/staff"); // Bug 1 fix: was missing
const User = require("../models/user");
const { withTenant } = require("../services/tenantQuery.service");
const sendEmail = require("../utils/sendEmail");
const { logAction } = require("../services/audit.service");
const { createUnifiedInvite } = require("../services/invite.service"); // PHASE 3 dual-write

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Hash a raw invite token with sha256 before storing or looking up.
 * The raw token is sent in the email link; only the hash lives in DB.
 */
function hashToken(raw) {
    return crypto.createHash("sha256").update(raw).digest("hex");
}

// GET /organizations/my
const getOrganizationsForAdmin = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const admins = await OrganizationAdmin.find({
            userId: req.user.id,
            status: "ACTIVE"
        }).populate("organizationId");

        const organizations = admins.map((a) => a.organizationId).filter(Boolean);

        res.json({ success: true, data: organizations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /organizations/:organizationId
const getOrganizationById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.organizationId)) {
            return res.status(400).json({ success: false, message: "Invalid organizationId" });
        }

        const organization = await Organization.findById(req.params.organizationId);

        if (!organization) {
            return res.status(404).json({ success: false, message: "Organization not found" });
        }

        res.json({ success: true, data: organization });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /organizations/:organizationId
const updateOrganization = async (req, res) => {
    try {
        const { organizationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({ success: false, message: "Invalid organizationId" });
        }

        const allowedFields = [
            "name", "description", "contactPhone", "contactEmail",
            "website", "addressLine1", "addressLine2", "city",
            "state", "country", "pincode"
        ];

        const update = {};
        allowedFields.forEach((f) => {
            if (typeof req.body[f] !== "undefined") update[f] = req.body[f];
        });

        const organization = await Organization.findByIdAndUpdate(
            organizationId,
            { $set: update },
            { new: true }
        );

        if (!organization) {
            return res.status(404).json({ success: false, message: "Organization not found" });
        }

        res.json({ success: true, data: organization });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /organizations/:organizationId/verify  (platform admin only)
const verifyOrganization = async (req, res) => {
    try {
        const { organizationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({ success: false, message: "Invalid organizationId" });
        }

        const organization = await Organization.findByIdAndUpdate(
            organizationId,
            {
                $set: {
                    status: "ACTIVE",
                    verificationStatus: "VERIFIED",
                    verifiedByAdminId: req.user.id,
                    verificationNotes: req.body.verificationNotes
                }
            },
            { new: true }
        );

        if (!organization) {
            return res.status(404).json({ success: false, message: "Organization not found" });
        }

        res.json({ success: true, data: organization });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /organizations/:organizationId/suspend  (platform admin only)
const suspendOrganization = async (req, res) => {
    try {
        const { organizationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({ success: false, message: "Invalid organizationId" });
        }

        const organization = await Organization.findByIdAndUpdate(
            organizationId,
            { $set: { status: "SUSPENDED", verificationNotes: req.body.suspensionReason } },
            { new: true }
        );

        if (!organization) {
            return res.status(404).json({ success: false, message: "Organization not found" });
        }

        res.json({ success: true, data: organization });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /organizations/:organizationId/invite-doctor
const inviteDoctorToOrganization = async (req, res) => {
    try {
        // Bug 5 fix: always use organizationId set by tenantContext, never from body/query
        const organizationId = req.organizationId;
        const { departmentId, role, email } = req.body;

        if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({ success: false, message: "Invalid organizationId" });
        }

        if (!email) {
            return res.status(400).json({ success: false, message: "email is required" });
        }


        
        const inviteEmail = String(email).trim().toLowerCase();

        // Check if doctor already exists in org
        let resolvedDoctorId = null;
        const existingUser = await User.findOne({ email: inviteEmail, role: "doctor" });
        if (existingUser) {
            const existingDoctor = await Doctor.findOne({ userId: existingUser._id });
            if (existingDoctor) {
                resolvedDoctorId = existingDoctor._id;
            }
        }

        if (resolvedDoctorId) {
            const existingMembership = await DoctorOrganization.findOne({
                doctorId: resolvedDoctorId, organizationId
            });
            if (existingMembership) {
                return res.status(400).json({
                    success: false,
                    message: "Doctor already belongs to this organization"
                });
            }
        } else {
            // Prevent duplicate pending invites by email within the same org
            const existingInvite = await DoctorInvite.findOne({
                email: inviteEmail,
                organizationId,
                type: "DOCTOR",
                status: "PENDING",
                expiresAt: { $gt: new Date() }
            });

            if (existingInvite) {
                return res.status(400).json({
                    success: false,
                    message: "An active invitation already exists for this email"
                });
            }
        }

        // Bug 2 fix: generate raw token, store only the hash
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const invite = await DoctorInvite.create({
            doctorId: resolvedDoctorId,
            email: inviteEmail,
            organizationId,
            departmentId: departmentId || null,
            type: "DOCTOR",
            role,
            invitedBy: req.user.id,
            token: hashedToken, // store hash only
            expiresAt
        });

        // PHASE 3 — dual-write to unified Invite model (non-blocking)
        createUnifiedInvite({
            rawToken,
            email: inviteEmail,
            type: "DOCTOR",
            role: role || "CONSULTANT",
            organizationId,
            departmentId: departmentId || null,
            invitedBy: req.user.id,
            expiresAt
        }).catch((e) => console.error("[Invite dual-write DOCTOR]", e.message));

        const inviteLink = `${process.env.FRONTEND_URL}/doctor-invite/${rawToken}`;

        await sendEmail(
            inviteEmail,
            "You have been invited as a Doctor",
            `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Doctor Invitation</h2>

                <p>Hello,</p>

                <p>
                You have been invited to join a healthcare organization on our platform as a 
                <strong>Doctor</strong> with the role: <strong>${role}</strong>.
                </p>

                <p>Please click the link below to set up your account:</p>

                <p style="text-align: center;">
                    <a href="${inviteLink}" 
                    style="
                        display: inline-block;
                        padding: 12px 20px;
                        background-color: #2d89ef;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 5px;
                        font-weight: bold;
                    ">
                    Set Up Doctor Account
                    </a>
                </p>

                <p>This link will expire in 7 days.</p>

                <p>
                If you did not expect this invitation, please ignore this email.
                </p>

                <p>Regards,<br/><strong>Platform Team</strong></p>
            </div>
            `
        );

        await logAction({
            userId: req.user.id,
            action: "doctor_invited",
            entity: "DoctorInvite",
            entityId: invite._id,
            organizationId,
            description: `Doctor invitation sent to ${inviteEmail} for organization ${organizationId}`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        res.status(201).json({
            success: true,
            message: "Doctor invitation sent",
            data: {
                id: invite._id,
                email: inviteEmail,
                role: invite.role,
                expiresAt: invite.expiresAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /organizations/:organizationId/invite-staff
const inviteStaffToOrganization = async (req, res) => {
    try {
        // Bug 5 fix: always use organizationId from tenantContext
        const organizationId = req.organizationId;
        const { email, departmentId, designation } = req.body;

        if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({ success: false, message: "Invalid organizationId" });
        }

        if (!email) {
            return res.status(400).json({ success: false, message: "email is required" });
        }

        const inviteEmail = String(email).trim().toLowerCase();

        // Prevent duplicate pending invites
        const existingInvite = await DoctorInvite.findOne({
            email: inviteEmail,
            organizationId,
            type: "STAFF",
            status: "PENDING",
            expiresAt: { $gt: new Date() }
        });

        if (existingInvite) {
            return res.status(400).json({
                success: false,
                message: "An active staff invitation already exists for this email"
            });
        }

        // Bug 1 fix: Staff is now imported — check if already active member
        const existingUser = await User.findOne({ email: inviteEmail, role: "staff" });
        if (existingUser) {
            const activeStaff = await Staff.findOne({
                userId: existingUser._id,
                organizationId,
                status: "active"
            });
            if (activeStaff) {
                return res.status(400).json({
                    success: false,
                    message: "Staff already belongs to this organization"
                });
            }
        }

        // Bug 2 fix: store hash only, send raw token in email
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const invite = await DoctorInvite.create({
            email: inviteEmail,
            organizationId,
            departmentId: departmentId || null,
            type: "STAFF",
            role: "CONSULTANT",
            invitedBy: req.user.id,
            token: hashedToken,
            expiresAt
        });

        // PHASE 3 — dual-write to unified Invite model (non-blocking)
        createUnifiedInvite({
            rawToken,
            email: inviteEmail,
            type: "STAFF",
            role: null,
            organizationId,
            departmentId: departmentId || null,
            invitedBy: req.user.id,
            expiresAt
        }).catch((e) => console.error("[Invite dual-write STAFF]", e.message));

        const inviteLink = `${process.env.FRONTEND_URL}/staff-invite/${rawToken}`;

        await sendEmail(
            inviteEmail,
            "You have been invited as a Staff Member",
            `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Staff Invitation</h2>

                <p>Hello,</p>

                <p>
                You have been invited to join a healthcare organization on our platform as a 
                <strong>Staff Member</strong>${designation ? ` (${designation})` : ""}.
                </p>

                <p>Please click the link below to set up your account:</p>

                <p style="text-align: center;">
                    <a href="${inviteLink}" 
                    style="
                        display: inline-block;
                        padding: 12px 20px;
                        background-color: #27ae60;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 5px;
                        font-weight: bold;
                    ">
                    Set Up Staff Account
                    </a>
                </p>

                <p>This link will expire in 7 days.</p>

                <p>
                If you did not expect this invitation, please ignore this email.
                </p>

                <p>Regards,<br/><strong>Platform Team</strong></p>
            </div>
            `
        );

        await logAction({
            userId: req.user.id,
            action: "staff_invited",
            entity: "DoctorInvite",
            entityId: invite._id,
            organizationId,
            description: `Staff invitation sent to ${inviteEmail} for organization ${organizationId}`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        res.status(201).json({
            success: true,
            message: "Staff invitation sent",
            data: {
                id: invite._id,
                email: inviteEmail,
                expiresAt: invite.expiresAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW ENDPOINTS (Phase 3)
// ─────────────────────────────────────────────────────────────────────────────

const Department = require("../models/department");
const AuditLog = require("../models/auditLog");

// GET /organizations/:organizationId/analytics/summary
const getAnalyticsSummary = async (req, res) => {
    try {
        const organizationId = req.organizationId;

        const [departments, doctorOrgs, staffMembers, pendingInvites, activeAdmins] = await Promise.all([
            Department.countDocuments({ organizationId, status: "ACTIVE" }),
            DoctorOrganization.countDocuments({ organizationId, status: "ACTIVE" }),
            Staff.countDocuments({ organizationId, status: "active" }),
            DoctorInvite.countDocuments({
                organizationId,
                status: "PENDING",
                expiresAt: { $gt: new Date() }
            }),
            OrganizationAdmin.countDocuments({ organizationId, status: "ACTIVE" })
        ]);

        res.json({
            success: true,
            data: {
                departments,
                doctors: doctorOrgs,
                staff: staffMembers,
                pendingInvites,
                activeUsers: doctorOrgs + staffMembers + activeAdmins
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /organizations/:organizationId/invites?status=&type=&page=
const listInvites = async (req, res) => {
    try {
        const organizationId = req.organizationId;
        const { status, type, page = 1, limit = 20 } = req.query;

        const query = { organizationId };
        if (status) query.status = status.toUpperCase();
        if (type) query.type = type.toUpperCase();

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [invites, total] = await Promise.all([
            DoctorInvite.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate("departmentId", "departmentName")
                .populate("invitedBy", "name email"),
            DoctorInvite.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: invites,
            pagination: { page: parseInt(page), limit: parseInt(limit), total }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /organizations/:organizationId/invites/:inviteId/resend
const resendInvite = async (req, res) => {
    try {
        const organizationId = req.organizationId;
        const { inviteId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(inviteId)) {
            return res.status(400).json({ success: false, message: "Invalid inviteId" });
        }

        const invite = await DoctorInvite.findOne({ _id: inviteId, organizationId });
        if (!invite) {
            return res.status(404).json({ success: false, message: "Invite not found" });
        }

        if (invite.status === "ACCEPTED") {
            return res.status(400).json({ success: false, message: "Invite already accepted" });
        }

        // Regenerate token + extend expiry
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        invite.token = hashedToken;
        invite.expiresAt = expiresAt;
        invite.status = "PENDING";
        await invite.save();

        const routeSegment = invite.type === "DOCTOR" ? "doctor-invite" : "staff-invite";
        const inviteLink = `${process.env.FRONTEND_URL}/${routeSegment}/${rawToken}`;

        const subject = invite.type === "DOCTOR"
            ? "Reminder: You have been invited as a Doctor"
            : "Reminder: You have been invited as a Staff Member";

        await sendEmail(
            invite.email,
            subject,
            `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>${invite.type === "DOCTOR" ? "Doctor" : "Staff"} Invitation Reminder</h2>
                <p>Hello,</p>
                <p>This is a reminder that you have been invited to join our healthcare platform.</p>
                <p style="text-align: center;">
                    <a href="${inviteLink}" style="display:inline-block;padding:12px 20px;background-color:#2d89ef;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;">
                        Accept Invitation
                    </a>
                </p>
                <p>This link will expire in 7 days.</p>
                <p>Regards,<br/><strong>Platform Team</strong></p>
            </div>`
        );

        await logAction({
            userId: req.user.id,
            action: "invite_resent",
            entity: "DoctorInvite",
            entityId: invite._id,
            organizationId,
            description: `Invite resent to ${invite.email} (${invite.type})`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        res.json({ success: true, message: "Invite resent successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /organizations/:organizationId/invites/:inviteId
const cancelInvite = async (req, res) => {
    try {
        const organizationId = req.organizationId;
        const { inviteId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(inviteId)) {
            return res.status(400).json({ success: false, message: "Invalid inviteId" });
        }

        const invite = await DoctorInvite.findOne({ _id: inviteId, organizationId });
        if (!invite) {
            return res.status(404).json({ success: false, message: "Invite not found" });
        }

        if (invite.status === "ACCEPTED") {
            return res.status(400).json({ success: false, message: "Cannot cancel an accepted invite" });
        }

        invite.status = "EXPIRED";
        await invite.save();

        await logAction({
            userId: req.user.id,
            action: "invite_cancelled",
            entity: "DoctorInvite",
            entityId: invite._id,
            organizationId,
            description: `Invite cancelled for ${invite.email} (${invite.type})`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        res.json({ success: true, message: "Invite cancelled" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /organizations/:organizationId/audit-logs?page=
const getAuditLogs = async (req, res) => {
    try {
        const organizationId = req.organizationId;
        const { page = 1, limit = 30 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            AuditLog.find({ organizationId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate("userId", "name email role"),
            AuditLog.countDocuments({ organizationId })
        ]);

        res.json({
            success: true,
            data: logs,
            pagination: { page: parseInt(page), limit: parseInt(limit), total }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /organizations/:organizationId/doctors?departmentId=
const listDoctors = async (req, res) => {
    try {
        const organizationId = req.organizationId;
        const { departmentId } = req.query;

        const query = { organizationId, status: "ACTIVE" };
        if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
            query.departmentId = departmentId;
        }

        const members = await DoctorOrganization.find(query)
            .populate({
                path: "doctorId",
                select: "specialization experience status",
                populate: { path: "userId", select: "name email" }
            })
            .populate("departmentId", "departmentName")
            .sort({ createdAt: -1 });

        res.json({ success: true, data: members });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /organizations/:organizationId/staff?departmentId=
const listStaff = async (req, res) => {
    try {
        const organizationId = req.organizationId;
        const { departmentId } = req.query;

        const query = { organizationId, status: "active" };
        if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
            query.departmentId = departmentId;
        }

        const staff = await Staff.find(query)
            .populate("userId", "name email")
            .populate("departmentId", "departmentName")
            .sort({ createdAt: -1 });

        res.json({ success: true, data: staff });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getOrganizationsForAdmin,
    getOrganizationById,
    updateOrganization,
    verifyOrganization,
    suspendOrganization,
    inviteDoctorToOrganization,
    inviteStaffToOrganization,
    // Phase 3 additions
    getAnalyticsSummary,
    listInvites,
    resendInvite,
    cancelInvite,
    getAuditLogs,
    listDoctors,
    listStaff
};
