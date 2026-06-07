const AccessLog = require("../models/accessLog");

/**
 * Get access logs for a specific patient
 */
async function getLogsByPatient(patientId, { page = 1, limit = 20 } = {}) {
    const filter = { patientId };

    const [logs, total] = await Promise.all([
        AccessLog.find(filter)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        AccessLog.countDocuments(filter)
    ]);

    return { logs, total, page, limit };
}

/**
 * Get access logs for a specific doctor (their access history)
 */
async function getLogsByDoctor(doctorUserId, { page = 1, limit = 20 } = {}) {
    const filter = { "accessedBy.userId": doctorUserId };

    const [logs, total] = await Promise.all([
        AccessLog.find(filter)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        AccessLog.countDocuments(filter)
    ]);

    return { logs, total, page, limit };
}

/**
 * Get all access logs (admin)
 */
async function getAllLogs({ page = 1, limit = 50, accessType, fromDate, toDate } = {}) {
    const filter = {};
    if (accessType) filter.accessType = accessType;
    if (fromDate || toDate) {
        filter.timestamp = {};
        if (fromDate) filter.timestamp.$gte = new Date(fromDate);
        if (toDate) filter.timestamp.$lte = new Date(toDate);
    }

    const [logs, total] = await Promise.all([
        AccessLog.find(filter)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        AccessLog.countDocuments(filter)
    ]);

    return { logs, total, page, limit };
}

module.exports = {
    getLogsByPatient,
    getLogsByDoctor,
    getAllLogs
};
