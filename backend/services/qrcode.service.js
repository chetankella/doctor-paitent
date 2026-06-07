const QRCode = require("qrcode");
const { generateQRToken, generateEmergencyToken } = require("../utils/token.utils");

/**
 * Generate a QR code for emergency access
 * Returns both the QR code image and the token data
 */
async function generateEmergencyQRCode(patientId, patientEmail) {
    try {
        // Generate QR token with short expiry
        const { qrToken, payload } = generateQRToken(patientId, "24h");

        // Create QR code data string
        // Format: <app-url>/access/emergency?token=<TOKEN>
        const qrData = `${process.env.APP_URL || "http://localhost:3000"}/access/emergency?token=${payload}`;

        // Generate QR code image as Data URL
        const qrCodeImage = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: "H",
            type: "image/png",
            width: 300,
            margin: 1,
            color: {
                dark: "#000000",
                light: "#FFFFFF"
            }
        });

        return {
            success: true,
            qrToken,           // Short token for manual entry
            payload,            // Full JWT token
            qrCodeImage,        // Base64 encoded QR code image
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            patientIdentifier: patientEmail, // For reference without exposing ID
            type: "EMERGENCY"
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate a QR code for regular patient data access
 */
async function generateAccessQRCode(patientId, scope = "FULL_PROFILE", expiryDays = 7) {
    try {
        const qrData = `${process.env.APP_URL || "http://localhost:3000"}/access/view?token=${patientId}&scope=${scope}`;

        const qrCodeImage = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: "H",
            type: "image/png",
            width: 300,
            margin: 1
        });

        return {
            success: true,
            qrCodeImage,
            expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
            scope,
            type: "PATIENT_ACCESS"
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate a simple sharing link (anonymous access)
 */
function generateShareLink(patientId, expiryDays = 7) {
    const { payload } = generateQRToken(patientId, `${expiryDays}d`);

    return {
        shareLink: `${process.env.APP_URL || "http://localhost:3000"}/access/shared?token=${payload}`,
        token: payload,
        expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
    };
}

module.exports = {
    generateEmergencyQRCode,
    generateAccessQRCode,
    generateShareLink
};
