require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Models
const User = require("./models/user");
const PatientProfile = require("./models/patientProfile");
const Doctor = require("./models/doctor");
const Appointment = require("./models/appointment");
const AppointmentMessage = require("./models/appointmentMessage");
const DoctorOrganization = require("./models/doctorOrganization");
const Organization = require("./models/organization");

// Controllers
const {
    bookAppointment,
    updateAppointmentStatus,
    uploadPatientPrescription,
    listMessages,
    addMessage
} = require("./controllers/appointment.controller");

// Helper to mock express res object
function mockResponse() {
    const res = {};
    res.statusCode = 200;
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (payload) => {
        res.body = payload;
        return res;
    };
    return res;
}

async function runTests() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/health");
        console.log("Connected!");

        console.log("Clearing old collections...");
        await Promise.all([
            User.deleteMany({}),
            PatientProfile.deleteMany({}),
            Doctor.deleteMany({}),
            Appointment.deleteMany({}),
            AppointmentMessage.deleteMany({}),
            DoctorOrganization.deleteMany({}),
            Organization.deleteMany({})
        ]);

        // ==========================================
        // Seed Test Data
        // ==========================================
        console.log("Seeding base test data...");
        const testOrg = await Organization.create({
            name: "Metro Health Clinic",
            type: "HOSPITAL",
            contactPhone: "1234567890",
            contactEmail: "metro@example.com",
            addressLine1: "100 Medical Plaza",
            city: "Mumbai",
            state: "Maharashtra",
            pincode: "400001",
            status: "ACTIVE",
            verificationStatus: "VERIFIED"
        });

        const hashedPassword = await bcrypt.hash("Password123!", 10);

        // 1. Patient User
        const patientUser = await User.create({
            name: "John Patient",
            email: "john.patient@example.com",
            password: hashedPassword,
            role: "patient",
            isVerified: true,
            onboardingCompleted: true
        });
        await PatientProfile.create({
            userId: patientUser._id,
            dateOfBirth: new Date("1990-01-01"),
            gender: "male",
            bloodGroup: "O+"
        });

        // 2. Doctor User
        const doctorUser = await User.create({
            name: "Dr. Jane Specialist",
            email: "jane.doctor@example.com",
            password: hashedPassword,
            role: "doctor",
            isVerified: true,
            onboardingCompleted: true
        });
        const doctorProfile = await Doctor.create({
            userId: doctorUser._id,
            specialization: "General Physician",
            experience: 8,
            consultationFee: 600,
            hospitalName: testOrg.name,
            licenseHash: "license_123_hash",
            licenseEncrypted: "license_123_encrypted",
            status: "active"
        });
        await DoctorOrganization.create({
            doctorId: doctorProfile._id,
            organizationId: testOrg._id,
            role: "CONSULTANT",
            status: "ACTIVE"
        });

        // 3. Unauthorized User (Another Patient)
        const strangerUser = await User.create({
            name: "Stranger Patient",
            email: "stranger@example.com",
            password: hashedPassword,
            role: "patient",
            isVerified: true,
            onboardingCompleted: true
        });
        await PatientProfile.create({
            userId: strangerUser._id,
            dateOfBirth: new Date("1995-10-10"),
            gender: "female",
            bloodGroup: "A-"
        });

        console.log("Seeding complete! Starting tests...");

        const results = [];
        function logTestResult(name, passed, message) {
            results.push({ name, passed, message });
            console.log(`[${passed ? "PASS" : "FAIL"}] ${name} - ${message}`);
        }

        // ==========================================
        // Helper to book appointment
        // ==========================================
        async function bookTestAppointment(date, time) {
            const req = {
                user: { id: patientUser._id.toString() },
                body: {
                    doctorId: doctorProfile._id.toString(),
                    date,
                    time,
                    shareRecords: false
                }
            };
            const res = mockResponse();
            await bookAppointment(req, res);
            if (res.statusCode !== 201) {
                throw new Error(`Booking failed: ${res.body?.message}`);
            }
            return res.body.data.appointment._id.toString();
        }

        // Book our main appointment
        const appointmentId1 = await bookTestAppointment("2026-06-15", "10:00 AM");
        console.log(`Booked first appointment: ${appointmentId1}`);

        // ==========================================
        // Test 1: Complete Appointment (Doctor Uploads Prescription)
        // ==========================================
        console.log("\nRunning Test 1: Doctor Completes Appointment and Uploads Prescription...");
        try {
            const req = {
                user: { id: doctorUser._id.toString() },
                params: { appointmentId: appointmentId1 },
                body: { status: "COMPLETED" },
                file: {
                    path: "uploads/prescriptions/mock_prescription.pdf",
                    originalname: "mock_prescription.pdf",
                    mimetype: "application/pdf"
                }
            };
            const res = mockResponse();
            await updateAppointmentStatus(req, res);

            const isCompleted = res.statusCode === 200 && res.body.success && res.body.data.status === "COMPLETED";
            const prescriptionSaved = res.body.data.prescriptionUrl === "uploads/prescriptions/mock_prescription.pdf" &&
                                      res.body.data.prescriptionName === "mock_prescription.pdf";

            // Verify a system message was generated
            const systemMsg = await AppointmentMessage.findOne({ appointmentId: appointmentId1 });
            const messageCreated = systemMsg && systemMsg.senderRole === "doctor" &&
                                  systemMsg.fileUrl === "uploads/prescriptions/mock_prescription.pdf" &&
                                  systemMsg.content.toLowerCase().includes("consultation completed");

            logTestResult(
                "Doctor Completes Appointment with Prescription",
                isCompleted && prescriptionSaved && !!messageCreated,
                `Status: ${res.statusCode}. Prescription URL: ${res.body.data?.prescriptionUrl}. System message created: ${!!messageCreated}`
            );
        } catch (err) {
            logTestResult("Doctor Completes Appointment with Prescription", false, err.message);
        }

        // ==========================================
        // Test 2: Access Control on Chat Messages
        // ==========================================
        console.log("\nRunning Test 2: Access Control Verification...");
        try {
            // Patient retrieves messages
            const patientReq = {
                user: { id: patientUser._id.toString(), role: "patient" },
                params: { appointmentId: appointmentId1 }
            };
            const patientRes = mockResponse();
            await listMessages(patientReq, patientRes);
            const patientOk = patientRes.statusCode === 200 && patientRes.body.success && patientRes.body.data.length > 0;

            // Doctor retrieves messages
            const doctorReq = {
                user: { id: doctorUser._id.toString(), role: "doctor" },
                params: { appointmentId: appointmentId1 }
            };
            const doctorRes = mockResponse();
            await listMessages(doctorReq, doctorRes);
            const doctorOk = doctorRes.statusCode === 200 && doctorRes.body.success && doctorRes.body.data.length > 0;

            // Unauthorized user retrieves messages
            const strangerReq = {
                user: { id: strangerUser._id.toString(), role: "patient" },
                params: { appointmentId: appointmentId1 }
            };
            const strangerRes = mockResponse();
            await listMessages(strangerReq, strangerRes);
            const strangerBlocked = strangerRes.statusCode === 403 && !strangerRes.body.success;

            logTestResult(
                "Access Control for Message Thread",
                patientOk && doctorOk && strangerBlocked,
                `Patient access: ${patientRes.statusCode}. Doctor access: ${doctorRes.statusCode}. Stranger access: ${strangerRes.statusCode}`
            );
        } catch (err) {
            logTestResult("Access Control for Message Thread", false, err.message);
        }

        // ==========================================
        // Test 3: Patient and Doctor Sending Chat Messages
        // ==========================================
        console.log("\nRunning Test 3: Patient and Doctor Send Messages...");
        try {
            // Doctor sends message
            const docMsgReq = {
                user: { id: doctorUser._id.toString(), role: "doctor" },
                params: { appointmentId: appointmentId1 },
                body: { content: "Please take the medicine twice a day." }
            };
            const docMsgRes = mockResponse();
            await addMessage(docMsgReq, docMsgRes);
            const docMsgOk = docMsgRes.statusCode === 201 && docMsgRes.body.success && docMsgRes.body.data.content === "Please take the medicine twice a day.";

            // Patient sends message with attachment
            const patMsgReq = {
                user: { id: patientUser._id.toString(), role: "patient" },
                params: { appointmentId: appointmentId1 },
                body: { content: "Understood. Here is my previous blood test report." },
                file: {
                    path: "uploads/messages/blood_report.png",
                    originalname: "blood_report.png",
                    mimetype: "image/png"
                }
            };
            const patMsgRes = mockResponse();
            await addMessage(patMsgReq, patMsgRes);
            const patMsgOk = patMsgRes.statusCode === 201 && patMsgRes.body.success &&
                             patMsgRes.body.data.content === "Understood. Here is my previous blood test report." &&
                             patMsgRes.body.data.fileUrl === "uploads/messages/blood_report.png";

            // Stranger tries to send message
            const strangerMsgReq = {
                user: { id: strangerUser._id.toString(), role: "patient" },
                params: { appointmentId: appointmentId1 },
                body: { content: "Attempting hijack!" }
            };
            const strangerMsgRes = mockResponse();
            await addMessage(strangerMsgReq, strangerMsgRes);
            const strangerBlocked = strangerMsgRes.statusCode === 403 && !strangerMsgRes.body.success;

            // List messages to verify count is now 3 (1 system, 1 doctor, 1 patient)
            const listReq = {
                user: { id: patientUser._id.toString(), role: "patient" },
                params: { appointmentId: appointmentId1 }
            };
            const listRes = mockResponse();
            await listMessages(listReq, listRes);
            const messageCountOk = listRes.body.data.length === 3;

            logTestResult(
                "Exchange Chat Messages & File Attachments",
                docMsgOk && patMsgOk && strangerBlocked && messageCountOk,
                `Doctor msg: ${docMsgRes.statusCode}. Patient msg: ${patMsgRes.statusCode}. Stranger msg: ${strangerMsgRes.statusCode}. Total count: ${listRes.body.data?.length}`
            );
        } catch (err) {
            logTestResult("Exchange Chat Messages & File Attachments", false, err.message);
        }

        // ==========================================
        // Test 4: Patient Prescription Upload (If Doctor Skipped)
        // ==========================================
        console.log("\nRunning Test 4: Patient Prescription Upload (Skip/Alternative Scenario)...");
        try {
            const appointmentId2 = await bookTestAppointment("2026-06-16", "11:00 AM");
            console.log(`Booked second appointment: ${appointmentId2}`);

            // Doctor completes appointment WITHOUT file
            const completeReq = {
                user: { id: doctorUser._id.toString() },
                params: { appointmentId: appointmentId2 },
                body: { status: "COMPLETED" }
                // no req.file
            };
            const completeRes = mockResponse();
            await updateAppointmentStatus(completeReq, completeRes);
            const completeOk = completeRes.body.data.status === "COMPLETED" && !completeRes.body.data.prescriptionUrl;

            // Patient uploads prescription
            const uploadReq = {
                user: { id: patientUser._id.toString() },
                params: { appointmentId: appointmentId2 },
                file: {
                    path: "uploads/prescriptions/patient_prescription.jpg",
                    originalname: "patient_prescription.jpg",
                    mimetype: "image/jpeg"
                }
            };
            const uploadRes = mockResponse();
            await uploadPatientPrescription(uploadReq, uploadRes);

            const uploadOk = uploadRes.statusCode === 200 && uploadRes.body.success &&
                             uploadRes.body.data.prescriptionUrl === "uploads/prescriptions/patient_prescription.jpg";

            // Verify chat message created for patient upload
            const systemMsg = await AppointmentMessage.findOne({
                appointmentId: appointmentId2,
                senderRole: "patient",
                content: "Patient uploaded prescription copy."
            });

            // Patient tries to upload again (should fail)
            const reuploadReq = {
                user: { id: patientUser._id.toString() },
                params: { appointmentId: appointmentId2 },
                file: {
                    path: "uploads/prescriptions/patient_prescription2.jpg",
                    originalname: "patient_prescription2.jpg",
                    mimetype: "image/jpeg"
                }
            };
            const reuploadRes = mockResponse();
            await uploadPatientPrescription(reuploadReq, reuploadRes);
            const blockReupload = reuploadRes.statusCode === 400 && !reuploadRes.body.success;

            logTestResult(
                "Patient Upload Prescription If Skipped By Doctor",
                completeOk && uploadOk && !!systemMsg && blockReupload,
                `Doctor complete without file: ${completeOk}. Patient upload status: ${uploadRes.statusCode}. Re-upload block status: ${reuploadRes.statusCode}`
            );
        } catch (err) {
            logTestResult("Patient Upload Prescription If Skipped By Doctor", false, err.message);
        }

        // ==========================================
        // Test 5: Validation - Upload Prescription on Non-Completed Appointment
        // ==========================================
        console.log("\nRunning Test 5: Uploading Prescription on Active / Non-Completed Appointment...");
        try {
            const appointmentId3 = await bookTestAppointment("2026-06-17", "12:00 PM");
            console.log(`Booked third appointment: ${appointmentId3}`);

            // Patient tries to upload prescription before appointment is marked completed
            const invalidUploadReq = {
                user: { id: patientUser._id.toString() },
                params: { appointmentId: appointmentId3 },
                file: {
                    path: "uploads/prescriptions/patient_prescription.jpg",
                    originalname: "patient_prescription.jpg",
                    mimetype: "image/jpeg"
                }
            };
            const invalidUploadRes = mockResponse();
            await uploadPatientPrescription(invalidUploadReq, invalidUploadRes);

            const uploadBlocked = invalidUploadRes.statusCode === 400 && !invalidUploadRes.body.success;

            logTestResult(
                "Prevent Upload on Non-Completed Appointments",
                uploadBlocked,
                `Blocked non-completed status code: ${invalidUploadRes.statusCode}. Message: ${invalidUploadRes.body?.message}`
            );
        } catch (err) {
            logTestResult("Prevent Upload on Non-Completed Appointments", false, err.message);
        }

        // Print final reports
        console.log("\n==========================================");
        console.log("📊 INTEGRATION VERIFICATION REPORT");
        console.log("==========================================");
        let passedCount = 0;
        results.forEach((r, idx) => {
            if (r.passed) passedCount++;
            console.log(`${idx + 1}. [${r.passed ? "PASS" : "FAIL"}] ${r.name}: ${r.message}`);
        });
        console.log(`\nTests completed: ${passedCount}/${results.length} PASSED.`);
        console.log("==========================================");

        process.exit(passedCount === results.length ? 0 : 1);
    } catch (err) {
        console.error("Test framework error:", err);
        process.exit(1);
    }
}

runTests();
