module.exports = function organizationGuard(allowedAdminRoles = []) {
    return (req, res, next) => {
        const membership = req.organizationMembership;

        if (!membership) {
            return res.status(403).json({ message: "No organization membership found" });
        }

        if (membership.asAdmin && allowedAdminRoles.includes(membership.asAdmin.role)) {
            return next();
        }

        if (!allowedAdminRoles.length && membership.asDoctor && membership.asDoctor.status === "ACTIVE") {
            return next();
        }

        return res.status(403).json({ message: "Insufficient organization permissions" });
    };
};

