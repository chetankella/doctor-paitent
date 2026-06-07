const mongoose = require("mongoose");
const crypto = require("crypto");

const DoctorInvite = require("../models/doctorInvite");
const Invite = require("../models/invite");               // NEW unified model
const Staff = require("../models/staff");
const Doctor = require("../models/doctor");
const DoctorOrganization = require("../models/doctorOrganization");
const User = require("../models/user");
const sendEmail = require("../utils/sendEmail");
const AuditService = require("../services/audit.service");

function hashToken(raw) {
    return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Create a single doctor or staff invite.
 * Returns { invite, rawToken } - rawToken must be included in the email link.
 */
async function createInvite({ email, type, organizationId, departmentId, role, invitedBy }) {
    const inviteEmail = String(email).trim().toLowerCase();

    // Prevent duplicate pending invites
    const existingInvite = await DoctorInvite.findOne({
        email: inviteEmail,
        organizationId,
        type,
        status: "PENDING",
        expiresAt: { $gt: new Date() }
    });

    if (existingInvite) {
        throw new Error(`An active ${type.toLowerCase()} invitation already exists for ${inviteEmail}`);
    }

    // For DOCTOR type: prevent inviting already-active doctors
    if (type === "DOCTOR") {
        const existingUser = await User.findOne({ email: inviteEmail, role: "doctor" });
        if (existingUser) {
            const existingDoctor = await Doctor.findOne({ userId: existingUser._id });
            if (existingDoctor) {
                const membership = await DoctorOrganization.findOne({
                    doctorId: existingDoctor._id,
                    organizationId
                });
                if (membership) {
                    throw new Error(`Doctor with email ${inviteEmail} already belongs to this organization`);
                }
            }
        }
    }

    // For STAFF type: prevent inviting already-active staff
    if (type === "STAFF") {
        const existingUser = await User.findOne({ email: inviteEmail, role: "staff" });
        if (existingUser) {
            const activeStaff = await Staff.findOne({
                userId: existingUser._id,
                organizationId,
                status: "active"
            });
            if (activeStaff) {
                throw new Error(`Staff with email ${inviteEmail} already belongs to this organization`);
            }
        }
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await DoctorInvite.create({
        email: inviteEmail,
        organizationId,
        departmentId: departmentId || null,
        type,
        role: role || (type === "DOCTOR" ? "CONSULTANT" : "CONSULTANT"),
        invitedBy,
        token: hashedToken,
        expiresAt
    });

    return { invite, rawToken };
}

/**
 * Process a bulk invite list.
 * Returns an array of per-email results: { email, success, message }
 */
async function processBulkInvite({ emails, type, organizationId, departmentId, role, invitedBy }) {
    const results = [];

    for (const email of emails) {
        try {
            const { invite, rawToken } = await createInvite({
                email,
                type,
                organizationId,
                departmentId,
                role: role || "CONSULTANT",
                invitedBy
            });

            const routeSegment = type === "DOCTOR" ? "doctor-invite" : "staff-invite";
            const inviteLink = `${process.env.FRONTEND_URL}/${routeSegment}/${rawToken}`;

            const subject = type === "DOCTOR"
                ? "You have been invited as a Doctor"
                : "You have been invited as a Staff Member";

            const body = type === "DOCTOR"
                ? `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Doctor Invitation</h2>
                    <p>You have been invited to join a healthcare organization as a <strong>Doctor</strong>.</p>
                    <p style="text-align: center;">
                        <a href="${inviteLink}" style="display:inline-block;padding:12px 20px;background-color:#2d89ef;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;">
                            Set Up Doctor Account
                        </a>
                    </p>
                    <p>This link will expire in 7 days.</p>
                    <p>Regards,<br/><strong>Platform Team</strong></p>
                </div>`
                : `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Staff Invitation</h2>
                    <p>You have been invited to join a healthcare organization as a <strong>Staff Member</strong>.</p>
                    <p style="text-align: center;">
                        <a href="${inviteLink}" style="display:inline-block;padding:12px 20px;background-color:#27ae60;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;">
                            Set Up Staff Account
                        </a>
                    </p>
                    <p>This link will expire in 7 days.</p>
                    <p>Regards,<br/><strong>Platform Team</strong></p>
                </div>`;

            await sendEmail(email, subject, body);

            await AuditService.logAction({
                userId: invitedBy,
                action: type === "DOCTOR" ? "doctor_invited" : "staff_invited",
                entity: "DoctorInvite",
                entityId: invite._id,
                organizationId,
                departmentId: departmentId || null,
                description: `${type} invite sent to ${email} for organization ${organizationId}`,
                ipAddress: null,
                userAgent: null
            });

            results.push({ email, success: true, message: "Invitation sent" });
        } catch (err) {
            results.push({ email, success: false, message: err.message });
        }
    }

    return results;
}


/**
 * PHASE 2 — Write a record to the unified Invite model.
 * Called in parallel with the OLD model writes (dual-write pattern).
 * rawToken must already be generated by the caller — same token, so same email works against both models.
 * @returns {Promise<Invite>}
 */
async function createUnifiedInvite({ rawToken, email, type, role, organizationId, departmentId, invitedBy, expiresAt }) {
    const tokenHash = hashToken(rawToken);
    const inviteEmail = String(email).trim().toLowerCase();

    // Silently skip rather than crashing the caller if a duplicate somehow slips through
    const existing = await Invite.findOne({ tokenHash });
    if (existing) return existing;

    return await Invite.create({
        email: inviteEmail,
        type,
        role: role || null,
        organizationId,
        departmentId: departmentId || null,
        tokenHash,
        expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedBy
    });
}

/**
 * PHASE 2 — Dual-read: find an invite by raw token.
 * Checks the new Invite model first; falls back to the legacy DoctorInvite model.
 * type: "DOCTOR" | "STAFF" | "DEPARTMENT_ADMIN"
 * @returns {{ source: "unified"|"legacy", invite: object } | null}
 */
async function findInviteByToken(rawToken, type) {
    const hashedToken = hashToken(rawToken);

    // 1. Try the new unified model
    const unified = await Invite.findOne({
        tokenHash: hashedToken,
        type,
        status: "PENDING",
        expiresAt: { $gt: new Date() }
    });
    if (unified) return { source: "unified", invite: unified };

    // 2. Fallback — legacy DoctorInvite (covers DOCTOR and STAFF tokens sent before migration)
    if (type === "DOCTOR" || type === "STAFF") {
        const legacy = await DoctorInvite.findOne({
            token: hashedToken,
            type,
            status: "PENDING",
            expiresAt: { $gt: new Date() }
        });
        if (legacy) return { source: "legacy", invite: legacy };
    }

    return null;
}

module.exports = { createInvite, processBulkInvite, createUnifiedInvite, findInviteByToken };
