const QRCode = require("qrcode");
const EmergencyQR = require("../models/emergencyQR");
const Patient = require("../models/patientProfile");

/**
 * Generate a new emergency QR for a patient.
 * Automatically revokes any existing active QR for this patient.
 */
async function generateQR(patientId, { expiryHours = 72, maxScans = 10, includeInsurance = false } = {}) {
    // Revoke any existing active QR
    await EmergencyQR.updateMany(
        { patientId, status: "ACTIVE" },
        { status: "REVOKED", revokedAt: new Date() }
    );

    // Generate unique reference code
    let referenceCode;
    let attempts = 0;
    do {
        referenceCode = EmergencyQR.generateReferenceCode();
        const existing = await EmergencyQR.findOne({ referenceCode });
        if (!existing) break;
        attempts++;
    } while (attempts < 5);

    if (attempts >= 5) {
        throw new Error("Failed to generate unique reference code");
    }

    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Build the QR data URL — just the reference code
    const scanUrl = `${process.env.APP_URL || "http://localhost:3000"}/api/emergency/access/${referenceCode}`;

    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(scanUrl, {
        errorCorrectionLevel: "H",
        type: "image/png",
        width: 300,
        margin: 1,
        color: { dark: "#000000", light: "#FFFFFF" }
    });

    const qr = await EmergencyQR.create({
        patientId,
        referenceCode,
        expiresAt,
        maxScans,
        includeInsurance,
        qrCodeImage
    });

    return qr;
}

/**
 * Get the currently active QR for a patient
 */
async function getActiveQR(patientId) {
    return EmergencyQR.findOne({
        patientId,
        status: "ACTIVE",
        expiresAt: { $gt: new Date() }
    });
}

/**
 * Revoke a patient's active QR
 */
async function revokeQR(patientId) {
    const result = await EmergencyQR.updateMany(
        { patientId, status: "ACTIVE" },
        { status: "REVOKED", revokedAt: new Date() }
    );
    return result.modifiedCount > 0;
}

/**
 * Look up a QR by reference code, validate it, and record the scan
 */
async function scanQR(referenceCode) {
    const qr = await EmergencyQR.findOne({ referenceCode });

    if (!qr) {
        return { valid: false, error: "QR code not found", statusCode: 404 };
    }

    if (qr.status === "REVOKED") {
        return { valid: false, error: "QR code has been revoked", statusCode: 410 };
    }

    if (qr.expiresAt <= new Date()) {
        qr.status = "EXPIRED";
        await qr.save();
        return { valid: false, error: "QR code has expired", statusCode: 410 };
    }

    if (qr.scansUsed >= qr.maxScans) {
        qr.status = "EXPIRED";
        await qr.save();
        return { valid: false, error: "QR code scan limit reached", statusCode: 410 };
    }

    // Record the scan
    await qr.recordScan();

    // Fetch the patient's emergency data
    const patient = await Patient.findOne({ userId: qr.patientId })
        .select("bloodGroup allergies chronicConditions currentMedications criticalAlerts organDonor emergencyContact insurance")
        .lean();

    if (!patient) {
        return { valid: false, error: "Patient profile not found", statusCode: 404 };
    }

    // Build emergency response
    const emergencyData = {
        type: "EMERGENCY_PROFILE",
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies || [],
        chronicConditions: patient.chronicConditions || [],
        currentMedications: patient.currentMedications || [],
        criticalAlerts: patient.criticalAlerts || [],
        organDonor: patient.organDonor || false,
        emergencyContact: patient.emergencyContact || null
    };

    // Only include insurance if patient opted in
    if (qr.includeInsurance && patient.insurance) {
        emergencyData.insurance = patient.insurance;
    }

    emergencyData.scannedAt = new Date();
    emergencyData.expiresAt = qr.expiresAt;
    emergencyData.remainingScans = qr.maxScans - qr.scansUsed;

    return { valid: true, data: emergencyData, patientId: qr.patientId };
}

/**
 * Get scan history for a patient's QR
 */
async function getScanHistory(patientId, { page = 1, limit = 20 } = {}) {
    const AccessLog = require("../models/accessLog");

    const filter = {
        patientId,
        accessType: "EMERGENCY_QR"
    };

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
    generateQR,
    getActiveQR,
    revokeQR,
    scanQR,
    getScanHistory
};
