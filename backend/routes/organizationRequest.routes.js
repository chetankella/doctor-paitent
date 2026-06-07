const router = require("express").Router();
const validate = require("../middleware/validate");
const { organizationRequestSchema } = require("../validations/org.validation");
const { createOrganizationRequest, getMyOrganizationRequest } = require("../controllers/organizationRequest.controller");

router.post(
    "/request",
    validate(organizationRequestSchema),
    createOrganizationRequest
);

router.get(
    "/request/status",
    getMyOrganizationRequest
);

module.exports = router;
