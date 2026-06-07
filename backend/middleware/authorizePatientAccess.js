const PatientAccess = require("../models/patientAccess");
const Doctor = require("../models/doctor");

function authorizePatientAccess(requiredScope) {
    return async (req, res, next) => {
        try {
            const doctor = await Doctor.findOne({ userId: req.user.id });
            if (!doctor) {
                return res.status(404).json({ message: "Doctor profile not found" });
            }

            const doctorId = doctor._id;
            const patientId = req.params.patientId;

            const accessFilter = {
                patientId,
                doctorId,
                status: "ACTIVE",
                expiresAt: { $gt: new Date() }
            };

            if (req.organizationId) {
                accessFilter.organizationId = req.organizationId;
            }

            const access = await PatientAccess.findOne(accessFilter);

            if (!access) {
                return res.status(403).json({
                    message: "No active access to this patient"
                });
            }

            // Scope check
            const scopeHierarchy = {
                SUMMARY: 1,
                FULL_PROFILE: 2,
                FULL_WITH_WRITE: 3
            };

            if (
                scopeHierarchy[access.scope] <
                scopeHierarchy[requiredScope]
            ) {
                return res.status(403).json({
                    message: "Insufficient access scope"
                });
            }

            req.patientAccess = access;
            next();

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };
}

module.exports = authorizePatientAccess;