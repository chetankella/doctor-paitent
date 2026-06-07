const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// ─── Separate secrets for different token types ───
// Auth JWTs use JWT_SECRET, access grants use GRANT_TOKEN_SECRET
const AUTH_SECRET = process.env.JWT_SECRET;
const GRANT_SECRET = process.env.GRANT_TOKEN_SECRET || process.env.JWT_SECRET;

/**
 * Generate a JWT for user authentication (login/register)
 */
function generateAuthJWT(userId, role, expiresIn = "1d") {
    return jwt.sign(
        { id: userId, role, type: "AUTH" },
        AUTH_SECRET,
        { expiresIn }
    );
}

/**
 * Verify an auth JWT
 */
function verifyAuthJWT(token) {
    try {
        const decoded = jwt.verify(token, AUTH_SECRET);
        return { valid: true, data: decoded };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

// ─── Legacy functions (kept for backward compatibility during migration) ───

/**
 * @deprecated Use AccessGrant.generateAccessToken() instead
 * Generate a secure access token for patient data access
 */
function generateAccessToken(patientId, scope, expiresIn = "7d") {
    const token = jwt.sign(
        { patientId, scope, type: "PATIENT_ACCESS" },
        GRANT_SECRET,
        { expiresIn }
    );
    return token;
}

/**
 * @deprecated Use EmergencyQR model instead
 * Generate an emergency access token
 */
function generateEmergencyToken(patientId, expiresIn = "24h") {
    const token = jwt.sign(
        { patientId, scope: "EMERGENCY", type: "EMERGENCY_ACCESS", isEmergency: true },
        GRANT_SECRET,
        { expiresIn }
    );
    return token;
}

/**
 * @deprecated Use EmergencyQR model instead
 * Generate a QR code token
 */
function generateQRToken(patientId, expiresIn = "24h") {
    const qrToken = crypto.randomBytes(12).toString("hex").toUpperCase();
    const payload = jwt.sign(
        { patientId, qrToken, type: "QR_ACCESS", scope: "EMERGENCY" },
        GRANT_SECRET,
        { expiresIn }
    );
    return { qrToken, payload };
}

/**
 * @deprecated Use verifyAuthJWT() for auth tokens
 * Verify and decode a token (legacy - uses GRANT_SECRET)
 */
function verifyAccessToken(token) {
    try {
        const decoded = jwt.verify(token, GRANT_SECRET);
        return { valid: true, data: decoded };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

/**
 * Hash an identifier for logging/tracking without exposing raw value
 */
function hashIdentifier(value) {
    return crypto
        .createHash("sha256")
        .update(value)
        .digest("hex")
        .substring(0, 12);
}

module.exports = {
    generateAuthJWT,
    verifyAuthJWT,
    // Legacy exports (backward compatible)
    generateAccessToken,
    generateEmergencyToken,
    generateQRToken,
    verifyAccessToken,
    hashPatientIdentifier: hashIdentifier,
    hashIdentifier
};
