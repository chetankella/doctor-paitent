const OrganizationRequestService = require("../services/organizationRequest.service");
const OrganizationRequest = require("../models/organizationRequest");

const createOrganizationRequest = async (req, res) => {
    try {
        const requestData = {
            name: req.body.name,
            type: req.body.type,
            description: req.body.description,
            contactPhone: req.body.contactPhone,
            contactEmail: req.body.contactEmail,
            website: req.body.website,
            addressLine1: req.body.addressLine1,
            addressLine2: req.body.addressLine2,
            city: req.body.city,
            state: req.body.state,
            country: req.body.country,
            pincode: req.body.pincode,
            clinicalEstablishmentNumber: req.body.clinicalEstablishmentNumber,
            GSTNumber: req.body.GSTNumber,
            PANNumber: req.body.PANNumber,
            NABHAccreditationNumber: req.body.NABHAccreditationNumber,
            superAdminEmail: req.body.superAdminEmail,
            superAdminPhone: req.body.superAdminPhone,
            superAdminName: req.body.superAdminName
        };

        const organizationRequest = await OrganizationRequestService.createRequest(requestData);

        res.status(201).json({
            success: true,
            message: "Organization request submitted successfully. Please wait for admin approval.",
            data: {
                id: organizationRequest._id,
                name: organizationRequest.name,
                type: organizationRequest.type,
                status: organizationRequest.status,
                contactEmail: organizationRequest.contactEmail,
                createdAt: organizationRequest.createdAt
            }
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getMyOrganizationRequest = async (req, res) => {
    try {
        const email = typeof req.query.email === "string"
            ? req.query.email.trim().toLowerCase()
            : "";

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email query parameter is required"
            });
        }

        const request = await OrganizationRequest.findOne({ contactEmail: email })
            .sort({ createdAt: -1 });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "No organization request found for this email"
            });
        }

        res.json({
            success: true,
            data: request
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createOrganizationRequest,
    getMyOrganizationRequest
};
