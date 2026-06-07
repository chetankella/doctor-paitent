const PatientAccess = require("../models/patientAccess");


async function createAccess({
    patientId,
    doctorId,
    organizationId = null,
    accessType,
    referenceId = null,
    scope,
    expiresAt,
    createdBy
}) {
    // Expire existing active access
    await PatientAccess.updateMany(
        {
            patientId,
            doctorId,
            status: "ACTIVE"
        },
        { status: "EXPIRED" }
    );

    const access = await PatientAccess.create({
        patientId,
        doctorId,
        organizationId,
        accessType,
        referenceId,
        scope,
        expiresAt,
        createdBy
    });

    return access;
}

module.exports = {
    createAccess
};