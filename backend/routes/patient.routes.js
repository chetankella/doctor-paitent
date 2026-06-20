const router = require("express").Router();
const otpLimiter = require("../middleware/rateLimiter").otpLimiter;

// ─── Controllers ───
const {
    verifyOtp,
    resendOtp,
    registerPatient,
    createOrUpdateProfile,
    getProfile,
    getPatientProfile,
    getProfileByToken,
    generateEmergencyQR,
    generateAccessTokenForDoctor,
    getProfileByEmail,
    searchDoctors,
    autocompleteDoctors
} = require("../controllers/patient.controller");

const appointmentCtrl = require("../controllers/appointment.controller");
const upload = require("../middleware/upload");

const accessGrantCtrl = require("../controllers/accessGrant.controller");
const emergencyCtrl = require("../controllers/emergency.controller");
const accessLogCtrl = require("../controllers/accessLog.controller");
const accessRequestCtrl = require("../controllers/accessRequest.controller");
const videoConsultCtrl = require("../controllers/videoConsult.controller");

// ─── Middleware ───
const authMiddleware = require("../middleware/authorize");
const authorize = require("../middleware/auth");
const validate = require("../middleware/validate");
const logAccess = require("../middleware/logAccess");
const {
    patientProfileSchema,
    verifyOtpSchema,
    resendOtpSchema,
    registerPatientSchema,
    generateAccessTokenSchema,
    accessByEmailSchema
} = require("../validations/patient.validation");

// Legacy middleware (kept for backward-compatible routes)
const authorizePatientAccess = require("../middleware/authorizePatientAccess");
const { authorizeByToken, authorizeByEmail } = require("../middleware/authorizeByToken");


// ═══════════════════════════════════════════════════════════
// AUTHENTICATION ROUTES
// ═══════════════════════════════════════════════════════════
router.post("/register", validate(registerPatientSchema), registerPatient);
router.post("/verify-otp", otpLimiter, validate(verifyOtpSchema), verifyOtp);
router.post("/resend-otp", otpLimiter, validate(resendOtpSchema), resendOtp);


// ═══════════════════════════════════════════════════════════
// PATIENT PROFILE ROUTES  (/me/profile)
// ═══════════════════════════════════════════════════════════
router.get("/me/profile", authMiddleware, authorize("patient"), getProfile);
router.put("/me/profile", authMiddleware, authorize("patient"), validate(patientProfileSchema), createOrUpdateProfile);
router.get("/me/doctors", authMiddleware, authorize("patient"), searchDoctors);
router.get("/me/doctors/autocomplete", authMiddleware, authorize("patient"), autocompleteDoctors);
router.get("/me/doctors/:doctorId/availability", authMiddleware, authorize("patient"), appointmentCtrl.getDoctorAvailability);

// Appointment routes
router.post("/me/appointments", authMiddleware, authorize("patient"), appointmentCtrl.bookAppointment);
router.get("/me/appointments", authMiddleware, authorize("patient"), appointmentCtrl.listPatientAppointments);
router.patch("/me/appointments/:appointmentId/cancel", authMiddleware, authorize("patient"), appointmentCtrl.cancelPatientAppointment);
router.post("/me/appointments/:appointmentId/prescription", authMiddleware, authorize("patient"), upload.single("prescription"), appointmentCtrl.uploadPatientPrescription);
router.get("/me/appointments/:appointmentId/messages", authMiddleware, authorize("patient"), appointmentCtrl.listMessages);
router.post("/me/appointments/:appointmentId/messages", authMiddleware, authorize("patient"), upload.single("file"), appointmentCtrl.addMessage);

// ═══════════════════════════════════════════════════════════
// ACCESS GRANT MANAGEMENT  (/me/access-grants)
// ═══════════════════════════════════════════════════════════
router.post("/me/access-grants", authMiddleware, authorize("patient"), accessGrantCtrl.createGrant);
router.get("/me/access-grants", authMiddleware, authorize("patient"), accessGrantCtrl.listGrants);
router.patch("/me/access-grants/:grantId", authMiddleware, authorize("patient"), accessGrantCtrl.updateGrant);
router.delete("/me/access-grants/:grantId", authMiddleware, authorize("patient"), accessGrantCtrl.revokeGrant);


// ═══════════════════════════════════════════════════════════
// EMERGENCY QR MANAGEMENT  (/me/emergency-qr)
// ═══════════════════════════════════════════════════════════
router.post("/me/emergency-qr", authMiddleware, authorize("patient"), emergencyCtrl.generateQR);
router.get("/me/emergency-qr", authMiddleware, authorize("patient"), emergencyCtrl.getActiveQR);
router.delete("/me/emergency-qr", authMiddleware, authorize("patient"), emergencyCtrl.revokeQR);
router.get("/me/emergency-qr/scans", authMiddleware, authorize("patient"), emergencyCtrl.getQRScans);


// ═══════════════════════════════════════════════════════════
// ACCESS LOG VIEWING  (/me/access-logs)
// ═══════════════════════════════════════════════════════════
router.get("/me/access-logs", authMiddleware, authorize("patient"), accessLogCtrl.getPatientLogs);


// ═══════════════════════════════════════════════════════════
// ACCESS REQUEST MANAGEMENT  (/me/access-requests)
// ═══════════════════════════════════════════════════════════
router.get("/me/access-requests", authMiddleware, authorize("patient"), accessRequestCtrl.listPatientRequests);
router.patch("/me/access-requests/:requestId", authMiddleware, authorize("patient"), accessRequestCtrl.respondToRequest);


// ═══════════════════════════════════════════════════════════
// VIDEO CONSULTATION  (/me/instant-doctors, /me/instant-consult)
// ═══════════════════════════════════════════════════════════
router.get("/me/instant-doctors", authMiddleware, authorize("patient"), videoConsultCtrl.getInstantDoctors);
router.post("/me/instant-consult", authMiddleware, authorize("patient"), videoConsultCtrl.bookInstantConsult);
router.get("/me/appointments/:appointmentId/video-token", authMiddleware, authorize("patient"), videoConsultCtrl.getVideoToken);


// ═══════════════════════════════════════════════════════════
// LEGACY ROUTES (backward compatible — will be removed in Phase 5)
// ═══════════════════════════════════════════════════════════
router.post("/createProfile", authMiddleware, validate(patientProfileSchema), authorize("patient"), createOrUpdateProfile);
router.get("/profile", authMiddleware, authorize("patient"), getProfile);
router.post("/generate-emergency-qr", authMiddleware, authorize("patient"), generateEmergencyQR);
router.post("/generate-access-token", authMiddleware, authorize("patient"), validate(generateAccessTokenSchema), generateAccessTokenForDoctor);
router.get("/access/token", authMiddleware, authorize("doctor"), authorizeByToken("FULL_PROFILE"), getProfileByToken);
router.get("/access/qr", authorizeByToken("EMERGENCY"), getProfileByToken);
router.post("/access/by-email", authMiddleware, authorize("doctor"), validate(accessByEmailSchema), getProfileByEmail);
router.get("/patient/:patientId", authMiddleware, authorizePatientAccess("FULL_PROFILE"), getPatientProfile);


module.exports = router;