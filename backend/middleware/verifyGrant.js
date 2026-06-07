const AccessGrant = require("../models/accessGrant");

/**
 * Middleware to verify a doctor has a valid AccessGrant for the patient.
 * Looks up the grant by grantId (from URL param) and validates:
 *   - Grant exists and is ACTIVE
 *   - Grant is not expired
 *   - Grant belongs to the requesting doctor
 *   - Grant scope meets the required minimum
 *
 * Sets on req:
 *   req.accessGrant  — the full grant document
 *   req.patientId    — the patient's User _id
 *   req.grantId      — the grant's human-readable ID
 *   req.accessScope  — the scope string
 *
 * Usage:
 *   router.get("/:grantId/profile", auth, authorize("doctor"), verifyGrant("SUMMARY"), handler);
 *
 * @param {string} requiredScope - minimum scope needed: "EMERGENCY" | "SUMMARY" | "FULL_PROFILE" | "FULL_WITH_WRITE"
 */
function verifyGrant(requiredScope) {
    const SCOPE_HIERARCHY = {
        EMERGENCY: 0,
        SUMMARY: 1,
        FULL_PROFILE: 2,
        FULL_WITH_WRITE: 3
    };

    return async (req, res, next) => {
        try {
            const { grantId } = req.params;

            if (!grantId) {
                return res.status(400).json({
                    success: false,
                    message: "Grant ID is required"
                });
            }

            // Find the grant
            const grant = await AccessGrant.findOne({
                grantId,
                status: "ACTIVE"
            });

            if (!grant) {
                return res.status(404).json({
                    success: false,
                    message: "Access grant not found or has been revoked"
                });
            }

            // Check expiry
            if (grant.expiresAt <= new Date()) {
                // Auto-expire the grant
                grant.status = "EXPIRED";
                await grant.save();

                return res.status(403).json({
                    success: false,
                    message: "Access grant has expired"
                });
            }

            // Verify the grant belongs to this doctor
            if (grant.doctorId.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: "This grant does not belong to you"
                });
            }

            // Scope hierarchy check
            const grantLevel = SCOPE_HIERARCHY[grant.scope];
            const requiredLevel = SCOPE_HIERARCHY[requiredScope];

            if (grantLevel === undefined || requiredLevel === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid scope configuration"
                });
            }

            if (grantLevel < requiredLevel) {
                return res.status(403).json({
                    success: false,
                    message: `Insufficient scope. Grant has '${grant.scope}' but '${requiredScope}' is required`
                });
            }

            // Attach grant info to request
            req.accessGrant = grant;
            req.patientId = grant.patientId;
            req.grantId = grant.grantId;
            req.accessScope = grant.scope;

            next();
        } catch (error) {
            console.error("[verifyGrant] Error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Authorization error"
            });
        }
    };
}

module.exports = verifyGrant;
