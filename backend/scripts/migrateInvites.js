/**
 * scripts/migrateInvites.js
 *
 * Phase 7 — One-time backfill script.
 * Copies existing PENDING records from legacy models into the new unified Invite collection.
 *
 * Usage:
 *   node scripts/migrateInvites.js
 *
 * Safe to run multiple times — skips records that already exist in Invite
 * by matching on tokenHash / token.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const DoctorInvite = require("../models/doctorInvite");
const DepartmentAdminInvite = require("../models/departmentAdminInvite");
const Invite = require("../models/invite");

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    // ── Migrate PENDING DoctorInvites (DOCTOR + STAFF) ───────────────────────
    const doctorInvites = await DoctorInvite.find({
        status: "PENDING",
        expiresAt: { $gt: new Date() }
    });

    console.log(`\nFound ${doctorInvites.length} pending DoctorInvite records`);

    for (const di of doctorInvites) {
        try {
            // The legacy model stores the HASH in `token` field — we reuse it as tokenHash
            const existing = await Invite.findOne({ tokenHash: di.token });
            if (existing) {
                skipped++;
                continue;
            }

            await Invite.create({
                email: di.email,
                type: di.type, // "DOCTOR" or "STAFF"
                role: di.role || null,
                organizationId: di.organizationId,
                departmentId: di.departmentId || null,
                tokenHash: di.token, // already SHA-256 hashed
                expiresAt: di.expiresAt,
                status: "PENDING",
                invitedBy: di.invitedBy,
                acceptedAt: null,
                userId: null
            });
            migrated++;
        } catch (err) {
            console.error(`  [DoctorInvite ${di._id}] Error: ${err.message}`);
            errors++;
        }
    }

    console.log(`  Migrated: ${migrated}, Skipped (already exists): ${skipped}, Errors: ${errors}`);

    // Reset counters for department admin pass
    migrated = 0; skipped = 0; errors = 0;

    // ── Migrate PENDING DepartmentAdminInvites ────────────────────────────────
    const deptInvites = await DepartmentAdminInvite.find({
        status: "PENDING",
        expiresAt: { $gt: new Date() }
    });

    console.log(`\nFound ${deptInvites.length} pending DepartmentAdminInvite records`);

    for (const da of deptInvites) {
        try {
            const existing = await Invite.findOne({ tokenHash: da.token });
            if (existing) {
                skipped++;
                continue;
            }

            await Invite.create({
                email: da.email,
                type: "DEPARTMENT_ADMIN",
                role: null,
                organizationId: da.organizationId,
                departmentId: da.departmentId,
                tokenHash: da.token, // already SHA-256 hashed
                expiresAt: da.expiresAt,
                status: "PENDING",
                invitedBy: da.invitedBy,
                acceptedAt: null,
                userId: null
            });
            migrated++;
        } catch (err) {
            console.error(`  [DepartmentAdminInvite ${da._id}] Error: ${err.message}`);
            errors++;
        }
    }

    console.log(`  Migrated: ${migrated}, Skipped (already exists): ${skipped}, Errors: ${errors}`);

    console.log("\n✅ Migration complete.");
    await mongoose.disconnect();
}

run().catch((err) => {
    console.error("Fatal error:", err.message);
    process.exit(1);
});
