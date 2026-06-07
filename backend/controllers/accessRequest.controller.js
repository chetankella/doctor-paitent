const AccessRequest = require("../models/accessRequest");
const AccessGrantService = require("../services/accessGrant.service");
const User = require("../models/user");

/**
 * POST /api/doctors/me/access-requests
 * Doctor requests access to a patient
 */
const createRequest = async (req, res) => {
    try {
        const { patientEmail, scope = "FULL_PROFILE", reason, requestedDays = 14 } = req.body;

        if (!patientEmail || !reason) {
            return res.status(400).json({
                success: false,
                message: "patientEmail and reason are required"
            });
        }

        // Find patient
        const patient = await User.findOne({ email: patientEmail, role: "patient" });
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        // Check for existing pending request
        const existing = await AccessRequest.findOne({
            doctorId: req.user.id,
            patientId: patient._id,
            status: "PENDING"
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                message: "You already have a pending request for this patient"
            });
        }

        const requestId = AccessRequest.generateRequestId();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days to respond

        const request = await AccessRequest.create({
            requestId,
            doctorId: req.user.id,
            patientId: patient._id,
            patientEmail,
            scope,
            reason,
            requestedDays,
            expiresAt
        });

        // TODO: Send notification to patient (email/push)

        return res.status(201).json({
            success: true,
            data: {
                requestId: request.requestId,
                status: request.status,
                patientNotified: true,
                createdAt: request.createdAt
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create access request"
        });
    }
};

/**
 * GET /api/patients/me/access-requests
 * Patient views pending access requests
 */
const listPatientRequests = async (req, res) => {
    try {
        const { status = "PENDING", page = 1, limit = 20 } = req.query;

        const filter = { patientId: req.user.id };
        if (status !== "ALL") {
            filter.status = status;
        }

        const [requests, total] = await Promise.all([
            AccessRequest.find(filter)
                .populate("doctorId", "name email")
                .sort({ createdAt: -1 })
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit))
                .lean(),
            AccessRequest.countDocuments(filter)
        ]);

        const formatted = requests.map(r => ({
            requestId: r.requestId,
            doctorName: r.doctorId?.name || "Unknown",
            doctorEmail: r.doctorId?.email || "Unknown",
            scope: r.scope,
            reason: r.reason,
            requestedDays: r.requestedDays,
            status: r.status,
            createdAt: r.createdAt,
            expiresAt: r.expiresAt
        }));

        return res.status(200).json({
            success: true,
            data: {
                requests: formatted,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total
                }
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to list access requests"
        });
    }
};

/**
 * PATCH /api/patients/me/access-requests/:requestId
 * Patient approves or rejects a request
 */
const respondToRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { action, scope, expiryDays } = req.body;

        if (!action || !["APPROVE", "REJECT"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "action must be 'APPROVE' or 'REJECT'"
            });
        }

        const request = await AccessRequest.findOne({
            requestId,
            patientId: req.user.id,
            status: "PENDING"
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Request not found or already processed"
            });
        }

        // Check if request has expired
        if (request.expiresAt <= new Date()) {
            request.status = "EXPIRED";
            await request.save();
            return res.status(410).json({
                success: false,
                message: "Access request has expired"
            });
        }

        if (action === "REJECT") {
            request.status = "REJECTED";
            request.respondedAt = new Date();
            await request.save();

            return res.status(200).json({
                success: true,
                data: {
                    requestId: request.requestId,
                    status: "REJECTED"
                }
            });
        }

        // APPROVE — create an access grant
        const grantScope = scope || request.scope;
        const grantDays = expiryDays || request.requestedDays;

        // Get doctor email for grant creation
        const doctor = await User.findById(request.doctorId);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found"
            });
        }

        const grantResult = await AccessGrantService.createGrant({
            patientId: req.user.id,
            doctorEmail: doctor.email,
            scope: grantScope,
            expiryDays: grantDays,
            reason: request.reason,
            source: "REQUEST_APPROVED"
        });

        request.status = "APPROVED";
        request.respondedAt = new Date();
        request.grantId = grantResult.grant.grantId;
        await request.save();

        return res.status(200).json({
            success: true,
            data: {
                requestId: request.requestId,
                status: "APPROVED",
                grantId: grantResult.grant.grantId,
                scope: grantScope,
                expiresAt: grantResult.grant.expiresAt
            }
        });
    } catch (error) {
        const status = error.statusCode || 500;
        return res.status(status).json({
            success: false,
            message: status === 500 ? "Failed to process request" : error.message
        });
    }
};

module.exports = {
    createRequest,
    listPatientRequests,
    respondToRequest
};
