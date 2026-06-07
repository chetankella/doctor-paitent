const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const { logAction } = require("../services/audit.service");

const login = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ message: "Request body is missing. Please ensure you are sending JSON with Content-Type: application/json." });
        }
        const {email, password} = req.body;
        const user = await User.findOne({email});

        if(!user || !user.password) {
            return res.status(400).json({ message: "Invalid Credentials"})
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        await logAction({
            userId: user._id,
            action: "login",
            entity: "User",
            entityId: user._id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        let organizations = [];

        if (user.role === "doctor") {
            const Doctor = require("../models/doctor");
            const DoctorOrganization = require("../models/doctorOrganization");

            const doctor = await Doctor.findOne({ userId: user._id });
            if (doctor) {
                const memberships = await DoctorOrganization.find({
                    doctorId: doctor._id,
                    status: "ACTIVE"
                }).populate("organizationId", "name type");

                organizations = organizations.concat(
                    memberships
                        .filter((m) => m.organizationId)
                        .map((m) => ({
                            id: m.organizationId._id,
                            name: m.organizationId.name,
                            type: m.organizationId.type,
                            role: m.role,
                            departmentId: m.departmentId || null
                        }))
                );
            }

            // Also fetch organizations from accepted invites (for doctors who just set password but haven't completed profile)
            const DoctorInvite = require("../models/doctorInvite");
            const invites = await DoctorInvite.find({
                email: user.email,
                status: { $in: ["PENDING", "ACCEPTED"] }
            }).populate("organizationId", "name type");

            const existingOrgIds = organizations.map(org => org.id.toString());

            organizations = organizations.concat(
                 invites
                    .filter((i) => i.organizationId && !existingOrgIds.includes(i.organizationId._id.toString()))
                    .map((i) => ({
                        id: i.organizationId._id,
                        name: i.organizationId.name,
                        type: i.organizationId.type,
                        role: i.role,
                        departmentId: i.departmentId || null,
                        status: i.status
                    }))
            );
        }

        const OrganizationAdmin = require("../models/organizationAdmin");
        const adminMemberships = await OrganizationAdmin.find({
            userId: user._id,
            status: "ACTIVE"
        }).populate("organizationId", "name type");

        organizations = organizations.concat(
            adminMemberships
                .filter((a) => a.organizationId)
                .map((a) => ({
                    id: a.organizationId._id,
                    name: a.organizationId.name,
                    type: a.organizationId.type,
                    adminRole: a.role
                }))
        );

        res.json({
            message: "Login successful",
            token,
            organizations
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }    
}

module.exports = {
    login
}
