const router = require("express").Router();
const validate = require("../middleware/validate");
const { setupSuperAdminSchema } = require("../validations/org.validation");
const { setupSuperAdmin, verifySuperAdminToken } = require("../controllers/superAdmin.controller");

router.get(
    "/verify-token/:token",
    verifySuperAdminToken
);

router.post(
    "/setup",
    validate(setupSuperAdminSchema),
    setupSuperAdmin
);

module.exports = router;
