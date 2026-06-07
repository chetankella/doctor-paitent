const AuditLog = require('../models/auditLog.js');

const logAction = async ({
    userId,
    action,
    entity,
    entityId,
    organizationId = null,
    departmentId = null,
    ipAddress,
    userAgent,
    description
} = {}) => {
    try {
        const logEntry = new AuditLog({
            userId,
            action,
            entity,
            entityId,
            organizationId,
            departmentId,
            ipAddress,
            userAgent,
            description
        });
        await logEntry.save();
    } catch (error) {
        console.error('Error logging audit action:', error);
    }
};

module.exports = {
    logAction
};