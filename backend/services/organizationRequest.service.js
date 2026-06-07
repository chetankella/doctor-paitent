const mongoose = require("mongoose");
const OrganizationRequest = require("../models/organizationRequest");
const Organization = require("../models/organization");
const User = require("../models/user");
const OrganizationAdmin = require("../models/organizationAdmin");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const AuditService = require("../services/audit.service");

class OrganizationRequestService {
    static normalizeRequestData(requestData = {}) {
        const normalized = { ...requestData };

        const trimFields = [
            "name", "type", "description", "contactPhone", "contactEmail", "website",
            "addressLine1", "addressLine2", "city", "state", "country", "pincode",
            "clinicalEstablishmentNumber", "GSTNumber", "PANNumber",
            "NABHAccreditationNumber", "superAdminEmail", "superAdminPhone",
            "superAdminName"
        ];

        trimFields.forEach((field) => {
            if (typeof normalized[field] === "string") {
                normalized[field] = normalized[field].trim();
            }
        });

        ["contactEmail", "superAdminEmail"].forEach((field) => {
            if (normalized[field]) {
                normalized[field] = normalized[field].toLowerCase();
            }
        });

        [
            "description", "website", "addressLine2", "clinicalEstablishmentNumber",
            "GSTNumber", "PANNumber", "NABHAccreditationNumber"
        ].forEach((field) => {
            if (normalized[field] === "") {
                normalized[field] = undefined;
            }
        });

        return normalized;
    }

    static buildRegistrationConflictQuery(source) {
        const registrationFields = [
            "clinicalEstablishmentNumber",
            "GSTNumber",
            "PANNumber"
        ];

        const clauses = registrationFields
            .filter((field) => source[field])
            .map((field) => ({ [field]: source[field] }));

        return clauses.length > 0 ? { $or: clauses } : null;
    }

    static async createRequest(requestData) {
        requestData = this.normalizeRequestData(requestData);
        
        const existingEmailRequest = await OrganizationRequest.findOne({
            contactEmail: requestData.contactEmail,
            status: { $in: ["PENDING", "APPROVED"] }
        });

        if (existingEmailRequest) {
            throw new Error("An organization request with this email already exists");
        }

        const existingOrgEmail = await Organization.findOne({
            contactEmail: requestData.contactEmail
        });

        if (existingOrgEmail) {
            throw new Error("An organization with this email is already registered");
        }

        const registrationRequestConflictQuery = this.buildRegistrationConflictQuery(requestData);

        if (registrationRequestConflictQuery) {
            const existingRegistrationRequest = await OrganizationRequest.findOne({
                ...registrationRequestConflictQuery,
                status: { $in: ["PENDING", "APPROVED"] }
            });

            if (existingRegistrationRequest) {
                throw new Error("An organization request with these registration numbers already exists");
            }
        }

        const registrationOrgConflictQuery = this.buildRegistrationConflictQuery(requestData);

        if (registrationOrgConflictQuery) {
            const existingRegisteredOrganization = await Organization.findOne(registrationOrgConflictQuery);

            if (existingRegisteredOrganization) {
                throw new Error("An organization with these registration numbers is already registered");
            }
        }

        const organizationRequest = new OrganizationRequest({
            ...requestData,
            status: "PENDING"
        });

        await organizationRequest.save();

        return organizationRequest;
    }

    static async getRequestById(requestId) {
        const request = await OrganizationRequest.findById(requestId);
        if (!request) {
            throw new Error("Organization request not found");
        }
        return request;
    }

    static async getAllRequests(filters = {}) {
        const query = {};
        
        if (filters.status) {
            query.status = filters.status;
        }
        
        if (filters.email) {
            query.contactEmail = { $regex: filters.email, $options: "i" };
        }
        
        if (filters.name) {
            query.name = { $regex: filters.name, $options: "i" };
        }

        return await OrganizationRequest.find(query).sort({ createdAt: -1 });
    }

