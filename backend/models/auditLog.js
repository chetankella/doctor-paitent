const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true
    },
    entity: {
        type: String,
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entity',
    },
    // Optional: org-scoped filtering (Decision B — added without breaking existing logs)
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null
    },
    // Optional: department-level filtering for future use
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        default: null
    },
    ipAddress: {
        type: String,
    },
    userAgent: {
        type: String,
    },
    description: {
        type: String,
    }
}, { timestamps: true });

// Index for efficient org-level activity queries
auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
