const mongoose = require("mongoose");
const DoctorOrganization = require("../models/doctorOrganization");
const OrganizationAdmin = require("../models/organizationAdmin");
const Staff = require("../models/staff"); // Bug 3 fix: also check staff membership

module.exports = async function tenantContext(req, res, next) {
    try {
        const organizationId = req.headers["x-organization-id"];

        if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({ message: "Invalid or missing x-organization-id" });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        req.organizationId = organizationId;

        // Check membership as doctor, org admin, OR staff
        const [doctorMembership, adminMembership, staffMembership] = await Promise.all([
            DoctorOrganization.findOne({ organizationId, status: "ACTIVE" })
                .populate({
                    path: "doctorId",
                    match: { userId: req.user.id },
                    select: "_id userId"
                }),
            OrganizationAdmin.findOne({
                organizationId,
                userId: req.user.id,
                status: "ACTIVE"
            }),
            // Bug 3 fix: staff membership check
            Staff.findOne({
                organizationId,
                status: "active"
            }).populate({
                path: "userId",
                match: { _id: mongoose.Types.ObjectId.createFromHexString(req.user.id) },
                select: "_id"
            })
        ]);

        const hasDoctorMembership =
            doctorMembership &&
            doctorMembership.doctorId &&
            doctorMembership.doctorId.userId &&
            doctorMembership.doctorId.userId.toString() === req.user.id.toString();

        const hasStaffMembership =
            staffMembership &&
            staffMembership.userId &&
            staffMembership.userId._id &&
            staffMembership.userId._id.toString() === req.user.id.toString();

        if (!hasDoctorMembership && !adminMembership && !hasStaffMembership) {
            return res.status(403).json({
                message: "You are not a member of this organization"
            });
        }

        req.organizationMembership = {
            asDoctor: hasDoctorMembership ? doctorMembership : null,
            asAdmin: adminMembership || null,
            asStaff: hasStaffMembership ? staffMembership : null
        };

        next();
    } catch (error) {
        console.error("Tenant context error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
