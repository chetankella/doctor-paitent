const mongoose = require("mongoose");
const crypto = require("crypto");

const Department = require("../models/department");
const DepartmentAdminInvite = require("../models/departmentAdminInvite");
const Invite = require("../models/invite");                        // PHASE 6 dual-read
const OrganizationAdmin = require("../models/organizationAdmin");
const User = require("../models/user");
const sendEmail = require("../utils/sendEmail");
const AuditService = require("../services/audit.service");
const { createUnifiedInvite } = require("../services/invite.service"); // PHASE 4 dual-write

// Bug 2 fix: hash raw token before storing
function hashToken(raw) {
    return crypto.createHash("sha256").update(raw).digest("hex");
}

class DepartmentService {

    static async createDepartment(departmentData, userId, organizationId) {
        const { departmentName, departmentEmail, description, adminEmail } = departmentData;

        const existingDepartment = await Department.findOne({
            organizationId,
            $or: [{ departmentName }, { departmentEmail }]
        });

        if (existingDepartment) {
            throw new Error("Department with this name already exists in the organization");
        }

        const departmentCode = departmentName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .substring(0, 6) + Math.floor(1000 + Math.random() * 9000);

        const department = new Department({
            organizationId,
            departmentName,
            departmentEmail,
            departmentCode,
            description,
            createdBy: userId,
            status: "ACTIVE"
        });

        await department.save();

        await AuditService.logAction({
            userId,
            action: "department_created",
            entity: "Department",
            entityId: department._id,
            organizationId,
            departmentId: department._id,
            description: `Department ${departmentName} created for organization ${organizationId}`,
            ipAddress: null,
            userAgent: null
        });

        let invite = null;
        if (adminEmail) {
            invite = await this.sendDepartmentAdminInvite(
                department, organizationId, adminEmail, userId
            );
        }

        return { department, invite };
    }

