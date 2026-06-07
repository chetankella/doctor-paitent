const cron = require("node-cron");
const PatientAccess = require("../models/patientAccess");

cron.schedule("*/5 * * * *", async () => {
    const now = new Date();

    await PatientAccess.updateMany(
        {
            status: "ACTIVE",
            expiresAt: { $lte: now }
        },
        { status: "EXPIRED" }
    );

    console.log("Expired old patient access entries");
});