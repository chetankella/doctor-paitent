const router = require("express").Router();
const authMiddleware = require("../middleware/authorize");
const authorize = require("../middleware/auth");
const { 
    setupFirstAdmin,
    createAdmin, 
    getDashboardStats,
    getOrganizationRequests,
    getOrganizationRequestById,
    approveOrganizationRequest,
    rejectOrganizationRequest,
    getOrganizationRequestStats
} = require("../controllers/admin.controller");
const validate = require("../middleware/validate");
const { rejectOrganizationRequestSchema } = require("../validations/org.validation");

// Bootstrap route: only works if exactly 0 admins exist in the entire database
router.post("/setup-first-admin", setupFirstAdmin);

// Protected route: only existing admins can create more admins
router.post("/create-admin", authMiddleware, authorize("admin"), createAdmin);

router.get("/dashboard", authMiddleware, authorize("admin"), getDashboardStats);

router.get("/organization-requests", authMiddleware, authorize("admin"), getOrganizationRequests);
router.get("/organization-requests/:id", authMiddleware, authorize("admin"), getOrganizationRequestById);
router.patch("/organization-requests/:id/approve", authMiddleware, authorize("admin"), approveOrganizationRequest);
router.patch("/organization-requests/:id/reject", authMiddleware, authorize("admin"), validate(rejectOrganizationRequestSchema), rejectOrganizationRequest);
router.get("/organization-requests-stats", authMiddleware, authorize("admin"), getOrganizationRequestStats);

module.exports = router;
