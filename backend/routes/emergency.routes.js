const router = require("express").Router();
const rateLimit = require("express-rate-limit");

const emergencyCtrl = require("../controllers/emergency.controller");
const logAccess = require("../middleware/logAccess");

// ─── IP-based rate limiter for emergency endpoint ───
const emergencyLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 10, // 10 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later."
    }
});


// ═══════════════════════════════════════════════════════════
// PUBLIC EMERGENCY ACCESS (no auth required)
// ═══════════════════════════════════════════════════════════
router.get(
    "/access/:referenceCode",
    emergencyLimiter,
    logAccess("EMERGENCY_QR", "EMERGENCY"),
    emergencyCtrl.scanEmergencyQR
);


module.exports = router;
