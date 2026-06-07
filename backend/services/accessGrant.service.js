const AccessGrant = require("../models/accessGrant");
const User = require("../models/user");

/**
 * Create an access grant from patient to doctor
 */
async function createGrant({ patientId, doctorEmail, scope, expiryDays, reason, source = "PATIENT_GRANTED", organizationId = null }) {
    // Find doctor by email
    const doctorUser = await User.findOne({ email: doctorEmail, role: "doctor" });
    if (!doctorUser) {
        throw Object.assign(new Error("Doctor not found with that email"), { statusCode: 404 });
    }

    // Expire any existing active grants for this doctor-patient pair
    await AccessGrant.updateMany(
        { patientId, doctorId: doctorUser._id, status: "ACTIVE" },
        { status: "EXPIRED" }
    );

    // Generate IDs and token
    const grantId = AccessGrant.generateGrantId();
    const { raw: accessToken, hash: accessTokenHash } = AccessGrant.generateAccessToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const grant = await AccessGrant.create({
        grantId,
        patientId,
        doctorId: doctorUser._id,
        organizationId,
        scope,
        accessTokenHash,
        source,
        reason,
        expiresAt
    });

    return {
        grant,
        accessToken, // raw token — returned once, never stored in plaintext
        doctorName: doctorUser.name,
        doctorEmail: doctorUser.email
    };
}

/**
 * List all grants for a patient
 */
async function listGrantsByPatient(patientId, { status = "ACTIVE", page = 1, limit = 20 } = {}) {
    const filter = { patientId };
    if (status !== "ALL") {
        filter.status = status;
    }

    const [grants, total] = await Promise.all([
        AccessGrant.find(filter)
            .populate("doctorId", "name email")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        AccessGrant.countDocuments(filter)
    ]);

    return { grants, total, page, limit };
}

/**
 * List all active grants for a doctor (their patients)
 */
async function listGrantsByDoctor(doctorId, { page = 1, limit = 20 } = {}) {
    const filter = {
        doctorId,
        status: "ACTIVE",
        expiresAt: { $gt: new Date() }
    };

    const [grants, total] = await Promise.all([
        AccessGrant.find(filter)
            .populate("patientId", "name email")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        AccessGrant.countDocuments(filter)
    ]);

    return { grants, total, page, limit };
}

/**
 * Update a grant (extend, change scope)
 */
async function updateGrant(grantId, patientId, updates) {
    const grant = await AccessGrant.findOne({ grantId, patientId, status: "ACTIVE" });
    if (!grant) {
        throw Object.assign(new Error("Grant not found or already revoked"), { statusCode: 404 });
    }

    if (updates.scope) grant.scope = updates.scope;
    if (updates.expiryDays) {
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + updates.expiryDays);
        grant.expiresAt = newExpiry;
    }

    await grant.save();
    return grant;
}

/**
 * Revoke a grant
 */
async function revokeGrant(grantId, patientId, revokedBy) {
    const grant = await AccessGrant.findOne({ grantId, patientId, status: "ACTIVE" });
    if (!grant) {
        throw Object.assign(new Error("Grant not found or already revoked"), { statusCode: 404 });
    }

    grant.status = "REVOKED";
    grant.revokedAt = new Date();
    grant.revokedBy = revokedBy;
    await grant.save();

    return grant;
}

/**
 * Lookup a grant by its raw access token (for doctor-side access)
 */
async function findByAccessToken(rawToken) {
    const hash = AccessGrant.hashToken(rawToken);
    const grant = await AccessGrant.findOne({
        accessTokenHash: hash,
        status: "ACTIVE",
        expiresAt: { $gt: new Date() }
    });
    return grant;
}

module.exports = {
    createGrant,
    listGrantsByPatient,
    listGrantsByDoctor,
    updateGrant,
    revokeGrant,
    findByAccessToken
};
