const AccessGrantService = require("../services/accessGrant.service");
const User = require("../models/user");

/**
 * POST /api/patients/me/access-grants
 * Patient grants a doctor access to their data
 */
const createGrant = async (req, res) => {
    try {
        const { doctorEmail, scope = "FULL_PROFILE", expiryDays = 30, reason } = req.body;

        if (!doctorEmail) {
            return res.status(400).json({
                success: false,
                message: "doctorEmail is required"
            });
        }

        const result = await AccessGrantService.createGrant({
            patientId: req.user.id,
            doctorEmail,
            scope,
            expiryDays,
            reason,
            source: "PATIENT_GRANTED"
        });

        return res.status(201).json({
            success: true,
            data: {
                grantId: result.grant.grantId,
                doctorEmail: result.doctorEmail,
                doctorName: result.doctorName,
                scope: result.grant.scope,
                status: result.grant.status,
                grantedAt: result.grant.grantedAt,
                expiresAt: result.grant.expiresAt,
                accessToken: result.accessToken
            }
        });
    } catch (error) {
        const status = error.statusCode || 500;
        return res.status(status).json({
            success: false,
            message: status === 500 ? "Failed to create access grant" : error.message
        });
    }
};

/**
 * GET /api/patients/me/access-grants
 * List all grants the patient has issued
 */
const listGrants = async (req, res) => {
    try {
        const { status = "ACTIVE", page = 1, limit = 20 } = req.query;

        const result = await AccessGrantService.listGrantsByPatient(
            req.user.id,
            { status, page: parseInt(page), limit: parseInt(limit) }
        );

        const grants = result.grants.map(g => ({
            grantId: g.grantId,
            doctorName: g.doctorId?.name || "Unknown",
            doctorEmail: g.doctorId?.email || "Unknown",
            scope: g.scope,
            source: g.source,
            status: g.status,
            grantedAt: g.grantedAt,
            expiresAt: g.expiresAt
        }));

        return res.status(200).json({
            success: true,
            data: {
                grants,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total
                }
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to list access grants"
        });
    }
};

/**
 * PATCH /api/patients/me/access-grants/:grantId
 * Update a grant (extend, change scope)
 */
const updateGrant = async (req, res) => {
    try {
        const { grantId } = req.params;
        const { scope, expiryDays } = req.body;

        if (!scope && !expiryDays) {
            return res.status(400).json({
                success: false,
                message: "At least one of scope or expiryDays is required"
            });
        }

        const grant = await AccessGrantService.updateGrant(
            grantId,
            req.user.id,
            { scope, expiryDays }
        );

        return res.status(200).json({
            success: true,
            data: {
                grantId: grant.grantId,
                scope: grant.scope,
                status: grant.status,
                expiresAt: grant.expiresAt
            }
        });
    } catch (error) {
        const status = error.statusCode || 500;
        return res.status(status).json({
            success: false,
            message: status === 500 ? "Failed to update grant" : error.message
        });
    }
};

/**
 * DELETE /api/patients/me/access-grants/:grantId
 * Revoke a grant
 */
const revokeGrant = async (req, res) => {
    try {
        const { grantId } = req.params;

        const grant = await AccessGrantService.revokeGrant(
            grantId,
            req.user.id,
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: "Access grant revoked",
            data: {
                grantId: grant.grantId,
                status: grant.status,
                revokedAt: grant.revokedAt
            }
        });
    } catch (error) {
        const status = error.statusCode || 500;
        return res.status(status).json({
            success: false,
            message: status === 500 ? "Failed to revoke grant" : error.message
        });
    }
};

module.exports = {
    createGrant,
    listGrants,
    updateGrant,
    revokeGrant
};
