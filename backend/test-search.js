require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/user");
const Doctor = require("./models/doctor");
const DoctorAvailability = require("./models/doctorAvailability");
const Appointment = require("./models/appointment");
const DoctorOrganization = require("./models/doctorOrganization");
const { bookAppointment, getDoctorAvailability, cancelPatientAppointment } = require("./controllers/appointment.controller");

async function runTest() {
    try {
        console.log("Connecting to MongoDB for test verification...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected!");

        // 1. Find a test patient
        let patient = await User.findOne({ role: "patient" });
        if (!patient) {
            // Create a test patient if none exists
            patient = await User.create({
                name: "Test Patient",
                email: "test.patient@example.com",
                role: "patient",
                isVerified: true
            });
            console.log("Created test patient user.");
        }

        // 2. Find a test doctor (from seed)
        const doctorUser = await User.findOne({ email: "cardiologist.smith@example.com" });
        if (!doctorUser) {
            console.error("Please run the seed script first: node backend/scripts/seedDoctors.js");
            process.exit(1);
        }
        const doctor = await Doctor.findOne({ userId: doctorUser._id });
        if (!doctor) {
            console.error("Doctor profile not found.");
            process.exit(1);
        }

        const dateStr = "2026-06-10";
        const timeSlot = "10:00 AM";

        const normalizeDate = (dStr) => {
            const d = new Date(dStr);
            d.setHours(0, 0, 0, 0);
            return d;
        };

        // Clean up previous test runs if any
        await Appointment.deleteMany({ patientId: patient._id });
        await DoctorAvailability.deleteMany({ doctorId: doctor._id, date: normalizeDate(dateStr) });

        console.log("\n--- TEST CASE 1: Get Initial Availability ---");
        // Mock request object
        let req = {
            params: { doctorId: doctor._id },
            query: { date: dateStr }
        };
        let res = {
            status: (code) => {
                console.log(`Availability Error Status: ${code}`);
                return res;
            },
            json: (payload) => {
                console.log("Availability Result:", payload.success ? "Success" : "Failed");
                const slot = payload.data.slots.find(s => s.time === timeSlot);
                console.log(`Slot ${timeSlot} isBooked:`, slot.isBooked);
                if (slot.isBooked !== false) throw new Error("Initial slot should not be booked");
            }
        };
        await getDoctorAvailability(req, res);

        console.log("\n--- TEST CASE 2: Book Slot ---");
        req = {
            user: { id: patient._id.toString() },
            body: {
                doctorId: doctor._id.toString(),
                date: dateStr,
                time: timeSlot,
                shareRecords: true,
                scope: "FULL_PROFILE"
            }
        };
        let bookedAppointmentId = null;
        res = {
            status: (code) => ({
                json: (payload) => {
                    if (code >= 400) {
                        console.log(`Response Code: ${code}`, payload);
                        throw new Error(`Should not return error status: ${payload.message}`);
                    }
                    console.log(`Response Code: ${code}`, "Success");
                    bookedAppointmentId = payload.data.appointment._id;
                    console.log("Booked Appointment ID:", bookedAppointmentId);
                    console.log("Record Share Access Token generated:", payload.data.shareRecordsToken ? "Yes" : "No");
                }
            }),
            json: (payload) => {
                console.log("Booking Result:", payload.success ? "Success" : "Failed");
                if (!payload.success) throw new Error("Booking failed");
                bookedAppointmentId = payload.data.appointment._id;
                console.log("Booked Appointment ID:", bookedAppointmentId);
                console.log("Record Share Access Token generated:", payload.data.shareRecordsToken ? "Yes" : "No");
            }
        };
        await bookAppointment(req, res);

        // Debug: Log all DoctorAvailabilities in database
        const allAvail = await DoctorAvailability.find({});
        console.log("All Doctor Availabilities in DB:", JSON.stringify(allAvail, null, 2));

        console.log("\n--- TEST CASE 3: Prevent Double Booking ---");
        req = {
            user: { id: patient._id.toString() },
            body: {
                doctorId: doctor._id.toString(),
                date: dateStr,
                time: timeSlot
            }
        };
        let doubleBookingBlocked = false;
        res = {
            status: (code) => {
                console.log(`Double Booking Response Status: ${code} (Expected: 400)`);
                if (code === 400) doubleBookingBlocked = true;
                return {
                    json: (payload) => {
                        console.log("Payload message:", payload.message);
                    }
                };
            },
            json: (payload) => {
                console.log("Booking Result:", payload);
                throw new Error("Double booking should have failed");
            }
        };
        await bookAppointment(req, res);
        if (!doubleBookingBlocked) throw new Error("Double booking was not prevented!");

        console.log("\n--- TEST CASE 4: Cancel Booking and Free Slot ---");
        req = {
            user: { id: patient._id.toString() },
            params: { appointmentId: bookedAppointmentId.toString() }
        };
        res = {
            status: (code) => ({
                json: (payload) => {
                    console.log(`Cancellation Error Status: ${code}`, payload);
                    throw new Error("Cancellation failed");
                }
            }),
            json: (payload) => {
                console.log("Cancellation Result:", payload.success ? "Success" : "Failed");
                if (!payload.success) throw new Error("Cancellation response failed");
            }
        };
        await cancelPatientAppointment(req, res);

        // Verify slot is free again
        console.log("\n--- TEST CASE 5: Verify Slot is Free Again ---");
        req = {
            params: { doctorId: doctor._id },
            query: { date: dateStr }
        };
        res = {
            json: (payload) => {
                const slot = payload.data.slots.find(s => s.time === timeSlot);
                console.log(`Slot ${timeSlot} isBooked after cancellation:`, slot.isBooked);
                if (slot.isBooked !== false) throw new Error("Slot should be free after cancellation");
            }
        };
        await getDoctorAvailability(req, res);

        console.log("\nAll unit tests passed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Test failed:", err);
        process.exit(1);
    }
}

runTest();