    static async sendDepartmentAdminInvite(department, organizationId, adminEmail, invitedBy) {
        const existingPendingInvite = await DepartmentAdminInvite.findOne({
            email: adminEmail,
            departmentId: department._id,
            status: "PENDING",
            expiresAt: { $gt: new Date() }
        });

        if (existingPendingInvite) {
            throw new Error("A pending invitation already exists for this email in this department");
        }

        const existingUser = await User.findOne({ email: adminEmail });
        if (existingUser) {
            const existingAdmin = await OrganizationAdmin.findOne({
                userId: existingUser._id,
                organizationId,
                status: "ACTIVE"
            });
            if (existingAdmin) {
                throw new Error("User is already an admin in this organization");
            }
        }

        // Bug 2 fix: store hash only, send raw token in email
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const invite = new DepartmentAdminInvite({
            email: adminEmail,
            departmentId: department._id,
            organizationId,
            invitedBy,
            token: hashedToken,
            expiresAt,
            status: "PENDING"
        });

        await invite.save();

        // PHASE 4 — dual-write same token to unified Invite model (non-blocking)
        createUnifiedInvite({
            rawToken,
            email: adminEmail,
            type: "DEPARTMENT_ADMIN",
            role: null,
            organizationId,
            departmentId: department._id,
            invitedBy,
            expiresAt
        }).catch((e) => console.error("[Invite dual-write DEPARTMENT_ADMIN]", e.message));

        const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/create-department-admin?token=${rawToken}`;

        await sendEmail(
            adminEmail,
            "Department Admin Invitation",
            `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Department Admin Invitation</h2>

                <p>Hello,</p>

                <p>
                You have been invited to join as a <strong>Department Admin</strong> 
                for the department <strong>${department.departmentName}</strong>.
                </p>

                <p>
                Please create your account using the link below:
                </p>

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
                    Create Department Admin Account
                    </a>
                </p>

                <p>
                This link will expire in 24 hours.
                </p>

                <p>
                If you did not expect this invitation, please ignore this email.
                </p>

                <p>
                Regards,<br/>
                <strong>Platform Team</strong>
                </p>
            </div>
            `
        );

        await AuditService.logAction({
            userId: invitedBy,
            action: "department_admin_invited",
            entity: "DepartmentAdminInvite",
            entityId: invite._id,
            organizationId,
            departmentId: department._id,
            description: `Department admin invitation sent to ${adminEmail} for department ${department.departmentName}`,
            ipAddress: null,
            userAgent: null
        });

        return invite;
    }

    static async getDepartments(organizationId) {
        return await Department.find({ organizationId }).sort({ createdAt: -1 });
    }

    static async getDepartmentById(departmentId, organizationId) {
        const department = await Department.findOne({ _id: departmentId, organizationId });
        if (!department) throw new Error("Department not found");
        return department;
    }

    static async acceptInvite(token, userData) {
        const { name, password } = userData;
        const hashedToken = hashToken(token);

        // PHASE 6 — dual-read: try unified Invite model first, fall back to legacy
        let invite = await Invite.findOne({
            tokenHash: hashedToken,
            type: "DEPARTMENT_ADMIN",
            status: "PENDING",
            expiresAt: { $gt: new Date() }
        });
        let source = "unified";

        if (!invite) {
            invite = await DepartmentAdminInvite.findOne({
                token: hashedToken,
                status: "PENDING",
                expiresAt: { $gt: new Date() }
            });
            source = "legacy";
        }

        if (!invite) {
            throw new Error("Invalid or expired invitation token");
        }

        const existingUser = await User.findOne({ email: invite.email });

        let user;
        if (existingUser) {
            if (existingUser.role === "patient") {
                throw new Error("Cannot add admin to a patient account");
            }
            user = existingUser;
            user.name = name;
            user.password = await require("bcrypt").hash(password, 10);
            user.isVerified = true;
            user.onboardingCompleted = true;
            await user.save();
        } else {
            user = await User.create({
                name,
                email: invite.email,
                password: await require("bcrypt").hash(password, 10),
                role: "department_admin",
                isVerified: true,
                onboardingCompleted: true
            });
        }

        await OrganizationAdmin.create([{
            userId: user._id,
            organizationId: invite.organizationId,
            departmentId: invite.departmentId,
            role: "ADMIN",
            status: "ACTIVE",
            invitedBy: invite.invitedBy,
            joinedAt: new Date()
        }]);

        // Mark the found record accepted
        invite.status = "ACCEPTED";
        invite.acceptedAt = new Date();
        invite.userId = user._id;
        await invite.save();

        // Also mark the counterpart record ACCEPTED
        if (source === "unified") {
            await DepartmentAdminInvite.updateOne(
                { token: hashedToken, status: "PENDING" },
                { $set: { status: "ACCEPTED", acceptedAt: new Date(), userId: user._id } }
            );
        } else {
            await Invite.updateOne(
                { tokenHash: hashedToken, status: "PENDING" },
                { $set: { status: "ACCEPTED", acceptedAt: new Date(), userId: user._id } }
            );
        }

        await AuditService.logAction({
            userId: user._id,
            action: "department_admin_onboarded",
            entity: source === "unified" ? "Invite" : "DepartmentAdminInvite",
            entityId: invite._id,
            organizationId: invite.organizationId,
            departmentId: invite.departmentId || null,
            description: `Department admin account created for ${invite.email} (source: ${source})`,
            ipAddress: null,
            userAgent: null
        });

        return { user, organizationId: invite.organizationId };
    }

    static async verifyInviteToken(token) {
        const hashedToken = hashToken(token);

        // PHASE 6 — dual-read: try unified Invite model first
        let invite = await Invite.findOne({
            tokenHash: hashedToken,
            type: "DEPARTMENT_ADMIN",
            status: "PENDING",
            expiresAt: { $gt: new Date() }
        })
            .populate("departmentId", "departmentName")
            .populate("organizationId", "name");

        // Fallback to legacy model
        if (!invite) {
            invite = await DepartmentAdminInvite.findOne({
                token: hashedToken,
                status: "PENDING",
                expiresAt: { $gt: new Date() }
            })
                .populate("departmentId", "departmentName")
                .populate("organizationId", "name");
        }

        if (!invite) {
            throw new Error("Invalid or expired invitation token");
        }

        return {
            email: invite.email,
            departmentName: invite.departmentId?.departmentName,
            organizationName: invite.organizationId?.name
        };
    }
}

module.exports = DepartmentService;
