const router = require("express").Router();

// ─── Controllers ───
const doctorPatientCtrl = require("../controllers/doctorPatient.controller");
const clinicalNoteCtrl = require("../controllers/clinicalNote.controller");
const accessRequestCtrl = require("../controllers/accessRequest.controller");
const accessLogCtrl = require("../controllers/accessLog.controller");
const appointmentCtrl = require("../controllers/appointment.controller");
const doctorCtrl = require("../controllers/doctor.controller");
const upload = require("../middleware/upload");

// ─── Middleware ───
const authMiddleware = require("../middleware/authorize");
const authorize = require("../middleware/auth");
const verifyGrant = require("../middleware/verifyGrant");
const logAccess = require("../middleware/logAccess");


// ═══════════════════════════════════════════════════════════
// DOCTOR'S PATIENT LIST  (/me/patients)
// ═══════════════════════════════════════════════════════════
router.get(
    "/me/patients",
    authMiddleware,
    authorize("doctor"),
    doctorPatientCtrl.listMyPatients
);


// ═══════════════════════════════════════════════════════════
// PATIENT PROFILE VIA GRANT  (/me/patients/:grantId)
// ═══════════════════════════════════════════════════════════
router.get(
    "/me/patients/:grantId/profile",
    authMiddleware,
    authorize("doctor"),
    verifyGrant("SUMMARY"),
    logAccess("GRANT", "FULL_PROFILE"),
    doctorPatientCtrl.viewPatientProfile
);

router.get(
    "/me/patients/:grantId/emergency",
    authMiddleware,
    authorize("doctor"),
    verifyGrant("EMERGENCY"),
    logAccess("GRANT", "EMERGENCY"),
    doctorPatientCtrl.viewEmergencyData
);


// ═══════════════════════════════════════════════════════════
// CLINICAL NOTES  (/me/patients/:grantId/notes)
// ═══════════════════════════════════════════════════════════
router.post(
    "/me/patients/:grantId/notes",
    authMiddleware,
    authorize("doctor"),
    verifyGrant("FULL_PROFILE"),
    clinicalNoteCtrl.createNote
);

router.get(
    "/me/patients/:grantId/notes",
    authMiddleware,
    authorize("doctor"),
    verifyGrant("SUMMARY"),
    clinicalNoteCtrl.listNotes
);

router.put(
    "/me/patients/:grantId/notes/:noteId",
    authMiddleware,
    authorize("doctor"),
    verifyGrant("FULL_PROFILE"),
    clinicalNoteCtrl.updateNote
);

router.delete(
    "/me/patients/:grantId/notes/:noteId",
    authMiddleware,
    authorize("doctor"),
    verifyGrant("FULL_PROFILE"),
    clinicalNoteCtrl.deleteNote
);


// ═══════════════════════════════════════════════════════════
// ACCESS REQUESTS  (/me/access-requests)
// ═══════════════════════════════════════════════════════════
router.post(
    "/me/access-requests",
    authMiddleware,
    authorize("doctor"),
    accessRequestCtrl.createRequest
);


// ═══════════════════════════════════════════════════════════
// ACCESS LOGS  (/me/access-logs)
// ═══════════════════════════════════════════════════════════
router.get(
    "/me/access-logs",
    authMiddleware,
    authorize("doctor"),
    accessLogCtrl.getDoctorLogs
);

// ═══════════════════════════════════════════════════════════
// APPOINTMENTS  (/me/appointments)
// ═══════════════════════════════════════════════════════════
router.get(
    "/me/appointments",
    authMiddleware,
    authorize("doctor"),
    appointmentCtrl.listDoctorAppointments
);

router.get(
    "/me/availability",
    authMiddleware,
    authorize("doctor"),
    appointmentCtrl.getMyAvailability
);

router.put(
    "/me/availability",
    authMiddleware,
    authorize("doctor"),
    appointmentCtrl.updateMyAvailability
);

router.get(
    "/me/weekly-schedule",
    authMiddleware,
    authorize("doctor"),
    appointmentCtrl.getWeeklySchedule
);

router.put(
    "/me/weekly-schedule",
    authMiddleware,
    authorize("doctor"),
    appointmentCtrl.updateWeeklySchedule
);

router.patch(
    "/me/appointments/:appointmentId/status",
    authMiddleware,
    authorize("doctor"),
    upload.single("prescription"),
    appointmentCtrl.updateAppointmentStatus
);

router.get(
    "/me/appointments/:appointmentId/messages",
    authMiddleware,
    authorize("doctor"),
    appointmentCtrl.listMessages
);

router.post(
    "/me/appointments/:appointmentId/messages",
    authMiddleware,
    authorize("doctor"),
    upload.single("file"),
    appointmentCtrl.addMessage
);

// ═══════════════════════════════════════════════════════════
// DOCTOR ONBOARDING & PROFILE SETUP
// ═══════════════════════════════════════════════════════════
router.get(
    "/verify-token/:token",
    doctorCtrl.verifyDoctorInviteToken
);

router.post(
    "/SetPassword/:token",
    doctorCtrl.doctorSetPassword
);

router.post(
    "/setup",
    authMiddleware,
    authorize("doctor"),
    upload.single("licenseDocument"),
    doctorCtrl.doctorSetupProfile
);

router.get(
    "/Profile",
    authMiddleware,
    authorize("doctor"),
    doctorCtrl.doctorProfile
);

module.exports = router;
