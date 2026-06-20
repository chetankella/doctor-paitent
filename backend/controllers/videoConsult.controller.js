const Doctor = require("../models/doctor");
const Appointment = require("../models/appointment");
const User = require("../models/user");
const DoctorOrganization = require("../models/doctorOrganization");
const { v4: uuidv4 } = require("crypto");

// ─── UUID helper (uses crypto, no extra dependency) ───
function generateRoomId() {
    const bytes = require("crypto").randomBytes(16);
    return bytes.toString("hex");
}

/**
 * PATCH /api/doctors/me/video-availability
 * Toggle instant video consultation availability on/off.
 */
const toggleVideoAvailability = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user.id });
        if (!doctor) {
            return res.status(404).json({ success: false, message: "Doctor profile not found" });
        }

        const { isAvailable, videoConsultFee } = req.body;

        if (typeof isAvailable !== "boolean") {
            return res.status(400).json({ success: false, message: "isAvailable (boolean) is required" });
        }

        doctor.isAvailableForVideoConsult = isAvailable;

        if (videoConsultFee !== undefined && videoConsultFee !== null) {
            doctor.videoConsultFee = Number(videoConsultFee);
        }

        await doctor.save();

        // Broadcast real-time availability change to all patients watching
        if (req.io) {
            req.io.emit("doctor:video_availability_changed", {
                doctorId: doctor._id,
                isAvailable: doctor.isAvailableForVideoConsult
            });
        }

        res.json({
            success: true,
            message: `Video consultation availability set to ${isAvailable}`,
            data: {
                isAvailableForVideoConsult: doctor.isAvailableForVideoConsult,
                videoConsultFee: doctor.videoConsultFee ?? doctor.consultationFee
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/patients/me/instant-doctors
 * List doctors currently flagged as available for instant video consult.
 */
const getInstantDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find({ isAvailableForVideoConsult: true, status: "active" })
            .populate("userId", "name email")
            .lean();

        // Enrich with organisation info
        const enriched = await Promise.all(doctors.map(async (doc) => {
            const doctorOrg = await DoctorOrganization.findOne({ doctorId: doc._id, status: "ACTIVE" })
                .populate("organizationId", "name city");
            return {
                id: doc._id,
                name: doc.userId?.name,
                email: doc.userId?.email,
                specialization: doc.specialization,
                experience: doc.experience,
                rating: doc.rating,
                ratingCount: doc.ratingCount,
                consultationFee: doc.consultationFee,
                videoConsultFee: doc.videoConsultFee ?? doc.consultationFee,
                bio: doc.bio,
                qualifications: doc.qualifications,
                symptoms: doc.symptoms,
                profileImage: doc.profileImage,
                isAvailableForVideoConsult: true,
                organizations: doctorOrg
                    ? [{ name: doctorOrg.organizationId?.name, city: doctorOrg.organizationId?.city }]
                    : []
            };
        }));

        res.json({ success: true, data: enriched });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/patients/me/instant-consult
 * Book an instant video consultation.
 * Body: { doctorId }
 */
const bookInstantConsult = async (req, res) => {
    try {
        const { doctorId } = req.body;
        const patientId = req.user.id;

        if (!doctorId) {
            return res.status(400).json({ success: false, message: "doctorId is required" });
        }

        const doctor = await Doctor.findById(doctorId).populate("userId");
        if (!doctor || doctor.status !== "active") {
            return res.status(404).json({ success: false, message: "Doctor not found or inactive" });
        }

        if (!doctor.isAvailableForVideoConsult) {
            return res.status(400).json({
                success: false,
                message: "This doctor is not currently available for instant video consultation."
            });
        }

        // Check for an existing active/pending video appointment between the same pair
        const existing = await Appointment.findOne({
            patientId,
            doctorId: doctor._id,
            type: "INSTANT_VIDEO",
            videoStatus: { $in: ["PENDING", "ACTIVE"] }
        });
        if (existing) {
            return res.json({
                success: true,
                data: { appointment: existing },
                message: "Existing instant consult session found"
            });
        }

        const doctorOrg = await DoctorOrganization.findOne({ doctorId: doctor._id, status: "ACTIVE" })
            .populate("organizationId");
        const organizationId = doctorOrg?.organizationId?._id ?? null;

        const videoRoomId = generateRoomId();
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const appointment = await Appointment.create({
            patientId,
            doctorId: doctor._id,
            organizationId,
            date: now,
            time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            status: "BOOKED",
            type: "INSTANT_VIDEO",
            videoRoomId,
            videoStatus: "PENDING"
        });

        // Notify doctor via socket that a patient is waiting
        if (req.io) {
            req.io.emit(`doctor:${doctor._id}:instant_request`, {
                appointmentId: appointment._id,
                videoRoomId,
                patientId,
                patientName: (await User.findById(patientId))?.name ?? "Patient"
            });
        }

        res.status(201).json({ success: true, data: { appointment } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/patients/me/appointments/:appointmentId/video-token
 * GET /api/doctors/me/appointments/:appointmentId/video-token
 * Return the videoRoomId for the given appointment (verified by ownership).
 */
const getVideoToken = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const userId = req.user.id;
        const role = req.user.role;

        const query = { _id: appointmentId };

        if (role === "patient") {
            query.patientId = userId;
        } else if (role === "doctor") {
            const doctor = await Doctor.findOne({ userId });
            if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
            query.doctorId = doctor._id;
        } else {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        const appointment = await Appointment.findOne(query);
        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        if (!appointment.videoRoomId) {
            return res.status(400).json({ success: false, message: "This appointment does not have a video room" });
        }

        // Mark as ACTIVE when someone joins
        if (appointment.videoStatus === "PENDING") {
            appointment.videoStatus = "ACTIVE";
            await appointment.save();
        }

        res.json({
            success: true,
            data: {
                videoRoomId: appointment.videoRoomId,
                appointmentId: appointment._id,
                videoStatus: appointment.videoStatus,
                type: appointment.type
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PATCH /api/doctors/me/appointments/:appointmentId/video-end
 * Doctor ends the call → marks videoStatus=ENDED, appointment=COMPLETED.
 */
const endVideoCall = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const doctor = await Doctor.findOne({ userId: req.user.id });
        if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found" });

        const appointment = await Appointment.findOne({ _id: appointmentId, doctorId: doctor._id });
        if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

        appointment.videoStatus = "ENDED";
        appointment.status = "COMPLETED";
        await appointment.save();

        // Notify the patient via socket
        if (req.io && appointment.videoRoomId) {
            req.io.to(`video:${appointment.videoRoomId}`).emit("video:call_ended", {
                appointmentId: appointment._id,
                endedBy: "doctor"
            });
        }

        res.json({ success: true, message: "Video call ended and appointment completed", data: appointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/doctors/me/instant-requests
 * Doctor polls this to see pending instant video requests for them.
 */
const getInstantRequests = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user.id });
        if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found" });

        const requests = await Appointment.find({
            doctorId: doctor._id,
            type: "INSTANT_VIDEO",
            videoStatus: { $in: ["PENDING", "ACTIVE"] }
        })
            .populate("patientId", "name email")
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    toggleVideoAvailability,
    getInstantDoctors,
    bookInstantConsult,
    getVideoToken,
    endVideoCall,
    getInstantRequests
};
