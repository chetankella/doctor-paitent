const AccessLog = require("../models/accessLog");

/**
 * Middleware factory that logs every patient data access.
 * Place AFTER authentication/authorization middleware.
 *
 * Usage:
 *   router.get("/endpoint", auth, verifyGrant, logAccess("GRANT", "FULL_PROFILE"), handler);
 *   router.get("/emergency/:code", logAccess("EMERGENCY_QR", "EMERGENCY"), handler);
 *
 * @param {string} accessType - "GRANT" | "EMERGENCY_QR" | "REQUEST" | "SELF"
 * @param {string} defaultScope - fallback scope if not set on req
 */
function logAccess(accessType, defaultScope) {
    return async (req, res, next) => {
        // Capture the original res.json to intercept the response status
        const originalJson = res.json.bind(res);

        res.json = function (data) {
            // Log asynchronously — don't block the response
            const logEntry = {
                patientId: req.patientId || req.user?.id,
                accessedBy: buildAccessedBy(req),
                accessType,
                grantId: req.grantId || req.accessGrant?.grantId || null,
                referenceCode: req.referenceCode || null,
                scope: req.accessScope || defaultScope,
                endpoint: req.originalUrl,
                method: req.method,
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.headers["user-agent"] || null,
                responseStatus: res.statusCode
            };

            // Fire and forget — don't await
            AccessLog.create(logEntry).catch(err => {
                console.error("[AccessLog] Failed to write log:", err.message);
            });

            return originalJson(data);
        };

        next();
    };
}

/**
 * Build the accessedBy subdocument based on request context
 */
function buildAccessedBy(req) {
    // Emergency/anonymous scan
    if (req.isEmergencyScan) {
        return {
            userId: null,
            type: "EMERGENCY_SCAN",
            name: "Anonymous",
            email: null
        };
    }

    // Authenticated user
    if (req.user) {
        return {
            userId: req.user.id,
            type: req.user.role === "doctor" ? "DOCTOR" : 
                  req.user.role === "patient" ? "PATIENT_SELF" : "SYSTEM",
            name: req.user.name || null,
            email: req.user.email || null
        };
    }

    return {
        userId: null,
        type: "SYSTEM",
        name: "Unknown",
        email: null
    };
}

module.exports = logAccess;
