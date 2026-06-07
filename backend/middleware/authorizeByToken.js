const { verifyAccessToken } = require("../utils/token.utils");
const PatientAccess = require("../models/patientAccess");
const User = require("../models/user");
const Doctor = require("../models/doctor");

/**
 * Middleware to verify and authorize access using tokens
 * No patient ID exposed in URL
 */
function authorizeByToken(requiredScope) {
    return async (req, res, next) => {
        try {
            // Prefer explicit token in query string (used for QR / emergency links)
            let token = req.query.token;
            
            // Fallback to Authorization header only if query param is not present
            if (!token && req.headers.authorization) {
                token = req.headers.authorization.replace("Bearer ", "");
            }

            if (!token) {
                return res.status(401).json({
                    message: "Access token required"
                });
            }

            // Verify token
            const verification = verifyAccessToken(token);
            
            if (!verification.valid) {
                return res.status(401).json({
                    message: "Invalid or expired token",
                    error: verification.error
                });
            }

            const tokenData = verification.data;

            // Check if emergency access
            if (tokenData.type === "EMERGENCY_ACCESS") {
                req.patientId = tokenData.patientId;
                req.accessScope = "EMERGENCY";
                req.isEmergency = true;
                return next();
            }

            // Check if QR access
            if (tokenData.type === "QR_ACCESS") {
                req.patientId = tokenData.patientId;
                req.accessScope = tokenData.scope || "EMERGENCY";
                req.isQRAccess = true;
                return next();
            }

            // Regular patient access - verify in database
            if (tokenData.type === "PATIENT_ACCESS") {
                if (!req.user?.id) {
                    return res.status(401).json({ message: "Unauthorized" });
                }

                const doctor = await Doctor.findOne({ userId: req.user.id });
                if (!doctor) {
                    return res.status(404).json({ message: "Doctor profile not found" });
                }

                const accessFilter = {
                    patientId: tokenData.patientId,
                    doctorId: doctor._id,
                    status: "ACTIVE",
                    expiresAt: { $gt: new Date() }
                };

                if (req.organizationId) {
                    accessFilter.organizationId = req.organizationId;
                }

                const access = await PatientAccess.findOne(accessFilter);

                if (!access) {
                    return res.status(403).json({
                        message: "No active access to this patient data"
                    });
                }

                // Scope hierarchy check
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

                req.patientId = tokenData.patientId;
                req.patientAccess = access;
                req.accessScope = access.scope;
                return next();
            }

            return res.status(401).json({
                message: "Invalid token type"
            });

        } catch (error) {
            res.status(500).json({
                message: "Authorization error",
                error: error.message
            });
        }
    };
}

/**
 * Middleware to authorize by patient email (instead of ID)
 * Used for internal doctor-patient lookups
 */
function authorizeByEmail(requiredScope) {
    return async (req, res, next) => {
        try {
            const { patientEmail } = req.body || req.query;

            if (!patientEmail) {
                return res.status(400).json({
                    message: "Patient email required"
                });
            }

            // Find patient by email
            const patient = await User.findOne({
                email: patientEmail,
                role: "patient"
            });

            if (!patient) {
                return res.status(404).json({
                    message: "Patient not found"
                });
            }

            // Check access for this doctor to this patient
            const doctor = await Doctor.findOne({ userId: req.user.id });
            if (!doctor) {
                return res.status(404).json({ message: "Doctor profile not found" });
            }

            const accessFilter = {
                patientId: patient._id,
                doctorId: doctor._id,
                status: "ACTIVE",
                expiresAt: { $gt: new Date() }
            };

            if (req.organizationId) {
                accessFilter.organizationId = req.organizationId;
            }

            const access = await PatientAccess.findOne(accessFilter);

            if (!access) {
                return res.status(403).json({
                    message: "No access to this patient"
                });
            }

            req.patientId = patient._id;
            req.patientEmail = patientEmail;
            req.patientAccess = access;
            req.accessScope = access.scope;
            next();

        } catch (error) {
            res.status(500).json({
                message: "Authorization error",
                error: error.message
            });
        }
    };
}

module.exports = {
    authorizeByToken,
    authorizeByEmail
};
