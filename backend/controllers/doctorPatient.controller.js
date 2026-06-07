const AccessGrantService = require("../services/accessGrant.service");
const Patient = require("../models/patientProfile");
const { projectPatientData } = require("../services/projection.service");

/**
 * GET /api/doctors/me/patients
 * List all patients the doctor has access to
 */
const listMyPatients = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const result = await AccessGrantService.listGrantsByDoctor(
            req.user.id,
            { page: parseInt(page), limit: parseInt(limit) }
        );

        const patients = result.grants.map(g => ({
            grantId: g.grantId,
            patientName: g.patientId?.name || "Unknown",
            patientEmail: g.patientId?.email || "Unknown",
            scope: g.scope,
            source: g.source,
            grantedAt: g.grantedAt,
            expiresAt: g.expiresAt
        }));

        return res.status(200).json({
            success: true,
            data: {
                patients,
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
            message: "Failed to list patients"
        });
    }
};

/**
 * GET /api/doctors/me/patients/:grantId/profile
 * View patient profile via access grant
 * Requires verifyGrant middleware
 */
const viewPatientProfile = async (req, res) => {
    try {
        const patient = await Patient.findOne({ userId: req.patientId })
            .populate("userId", "name email")
            .lean();

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found"
            });
        }

        // Apply scope-based projection
        const filteredData = projectPatientData(patient, req.accessScope);

        // Add patient name/email if scope allows it
        if (["SUMMARY", "FULL_PROFILE", "FULL_WITH_WRITE"].includes(req.accessScope)) {
            filteredData.name = patient.userId?.name;
            filteredData.email = patient.userId?.email;
        }

        return res.status(200).json({
            success: true,
            data: {
                grant: {
                    grantId: req.grantId,
                    scope: req.accessScope,
                    expiresAt: req.accessGrant.expiresAt
                },
                patient: filteredData
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve patient profile"
        });
    }
};

/**
 * GET /api/doctors/me/patients/:grantId/emergency
 * Quick-view emergency data for a patient
 * Always returns EMERGENCY scope regardless of grant scope
 */
const viewEmergencyData = async (req, res) => {
    try {
        const patient = await Patient.findOne({ userId: req.patientId })
            .select("bloodGroup allergies chronicConditions currentMedications criticalAlerts organDonor emergencyContact")
            .populate("userId", "name")
            .lean();

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                patientName: patient.userId?.name,
                bloodGroup: patient.bloodGroup,
                allergies: patient.allergies || [],
                chronicConditions: patient.chronicConditions || [],
                currentMedications: patient.currentMedications || [],
                criticalAlerts: patient.criticalAlerts || [],
                organDonor: patient.organDonor || false,
                emergencyContact: patient.emergencyContact || null
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve emergency data"
        });
    }
};

module.exports = {
    listMyPatients,
    viewPatientProfile,
    viewEmergencyData
};
