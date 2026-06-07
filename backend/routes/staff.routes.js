const express = require("express");
const router = express.Router();

const validate = require("../middleware/validate");
const { staffSetupFromInviteSchema } = require("../validations/doctor.validation");
const { staffSetupFromInvite, verifyStaffInviteToken } = require("../controllers/staff.controller");

// Verify staff invite token before showing setup form (public)
router.get(
    "/verify-token/:token",
    verifyStaffInviteToken
);

// Complete staff account setup from invite token (public)
router.post(
    "/setup/:token",
    validate(staffSetupFromInviteSchema),
    staffSetupFromInvite
);

module.exports = router;
