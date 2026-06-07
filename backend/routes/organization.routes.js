const router = require("express").Router();

const authMiddleware = require("../middleware/authorize");
const authorize = require("../middleware/auth");
const tenantContext = require("../middleware/tenantContext");
const organizationGuard = require("../middleware/organizationGuard");
const validate = require("../middleware/validate");
const { updateOrganizationSchema, inviteDoctorSchema, inviteStaffSchema } = require("../validations/org.validation");

const {
    getOrganizationsForAdmin,
    getOrganizationById,
    updateOrganization,
    verifyOrganization,
    suspendOrganization,
    inviteDoctorToOrganization,
    inviteStaffToOrganization,
    // Phase 3
    getAnalyticsSummary,
    listInvites,
    resendInvite,
    cancelInvite,
    getAuditLogs,
    listDoctors,
    listStaff
} = require("../controllers/organization.controller");

// Get organizations where user is admin
router.get(
    "/my",
    authMiddleware,
    getOrganizationsForAdmin
);

// Get single organization (tenant scoped)
router.get(
    "/:organizationId",
    authMiddleware,
    tenantContext,
    organizationGuard(["OWNER", "ADMIN", "MANAGER"]),
    getOrganizationById
);

// Update organization basic info (owner/admin only)
router.put(
    "/:organizationId",
    authMiddleware,
    tenantContext,
    organizationGuard(["OWNER", "ADMIN"]),
    validate(updateOrganizationSchema),
    updateOrganization
);

// Platform-admin only: verify organization
router.post(
    "/:organizationId/verify",
    authMiddleware,
    authorize("admin"),
    verifyOrganization
);

// Platform-admin only: suspend organization
router.post(
    "/:organizationId/suspend",
    authMiddleware,
    authorize("admin"),
    suspendOrganization
);

// Invite doctor to organization (owner/admin/manager)
router.post(
    "/:organizationId/invite-doctor",
    authMiddleware,
    tenantContext,
    organizationGuard(["OWNER", "ADMIN", "MANAGER"]),
    validate(inviteDoctorSchema),
    inviteDoctorToOrganization
);

// Invite staff to organization (owner/admin)
router.post(
    "/:organizationId/invite-staff",
    authMiddleware,
    tenantContext,
    organizationGuard(["OWNER", "ADMIN"]),
    validate(inviteStaffSchema),
    inviteStaffToOrganization
);

// ─── Phase 3: Analytics + Invite Management + Team + Activity ────────────────

// Dashboard analytics summary
router.get(
    "/:organizationId/analytics/summary",
    authMiddleware,
    tenantContext,
    organizationGuard(["OWNER", "ADMIN", "MANAGER"]),
    getAnalyticsSummary
);

// List all invites (with optional status/type filter)
router.get(
    "/:organizationId/invites",
    authMiddleware,
    tenantContext,
    organizationGuard(["OWNER", "ADMIN", "MANAGER"]),
    listInvites
);

// Resend an invite
router.post(
    "/:organizationId/invites/:inviteId/resend",
    authMiddleware,
    tenantContext,
    organizationGuard(["OWNER", "ADMIN", "MANAGER"]),
    resendInvite
);

// Cancel an invite
router.delete(
    "/:organizationId/invites/:inviteId",
    authMiddleware,
    tenantContext,
    organizationGuard(["OWNER", "ADMIN"]),
    cancelInvite
);

// Org-scoped audit logs (activity)
router.get(
    "/:organizationId/audit-logs",
    authMiddleware,
    tenantContext,
    organizationGuard(["OWNER", "ADMIN"]),
    getAuditLogs
);

// List doctors in org (with optional departmentId filter)
router.get(
    "/:organizationId/doctors",
    authMiddleware,
    tenantContext,
    organizationGuard(["OWNER", "ADMIN", "MANAGER"]),
    listDoctors
);

// List staff in org (with optional departmentId filter)
router.get(
    "/:organizationId/staff",
    authMiddleware,
    tenantContext,
    organizationGuard(["OWNER", "ADMIN", "MANAGER"]),
    listStaff
);

module.exports = router;
