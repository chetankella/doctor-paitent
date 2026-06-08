const Appointment = require("../models/appointment");
const DoctorAvailability = require("../models/doctorAvailability");
const Doctor = require("../models/doctor");
const DoctorOrganization = require("../models/doctorOrganization");
const User = require("../models/user");
const AccessGrantService = require("../services/accessGrant.service");
const AccessGrant = require("../models/accessGrant");
const sendEmail = require("../utils/sendEmail");
require("../models/organization");
const AppointmentMessage = require("../models/appointmentMessage");
const mongoose = require("mongoose");

const DEFAULT_SLOTS = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "12:00 PM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
    "04:00 PM", "04:30 PM"
];

// Normalize date to start of day local
function normalizeDate(dStr) {
    const d = new Date(dStr);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Helper to determine if a specific slot time has already passed
function isSlotInPast(dateObj, timeStr) {
    // 1. Get current date and time components in Asia/Kolkata timezone
    const options = { timeZone: "Asia/Kolkata", hour12: false };
    const formatter = new Intl.DateTimeFormat("en-US", {
        ...options,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric"
    });

    const parts = formatter.formatToParts(new Date());
    const partValues = {};
    parts.forEach(p => partValues[p.type] = p.value);

    const todayDateStr = `${partValues.year}-${String(partValues.month).padStart(2, '0')}-${String(partValues.day).padStart(2, '0')}`;
    const currentHour = parseInt(partValues.hour, 10);
    const currentMinute = parseInt(partValues.minute, 10);

    // 2. Format the query dateObj to YYYY-MM-DD
    const queryYear = dateObj.getFullYear();
    const queryMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
    const queryDay = String(dateObj.getDate()).padStart(2, '0');
    const queryDateStr = `${queryYear}-${queryMonth}-${queryDay}`;

    if (queryDateStr < todayDateStr) {
        return true;
    }
    if (queryDateStr > todayDateStr) {
        return false;
    }

    // If query date is today, parse the slot time and compare
    const match = timeStr.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return false;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();

    if (ampm === "PM" && hours !== 12) {
        hours += 12;
    } else if (ampm === "AM" && hours === 12) {
        hours = 0;
    }

    if (hours < currentHour) {
        return true;
    }
    if (hours === currentHour && minutes <= currentMinute) {
        return true;
    }

    return false;
}

/**
 * GET /api/patients/me/doctors/:doctorId/availability
 * Fetch slots and their booking status for a doctor on a specific date
 */
const getDoctorAvailability = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ success: false, message: "Date is required (YYYY-MM-DD)" });
        }

        const queryDate = normalizeDate(date);

        // Fetch availability from DB
        const availability = await DoctorAvailability.findOne({ doctorId, date: queryDate });

        if (!availability) {
            // Return default slots if none exist in DB
            let responseSlots = DEFAULT_SLOTS.map(time => ({
                time,
                isBooked: false,
                bookedBy: null
            }));

            // Filter out past slots
            responseSlots = responseSlots.filter(slot => !isSlotInPast(queryDate, slot.time));

            return res.json({
                success: true,
                data: {
                    doctorId,
                    date: queryDate,
                    slots: responseSlots
                }
            });
        }

        // Filter out past slots from database availability document without mutating it
        const availabilityObj = availability.toObject();
        availabilityObj.slots = availabilityObj.slots.filter(slot => !isSlotInPast(queryDate, slot.time));

        res.json({
            success: true,
            data: availabilityObj
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/patients/me/appointments
 * Book an appointment and handle slot allocation, verification, and security tokens
 */
const bookAppointment = async (req, res) => {
    try {
        const { doctorId, date, time, shareRecords, scope = "FULL_PROFILE", expiryDays = 7 } = req.body;
        const patientId = req.user.id;

        if (!doctorId || !date || !time) {
            return res.status(400).json({ success: false, message: "doctorId, date, and time are required" });
        }

        const appointmentDate = normalizeDate(date);

        // 0. Verify slot is not in the past
        if (isSlotInPast(appointmentDate, time)) {
            return res.status(400).json({ success: false, message: "Cannot book a consultation in the past." });
        }

        // 1. Verify Doctor exists and is active
        const doctor = await Doctor.findById(doctorId).populate("userId");
        if (!doctor || doctor.status !== "active") {
            return res.status(404).json({ success: false, message: "Doctor not found or inactive" });
        }

        // 2. Verify Doctor organization membership (verification check)
        const doctorOrg = await DoctorOrganization.findOne({ doctorId, status: "ACTIVE" }).populate("organizationId");
        if (!doctorOrg) {
            return res.status(400).json({
                success: false,
                message: "Only organization-verified doctors can receive bookings."
            });
        }
        const organizationId = doctorOrg.organizationId?._id || null;

        // 3. Atomically check and book slot
        let availability = await DoctorAvailability.findOne({ doctorId, date: appointmentDate });

        if (!availability) {
            // Create a new availability doc with all default slots
            const slotsObj = DEFAULT_SLOTS.map(t => ({
                time: t,
                isBooked: t === time,
                bookedBy: t === time ? patientId : null
            }));

            try {
                availability = await DoctorAvailability.create({
                    doctorId,
                    date: appointmentDate,
                    slots: slotsObj
                });
            } catch (err) {
                // Handle duplicate key concurrently
                if (err.code === 11000) {
                    availability = await DoctorAvailability.findOneAndUpdate(
                        {
                            doctorId,
                            date: appointmentDate,
                            slots: {
                                $elemMatch: {
                                    time: time,
                                    isBooked: false
                                }
                            }
                        },
                        {
                            $set: {
                                "slots.$.isBooked": true,
                                "slots.$.bookedBy": patientId
                            }
                        },
                        { new: true }
                    );
                    if (!availability) {
                        return res.status(400).json({ success: false, message: "Time slot already booked." });
                    }
                } else {
                    throw err;
                }
            }
        } else {
            // Update atomically
            const updated = await DoctorAvailability.findOneAndUpdate(
                {
                    doctorId,
                    date: appointmentDate,
                    slots: {
                        $elemMatch: {
                            time: time,
                            isBooked: false
                        }
                    }
                },
                {
                    $set: {
                        "slots.$.isBooked": true,
                        "slots.$.bookedBy": patientId
                    }
                },
                { new: true }
            );

            if (!updated) {
                return res.status(400).json({ success: false, message: "Time slot is already booked." });
            }
        }

        // 4. Generate Access Grant if patient selected shareRecords
        let accessGrantId = null;
        let shareRecordsToken = null;

        if (shareRecords && doctor.userId?.email) {
            try {
                const grantResult = await AccessGrantService.createGrant({
                    patientId,
                    doctorEmail: doctor.userId.email,
                    scope,
                    expiryDays,
                    reason: `Doctor Consultation scheduled on ${date} at ${time}`,
                    source: "APPOINTMENT",
                    organizationId
                });
                accessGrantId = grantResult.grant._id;
                shareRecordsToken = grantResult.accessToken;
            } catch (grantErr) {
                console.error("Error creating access grant for booking:", grantErr.message);
            }
        }

        // 5. Create Appointment
        const appointment = await Appointment.create({
            patientId,
            doctorId,
            organizationId,
            date: appointmentDate,
            time,
            status: "BOOKED",
            accessGrantId,
            shareRecordsToken
        });

        // 6. Send confirmation notifications
        const patientUser = await User.findById(patientId);
        const dateFormatted = appointmentDate.toDateString();

        try {
            await sendEmail(
                patientUser.email,
                "Appointment Booking Confirmed",
                `<h2>Your appointment is confirmed!</h2>
                 <p>Dear ${patientUser.name},</p>
                 <p>Your consultation with <strong>Dr. ${doctor.userId?.name}</strong> at <strong>${doctorOrg.organizationId?.name || "Hospital"}</strong> has been booked successfully.</p>
                 <p><strong>Date:</strong> ${dateFormatted}</p>
                 <p><strong>Time Slot:</strong> ${time}</p>
                 ${shareRecordsToken ? `<p><strong>Secure Medical Data Token:</strong> <code>${shareRecordsToken}</code> (Shared for 7 days)</p>` : ""}
                 <br/><p>HealthGuard Platform</p>`
            );

            await sendEmail(
                doctor.userId.email,
                "New Patient Appointment Scheduled",
                `<h2>New Consultation Scheduled</h2>
                 <p>Dear Dr. ${doctor.userId?.name},</p>
                 <p>Patient <strong>${patientUser.name}</strong> has scheduled a consultation with you.</p>
                 <p><strong>Date:</strong> ${dateFormatted}</p>
                 <p><strong>Time Slot:</strong> ${time}</p>
                 <p><strong>Organization:</strong> ${doctorOrg.organizationId?.name}</p>
                 ${shareRecordsToken ? `<p>The patient has securely shared their medical records with you for this consultation.</p>` : ""}
                 <br/><p>HealthGuard Platform</p>`
            );
        } catch (mailErr) {
            console.error("Failed to send booking emails:", mailErr.message);
        }

        res.status(201).json({
            success: true,
            data: {
                appointment,
                shareRecordsToken
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/patients/me/appointments
 * List appointments for the logged-in patient
 */
const listPatientAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({ patientId: req.user.id })
            .populate({
                path: "doctorId",
                populate: { path: "userId", select: "name email" }
            })
            .populate("organizationId", "name city contactPhone")
            .populate("accessGrantId")
            .sort({ date: -1, time: -1 });

        res.json({ success: true, data: appointments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PATCH /api/patients/me/appointments/:appointmentId/cancel
 * Cancel a booked appointment and free availability
 */
const cancelPatientAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const patientId = req.user.id;

        const appointment = await Appointment.findOne({ _id: appointmentId, patientId })
            .populate({
                path: "doctorId",
                populate: { path: "userId", select: "name email" }
            });

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        if (appointment.status === "CANCELLED") {
            return res.status(400).json({ success: false, message: "Appointment is already cancelled" });
        }

        appointment.status = "CANCELLED";
        await appointment.save();

        // Free the slot in availability
        await DoctorAvailability.findOneAndUpdate(
            {
                doctorId: appointment.doctorId._id,
                date: appointment.date,
                "slots.time": appointment.time
            },
            {
                $set: {
                    "slots.$.isBooked": false,
                    "slots.$.bookedBy": null
                }
            }
        );

        // Revoke access grant if created
        if (appointment.accessGrantId) {
            try {
                const grant = await AccessGrant.findById(appointment.accessGrantId);
                if (grant && grant.status === "ACTIVE") {
                    grant.status = "REVOKED";
                    grant.revokedAt = new Date();
                    grant.revokedBy = patientId;
                    await grant.save();
                }
            } catch (grantErr) {
                console.error("Failed to revoke grant during cancellation:", grantErr.message);
            }
        }

        // Notify doctor & patient
        const patientUser = await User.findById(patientId);
        try {
            await sendEmail(
                patientUser.email,
                "Appointment Cancelled",
                `<h2>Your appointment cancellation is confirmed</h2>
                 <p>Dear ${patientUser.name},</p>
                 <p>Your consultation with <strong>Dr. ${appointment.doctorId.userId?.name}</strong> on ${new Date(appointment.date).toDateString()} at ${appointment.time} has been successfully cancelled.</p>`
            );

            await sendEmail(
                appointment.doctorId.userId.email,
                "Patient Consultation Cancelled",
                `<h2>Consultation Cancelled</h2>
                 <p>Dear Dr. ${appointment.doctorId.userId?.name},</p>
                 <p>The consultation with patient <strong>${patientUser.name}</strong> on ${new Date(appointment.date).toDateString()} at ${appointment.time} has been cancelled by the patient.</p>`
            );
        } catch (mailErr) {
            console.error("Failed to send cancellation emails:", mailErr.message);
        }

        res.json({ success: true, message: "Appointment cancelled successfully", data: appointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/doctors/me/appointments
 * List appointments for the logged-in doctor
 */
const listDoctorAppointments = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user.id });
        if (!doctor) {
            return res.status(404).json({ success: false, message: "Doctor profile not found" });
        }

        const appointments = await Appointment.find({ doctorId: doctor._id })
            .populate("patientId", "name email")
            .populate("organizationId", "name city")
            .populate("accessGrantId")
            .sort({ date: 1, time: 1 });

        res.json({ success: true, data: appointments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PATCH /api/doctors/me/appointments/:appointmentId/status
 * Update status of an appointment by the doctor (COMPLETED or CANCELLED)
 * Supports multipart file upload for completed status (optional prescription)
 */
const updateAppointmentStatus = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { status } = req.body; // COMPLETED or CANCELLED

        if (!["COMPLETED", "CANCELLED"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const doctor = await Doctor.findOne({ userId: req.user.id });
        if (!doctor) {
            return res.status(404).json({ success: false, message: "Doctor profile not found" });
        }

        const appointment = await Appointment.findOne({ _id: appointmentId, doctorId: doctor._id })
            .populate("patientId", "name email");

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        appointment.status = status;

        // Save prescription if provided when completed
        if (status === "COMPLETED" && req.file) {
            appointment.prescriptionUrl = req.file.path;
            appointment.prescriptionName = req.file.originalname;
        }

        await appointment.save();

        if (status === "COMPLETED") {
            // Automatically post system message with prescription if uploaded
            await AppointmentMessage.create({
                appointmentId: appointment._id,
                senderId: req.user.id,
                senderRole: "doctor",
                content: req.file 
                    ? "Consultation completed. Prescription uploaded."
                    : "Consultation completed.",
                fileUrl: req.file ? req.file.path : null,
                fileName: req.file ? req.file.originalname : null,
                fileType: req.file ? req.file.mimetype : null
            });
        }

        if (status === "CANCELLED") {
            // Free slot
            await DoctorAvailability.findOneAndUpdate(
                {
                    doctorId: appointment.doctorId,
                    date: appointment.date,
                    "slots.time": appointment.time
                },
                {
                    $set: {
                        "slots.$.isBooked": false,
                        "slots.$.bookedBy": null
                    }
                }
            );

            // Notify patient
            try {
                await sendEmail(
                    appointment.patientId.email,
                    "Appointment Consultation Cancelled",
                    `<p>Your appointment with Dr. ${doctor.userId?.name || "Doctor"} on ${new Date(appointment.date).toDateString()} at ${appointment.time} has been cancelled by the doctor.</p>`
                );
            } catch (mailErr) {
                console.error("Failed to send email:", mailErr.message);
            }
        }

        res.json({ success: true, message: `Appointment marked as ${status}`, data: appointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/patients/me/appointments/:appointmentId/prescription
 * Let patients upload a prescription for a completed appointment if skipped by the doctor
 */
const uploadPatientPrescription = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const patientId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No prescription file uploaded" });
        }

        const appointment = await Appointment.findOne({ _id: appointmentId, patientId })
            .populate({
                path: "doctorId",
                populate: { path: "userId", select: "name" }
            });

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        if (appointment.status !== "COMPLETED") {
            return res.status(400).json({ success: false, message: "Prescription can only be uploaded for completed consultations." });
        }

        if (appointment.prescriptionUrl) {
            return res.status(400).json({ success: false, message: "A prescription has already been uploaded for this appointment." });
        }

        appointment.prescriptionUrl = req.file.path;
        appointment.prescriptionName = req.file.originalname;
        await appointment.save();

        // Automatically post system message in chat
        const systemMessage = await AppointmentMessage.create({
            appointmentId: appointment._id,
            senderId: patientId,
            senderRole: "patient",
            content: "Patient uploaded prescription copy.",
            fileUrl: req.file.path,
            fileName: req.file.originalname,
            fileType: req.file.mimetype
        });

        const populatedSystemMessage = await AppointmentMessage.findById(systemMessage._id)
            .populate("senderId", "name email");

        // Broadcast real-time message via socket.io
        if (req.io) {
            req.io.to(appointment._id.toString()).emit("receive_message", populatedSystemMessage);
        }

        res.json({ success: true, message: "Prescription uploaded successfully", data: appointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Helper to verify user access to an appointment
 */
const verifyAppointmentAccess = async (appointmentId, userId, userRole) => {
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) return null;

    const query = { _id: appointmentId };
    if (userRole === "patient") {
        query.patientId = userId;
    } else if (userRole === "doctor") {
        const doctor = await Doctor.findOne({ userId });
        if (!doctor) return null;
        query.doctorId = doctor._id;
    } else {
        return null;
    }

    return await Appointment.findOne(query);
};

/**
 * GET /me/appointments/:appointmentId/messages
 * List messages in the appointment chat thread
 */
const listMessages = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role; // "patient" or "doctor"

        const appointment = await verifyAppointmentAccess(appointmentId, userId, userRole);
        if (!appointment) {
            return res.status(403).json({ success: false, message: "Access denied or appointment not found" });
        }

        const messages = await AppointmentMessage.find({ appointmentId })
            .sort({ createdAt: 1 })
            .populate("senderId", "name email");

        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /me/appointments/:appointmentId/messages
 * Send a message and/or upload an attachment (prescription/report)
 */
const addMessage = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role; // "patient" or "doctor"

        const appointment = await verifyAppointmentAccess(appointmentId, userId, userRole);
        if (!appointment) {
            return res.status(403).json({ success: false, message: "Access denied or appointment not found" });
        }

        if (!content && !req.file) {
            return res.status(400).json({ success: false, message: "Message content or file attachment is required" });
        }

        const messageData = {
            appointmentId: appointment._id,
            senderId: userId,
            senderRole: userRole,
            content: content || ""
        };

        if (req.file) {
            messageData.fileUrl = req.file.path;
            messageData.fileName = req.file.originalname;
            messageData.fileType = req.file.mimetype;
        }

        const message = await AppointmentMessage.create(messageData);
        const populatedMessage = await AppointmentMessage.findById(message._id)
            .populate("senderId", "name email");

        // Broadcast real-time message via socket.io
        if (req.io) {
            req.io.to(appointment._id.toString()).emit("receive_message", populatedMessage);
        }

        res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        console.error("addMessage error:", error);
        res.status(500).json({ success: false, message: typeof error === 'object' ? JSON.stringify(error) : error.message });
    }
};

/**
 * GET /api/doctors/me/availability
 * Fetch availability for the logged-in doctor on a specific date.
 * Falls back to recurring weekly schedule if no custom override exists for that date.
 */
const getMyAvailability = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user.id });
        if (!doctor) {
            return res.status(404).json({ success: false, message: "Doctor profile not found" });
        }

        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, message: "Date is required (YYYY-MM-DD)" });
        }

        const queryDate = normalizeDate(date);
        const availability = await DoctorAvailability.findOne({ doctorId: doctor._id, date: queryDate });

        if (availability) {
            return res.json({ success: true, data: availability, source: "custom" });
        }

        // Fallback: check recurring weekly schedule
        const DoctorWeeklySchedule = require("../models/doctorWeeklySchedule");
        const weeklySchedule = await DoctorWeeklySchedule.findOne({ doctorId: doctor._id });

        if (weeklySchedule) {
            const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
            const dayName = dayNames[queryDate.getDay()];
            const daySlots = weeklySchedule[dayName] || [];

            if (daySlots.length > 0) {
                const slots = daySlots
                    .filter(s => s.isAvailable)
                    .map(s => ({ time: s.time, isBooked: false, bookedBy: null }));

                return res.json({
                    success: true,
                    data: {
                        doctorId: doctor._id,
                        date: queryDate,
                        slots
                    },
                    source: "recurring"
                });
            }
        }

        // Ultimate fallback: default slots
        return res.json({
            success: true,
            data: {
                doctorId: doctor._id,
                date: queryDate,
                slots: DEFAULT_SLOTS.map(time => ({ time, isBooked: false, bookedBy: null }))
            },
            source: "default"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /api/doctors/me/availability
 * Update availability slots for the logged-in doctor on a specific date
 */
const updateMyAvailability = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user.id });
        if (!doctor) {
            return res.status(404).json({ success: false, message: "Doctor profile not found" });
        }

        const { date, slots } = req.body;
        if (!date || !slots || !Array.isArray(slots)) {
            return res.status(400).json({ success: false, message: "Date and an array of slots are required" });
        }

        const queryDate = normalizeDate(date);
        
        // Fetch existing to ensure we don't accidentally drop booked slots if the client sends them as unbooked
        let existingAvailability = await DoctorAvailability.findOne({ doctorId: doctor._id, date: queryDate });
        
        // Merge strategy: Keep existing booked slots, update unbooked slots
        let finalSlots = [...slots];
        
        if (existingAvailability) {
            const existingBooked = existingAvailability.slots.filter(s => s.isBooked);
            
            finalSlots = finalSlots.map(newSlot => {
                const existing = existingBooked.find(eb => eb.time === newSlot.time);
                if (existing) {
                    return existing; // Retain booking details
                }
                return {
                    time: newSlot.time,
                    isBooked: false,
                    bookedBy: null
                };
            });
            
            // Re-add any booked slots that the doctor might have accidentally removed from their schedule
            existingBooked.forEach(eb => {
                if (!finalSlots.find(fs => fs.time === eb.time)) {
                    finalSlots.push(eb);
                }
            });
            
            // Sort slots chronologically just in case
            finalSlots.sort((a, b) => {
                const timeA = new Date(`1970/01/01 ${a.time}`);
                const timeB = new Date(`1970/01/01 ${b.time}`);
                return timeA - timeB;
            });
        }

        const availability = await DoctorAvailability.findOneAndUpdate(
            { doctorId: doctor._id, date: queryDate },
            { $set: { slots: finalSlots } },
            { new: true, upsert: true }
        );

        res.json({ success: true, message: "Availability updated successfully", data: availability });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/doctors/me/weekly-schedule
 * Fetch the recurring weekly schedule template for the logged-in doctor
 */
const getWeeklySchedule = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user.id });
        if (!doctor) {
            return res.status(404).json({ success: false, message: "Doctor profile not found" });
        }

        const DoctorWeeklySchedule = require("../models/doctorWeeklySchedule");
        let schedule = await DoctorWeeklySchedule.findOne({ doctorId: doctor._id });

        if (!schedule) {
            // Return empty default
            const defaultDay = DEFAULT_SLOTS.map(time => ({ time, isAvailable: true }));
            schedule = {
                doctorId: doctor._id,
                sunday: [],
                monday: defaultDay,
                tuesday: defaultDay,
                wednesday: defaultDay,
                thursday: defaultDay,
                friday: defaultDay,
                saturday: []
            };
        }

        res.json({ success: true, data: schedule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /api/doctors/me/weekly-schedule
 * Update the recurring weekly schedule template for the logged-in doctor
 */
const updateWeeklySchedule = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user.id });
        if (!doctor) {
            return res.status(404).json({ success: false, message: "Doctor profile not found" });
        }

        const { schedule } = req.body;
        if (!schedule || typeof schedule !== "object") {
            return res.status(400).json({ success: false, message: "Schedule object is required" });
        }

        const DoctorWeeklySchedule = require("../models/doctorWeeklySchedule");
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        
        const updateData = {};
        dayNames.forEach(day => {
            if (Array.isArray(schedule[day])) {
                updateData[day] = schedule[day];
            }
        });

        const updatedSchedule = await DoctorWeeklySchedule.findOneAndUpdate(
            { doctorId: doctor._id },
            { $set: updateData },
            { new: true, upsert: true }
        );

        res.json({ success: true, message: "Weekly schedule saved successfully", data: updatedSchedule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getDoctorAvailability,
    bookAppointment,
    listPatientAppointments,
    cancelPatientAppointment,
    listDoctorAppointments,
    updateAppointmentStatus,
    uploadPatientPrescription,
    listMessages,
    addMessage,
    getMyAvailability,
    updateMyAvailability,
    getWeeklySchedule,
    updateWeeklySchedule
};

