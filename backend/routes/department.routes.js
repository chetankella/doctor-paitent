const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authorize");
const tenantContext = require("../middleware/tenantContext");
const organizationGuard = require("../middleware/organizationGuard");
const validate = require("../middleware/validate");
const { createDepartmentSchema } = require("../validations/department.validation");

const {
    createDepartment,
    listDepartments
} = require("../controllers/department.controller");

// All routes require authentication, tenant context, and org admin role
router.use(authMiddleware);
router.use(tenantContext);
router.use(organizationGuard(["OWNER", "ADMIN", "MANAGER"]));

router.post("/", validate(createDepartmentSchema), createDepartment);
router.get("/", listDepartments);

module.exports = router;
