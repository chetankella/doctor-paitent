const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authorize");
const tenantContext = require("../middleware/tenantContext");
const organizationGuard = require("../middleware/organizationGuard");
const validate = require("../middleware/validate");
const upload = require("../middleware/upload");
const { inviteDoctorSchema, inviteStaffSchema } = require("../validations/org.validation");
const { acceptInviteSchema } = require("../validations/department.validation");
const OrganizationAdmin = require("../models/organizationAdmin");
const { processBulkInvite } = require("../services/invite.service");

const {
    verifyInviteToken,
    acceptInvite
} = require("../controllers/department.controller");

const {
    inviteDoctorToOrganization,
    inviteStaffToOrganization
} = require("../controllers/organization.controller");

// ── Public: Verify department admin invite token (no auth required) ──────────
router.get("/verify-token/:token", verifyInviteToken);

// ── Public: Accept department admin invite and set up account ─────────────────
router.post("/setup", validate(acceptInviteSchema), acceptInvite);

// ── Authenticated routes (department admin only) ──────────────────────────────
router.use(authMiddleware);
router.use(tenantContext);
router.use(organizationGuard(["ADMIN"]));

// Bug 5 fix: organizationId always comes from tenantContext (req.organizationId)
// Dept admin's departmentId is auto-injected from their OrganizationAdmin record

/**
 * Middleware: auto-inject departmentId from dept admin's OrganizationAdmin record
 * so the invite is always scoped to the department they manage.
 */
async function injectDeptAdminDepartment(req, res, next) {
    try {
        const adminRecord = await OrganizationAdmin.findOne({
            userId: req.user.id,
            organizationId: req.organizationId,
            role: "ADMIN",
            status: "ACTIVE"
        });

        if (!adminRecord || !adminRecord.departmentId) {
            return res.status(403).json({
                success: false,
                message: "Department admin is not associated with a department"
            });
        }

        // Override / set departmentId in body so downstream controller uses it
        req.body = req.body || {};
        req.body.departmentId = adminRecord.departmentId.toString();
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// Invite a single doctor into the admin's department
router.post(
    "/invite-doctor",
    injectDeptAdminDepartment,
    validate(inviteDoctorSchema),
    inviteDoctorToOrganization
);

// Invite a single staff member into the admin's department
router.post(
    "/invite-staff",
    injectDeptAdminDepartment,
    validate(inviteStaffSchema),
    inviteStaffToOrganization
);

/**
 * Bulk invite via CSV file.
 * CSV format (no header): email,type(DOCTOR|STAFF)
 * POST /api/department-admin/invite-bulk
 */
router.post("/invite-bulk", upload.single("csv"), injectDeptAdminDepartment, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "CSV file is required" });
        }

        const csvContent = require("fs").readFileSync(req.file.path, "utf8");
        const lines = csvContent.trim().split("\n").filter(Boolean);

        // Parse CSV: each line is "email,type" or just "email" (defaults to DOCTOR)
        const entries = lines.map((line) => {
            const [email, type] = line.split(",").map((s) => s.trim());
            return { email, type: (type || "DOCTOR").toUpperCase() };
        }).filter((e) => e.email);

        if (!entries.length) {
            return res.status(400).json({ success: false, message: "No valid entries in CSV" });
        }

        // Group by type and run bulk invite
        const results = await processBulkInvite({
            emails: entries.filter((e) => e.type === "DOCTOR").map((e) => e.email),
            type: "DOCTOR",
            organizationId: req.organizationId,
            departmentId: req.body.departmentId,
            invitedBy: req.user.id
        });

        const staffResults = await processBulkInvite({
            emails: entries.filter((e) => e.type === "STAFF").map((e) => e.email),
            type: "STAFF",
            organizationId: req.organizationId,
            departmentId: req.body.departmentId,
            invitedBy: req.user.id
        });

        // Clean up temp CSV file
        require("fs").unlinkSync(req.file.path);

        const allResults = [...results, ...staffResults];
        const successCount = allResults.filter((r) => r.success).length;
        const failCount = allResults.length - successCount;

        res.status(200).json({
            success: true,
            message: `Bulk invite completed: ${successCount} sent, ${failCount} failed`,
            data: allResults
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
