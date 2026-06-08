const EmergencyQRService = require("../services/emergencyQR.service");

/**
 * POST /api/patients/me/emergency-qr
 * Generate a new emergency QR code (revokes previous)
 */
const generateQR = async (req, res) => {
    try {
        const { expiryHours = 72, maxScans = 10, includeInsurance = false, origin } = req.body;

        const qr = await EmergencyQRService.generateQR(
            req.user.id,
            { expiryHours, maxScans, includeInsurance, origin }
        );

        return res.status(201).json({
            success: true,
            data: {
                qrId: qr._id,
                qrCodeImage: qr.qrCodeImage,
                referenceCode: qr.referenceCode,
                expiresAt: qr.expiresAt,
                maxScans: qr.maxScans,
                scansUsed: qr.scansUsed,
                status: qr.status
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to generate emergency QR code"
        });
    }
};

/**
 * GET /api/patients/me/emergency-qr
 * Get currently active QR
 */
const getActiveQR = async (req, res) => {
    try {
        const qr = await EmergencyQRService.getActiveQR(req.user.id);

        if (!qr) {
            return res.status(404).json({
                success: false,
                message: "No active emergency QR found"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                qrId: qr._id,
                qrCodeImage: qr.qrCodeImage,
                referenceCode: qr.referenceCode,
                expiresAt: qr.expiresAt,
                maxScans: qr.maxScans,
                scansUsed: qr.scansUsed,
                status: qr.status,
                includeInsurance: qr.includeInsurance,
                createdAt: qr.createdAt
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve emergency QR"
        });
    }
};

/**
 * DELETE /api/patients/me/emergency-qr
 * Revoke active QR
 */
const revokeQR = async (req, res) => {
    try {
        const revoked = await EmergencyQRService.revokeQR(req.user.id);

        if (!revoked) {
            return res.status(404).json({
                success: false,
                message: "No active emergency QR to revoke"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Emergency QR code revoked"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to revoke emergency QR"
        });
    }
};

/**
 * GET /api/patients/me/emergency-qr/scans
 * View who scanned the QR
 */
const getQRScans = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const result = await EmergencyQRService.getScanHistory(
            req.user.id,
            { page: parseInt(page), limit: parseInt(limit) }
        );

        return res.status(200).json({
            success: true,
            data: {
                scans: result.logs,
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
            message: "Failed to retrieve scan history"
        });
    }
};

/**
 * GET /api/emergency/access/:referenceCode
 * Public emergency endpoint — no auth required
 */
const scanEmergencyQR = async (req, res) => {
    try {
        const { referenceCode } = req.params;

        const result = await EmergencyQRService.scanQR(referenceCode);

        if (!result.valid) {
            return res.status(result.statusCode || 400).json({
                success: false,
                message: result.error
            });
        }

        // Set patientId and flags for logAccess middleware
        req.patientId = result.patientId;
        req.isEmergencyScan = true;
        req.referenceCode = referenceCode;
        req.accessScope = "EMERGENCY";

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to process emergency QR scan"
        });
    }
};

module.exports = {
    generateQR,
    getActiveQR,
    revokeQR,
    getQRScans,
    scanEmergencyQR
};
