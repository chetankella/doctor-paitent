/**
 * Scope-based data projection for patient profiles.
 * Returns only the fields allowed for the given scope level.
 */

const SCOPE_PROJECTIONS = {
    EMERGENCY: [
        "bloodGroup",
        "allergies",
        "chronicConditions",
        "currentMedications",
        "criticalAlerts",
        "organDonor",
        "emergencyContact"
    ],

    SUMMARY: [
        "dateOfBirth",
        "gender",
        "bloodGroup",
        "allergies",
        "chronicConditions",
        "currentMedications",
        "criticalAlerts",
        "organDonor",
        "emergencyContact"
    ],

    FULL_PROFILE: [
        "dateOfBirth",
        "gender",
        "bloodGroup",
        "phoneNumber",
        "heightCm",
        "weightKg",
        "allergies",
        "chronicConditions",
        "currentMedications",
        "pastSurgeries",
        "familyHistory",
        "lifestyle",
        "emergencyContact",
        "insurance",
        "criticalAlerts",
        "organDonor",
        "address"
    ],

    FULL_WITH_WRITE: "FULL" // returns everything
};

/**
 * Project patient data based on scope string
 * @param {Object} patient - plain patient object (lean)
 * @param {string} scope - "EMERGENCY" | "SUMMARY" | "FULL_PROFILE" | "FULL_WITH_WRITE"
 * @returns {Object} filtered patient data
 */
function projectPatientData(patient, scopeOrAccess) {
    // Support both new scope strings and legacy access objects
    let scope;
    if (typeof scopeOrAccess === "string") {
        scope = scopeOrAccess;
    } else if (scopeOrAccess?.scope) {
        scope = scopeOrAccess.scope;
    } else if (scopeOrAccess?.accessType) {
        // Legacy fallback: map accessType to scope
        const legacyMap = {
            EMERGENCY: "EMERGENCY",
            APPOINTMENT: "FULL_PROFILE",
            MANUAL: "FULL_PROFILE",
            ORGANIZATION: "FULL_PROFILE"
        };
        scope = legacyMap[scopeOrAccess.accessType] || "EMERGENCY";
    } else {
        scope = "EMERGENCY"; // safest default
    }

    const rule = SCOPE_PROJECTIONS[scope];

    if (rule === "FULL") {
        // Remove internal fields even for full access
        const { _id, __v, userId, status, ...data } = patient;
        return data;
    }

    if (!rule) {
        // Unknown scope — return emergency data only (fail-safe)
        return projectPatientData(patient, "EMERGENCY");
    }

    const filtered = {};
    rule.forEach(field => {
        if (patient[field] !== undefined) {
            filtered[field] = patient[field];
        }
    });

    return filtered;
}

module.exports = {
    projectPatientData,
    SCOPE_PROJECTIONS
};