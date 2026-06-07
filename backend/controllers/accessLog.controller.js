const AccessLogService = require("../services/accessLog.service");

/**
 * GET /api/patients/me/access-logs
 * Patient views who accessed their data
 */
const getPatientLogs = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const result = await AccessLogService.getLogsByPatient(
            req.user.id,
            { page: parseInt(page), limit: parseInt(limit) }
        );

        return res.status(200).json({
            success: true,
            data: {
                logs: result.logs,
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
            message: "Failed to retrieve access logs"
        });
    }
};

/**
 * GET /api/doctors/me/access-logs
 * Doctor views their own access history
 */
const getDoctorLogs = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const result = await AccessLogService.getLogsByDoctor(
            req.user.id,
            { page: parseInt(page), limit: parseInt(limit) }
        );

        return res.status(200).json({
            success: true,
            data: {
                logs: result.logs,
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
            message: "Failed to retrieve access logs"
        });
    }
};

/**
 * GET /api/admin/access-logs
 * Admin views all access logs
 */
const getAdminLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50, accessType, fromDate, toDate } = req.query;

        const result = await AccessLogService.getAllLogs({
            page: parseInt(page),
            limit: parseInt(limit),
            accessType,
            fromDate,
            toDate
        });

        return res.status(200).json({
            success: true,
            data: {
                logs: result.logs,
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
            message: "Failed to retrieve access logs"
        });
    }
};

module.exports = {
    getPatientLogs,
    getDoctorLogs,
    getAdminLogs
};