    static async approveRequest(requestId, adminId, updateData = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const request = await OrganizationRequest.findById(requestId).session(session);
            
            if (!request) {
                throw new Error("Organization request not found");
            }

            if (request.status !== "PENDING") {
                throw new Error(`Cannot approve request with status: ${request.status}`);
            }

            const normalizedUpdateData = this.normalizeRequestData(updateData);

            if (normalizedUpdateData && Object.keys(normalizedUpdateData).length > 0) {
                const fieldsToUpdate = [
                    "name", "type", "description", "contactPhone", "contactEmail",
                    "website", "addressLine1", "addressLine2", "city", "state", "country",
                    "pincode", "clinicalEstablishmentNumber", "GSTNumber", "PANNumber",
                    "NABHAccreditationNumber", "superAdminEmail", "superAdminPhone", "superAdminName"
                ];

                fieldsToUpdate.forEach(field => {
                    if (normalizedUpdateData[field] !== undefined) {
                        request[field] = normalizedUpdateData[field];
                    }
                });
            }

            const registrationConflictQuery = this.buildRegistrationConflictQuery(request);

            if (registrationConflictQuery) {
                const existingOrganization = await Organization.findOne(registrationConflictQuery).session(session);

                if (existingOrganization) {
                    throw new Error("An organization with these registration numbers already exists");
                }
            }

            const rawToken = crypto.randomBytes(32).toString("hex");
            const hashedToken = crypto
                .createHash("sha256")
                .update(rawToken)
                .digest("hex");

            const organizationData = this.normalizeRequestData({
                name: request.name,
                type: request.type,
                description: request.description,
                contactPhone: request.contactPhone,
                contactEmail: request.contactEmail,
                website: request.website,
                addressLine1: request.addressLine1,
                addressLine2: request.addressLine2,
                city: request.city,
                state: request.state,
                country: request.country,
                pincode: request.pincode,
                clinicalEstablishmentNumber: request.clinicalEstablishmentNumber,
                GSTNumber: request.GSTNumber,
                PANNumber: request.PANNumber,
                NABHAccreditationNumber: request.NABHAccreditationNumber,
                status: "PENDING_VERIFICATION",
                verificationStatus: "PENDING",
                superAdminInviteToken: hashedToken,
                superAdminInviteExpires: Date.now() + 72 * 60 * 60 * 1000,
                // Copy super admin contact info so setupSuperAdmin knows which email to create
                superAdminEmail: request.superAdminEmail,
                superAdminName: request.superAdminName,
                superAdminPhone: request.superAdminPhone
            });

            const organization = new Organization(organizationData);

            await organization.save({ session });

            request.status = "APPROVED";
            request.reviewedBy = adminId;
            request.reviewedAt = new Date();
            await request.save({ session });

            await AuditService.logAction({
                userId: adminId,
                action: "approve_organization",
                entity: "OrganizationRequest",
                entityId: request._id,
                description: `Approved organization request for ${request.name} (${request.contactEmail})`,
                ipAddress: null,
                userAgent: null
            });

            const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/create-superadmin?token=${rawToken}`;

            // Send invite to the designated super admin, not the generic contact email
            await sendEmail(
                request.superAdminEmail,
                "You have been invited as Super Admin — Set Up Your Account",
                `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Super Admin Account Invitation</h2>

                    <p>Hello ${request.superAdminName},</p>

                    <p>
                    The organization <strong>${request.name}</strong> has been approved on our platform.
                    You have been designated as the <strong>Super Admin</strong> for this organization.
                    </p>

                    <p>
                    Please click the link below to set up your Super Admin account:
                    </p>

                    <p style="text-align: center;">
                        <a href="${setupLink}" 
                        style="
                            display: inline-block;
                            padding: 12px 20px;
                            background-color: #2d89ef;
                            color: #ffffff;
                            text-decoration: none;
                            border-radius: 5px;
                            font-weight: bold;
                        ">
                        Set Up Super Admin Account
                        </a>
                    </p>

                    <p>
                    This link will expire in 72 hours. Please complete your setup before then.
                    </p>

                    <p>
                    If you did not expect this invitation, please contact our support team.
                    </p>

                    <p>
                    Regards,<br/>
                    <strong>Platform Team</strong>
                    </p>
                </div>
                `
            );

            await session.commitTransaction();
            session.endSession();

            return {
                organization,
                request
            };

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    static async rejectRequest(requestId, adminId, rejectionReason) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const request = await OrganizationRequest.findById(requestId).session(session);

            if (!request) {
                throw new Error("Organization request not found");
            }

            if (request.status !== "PENDING") {
                throw new Error(`Cannot reject request with status: ${request.status}`);
            }

            request.status = "REJECTED";
            request.reviewedBy = adminId;
            request.reviewedAt = new Date();
            request.rejectionReason = rejectionReason;

            await request.save({ session });

            await AuditService.logAction({
                userId: adminId,
                action: "reject_organization",
                entity: "OrganizationRequest",
                entityId: request._id,
                description: `Rejected organization request for ${request.name} (${request.contactEmail}). Reason: ${rejectionReason}`,
                ipAddress: null,
                userAgent: null
            });

            await session.commitTransaction();
            session.endSession();

            await sendEmail(
                request.contactEmail,
                "Organization Request Status - Rejected",
                `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Organization Request Rejected</h2>

                    <p>Hello,</p>

                    <p>
                    We regret to inform you that your organization request for 
                    <strong>${request.name}</strong> has been rejected.
                    </p>

                    <p><strong>Reason for rejection:</strong></p>
                    <p>${rejectionReason}</p>

                    <p>
                    If you believe this is an error or would like to resubmit your application 
                    with corrected information, please contact our support team.
                    </p>

                    <p>
                    Regards,<br/>
                    <strong>Platform Team</strong>
                    </p>
                </div>
                `
            );

            return request;

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    static async getPendingRequestsCount() {
        return await OrganizationRequest.countDocuments({ status: "PENDING" });
    }

    static async getRequestStats() {
        const [pending, approved, rejected] = await Promise.all([
            OrganizationRequest.countDocuments({ status: "PENDING" }),
            OrganizationRequest.countDocuments({ status: "APPROVED" }),
            OrganizationRequest.countDocuments({ status: "REJECTED" })
        ]);

        return { pending, approved, rejected };
    }
}

module.exports = OrganizationRequestService;
