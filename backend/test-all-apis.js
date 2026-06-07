require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Fallback Faker Implementation (requires zero dependencies)
let faker;
try {
    faker = require("@faker-js/faker").faker;
} catch {
    faker = {
        internet: {
            email: () => `patient.${Math.random().toString(36).substring(2, 8)}@example.com`
        },
        helpers: {
            arrayElement: (arr) => arr[Math.floor(Math.random() * arr.length)]
        },
        word: {
            noun: () => ["peanuts", "dust", "pollen", "seafood", "penicillin"][Math.floor(Math.random() * 5)]
        },
        number: {
            int: ({ min, max }) => Math.floor(Math.random() * (max - min + 1)) + min,
            float: ({ min, max, precision }) => parseFloat((Math.random() * (max - min) + min).toFixed(1))
        },
        location: {
            city: () => ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune", "Chennai"][Math.floor(Math.random() * 6)]
        },
        date: {
            soon: () => {
                const d = new Date();
                d.setDate(d.getDate() + Math.floor(Math.random() * 5) + 1);
                return d;
            }
        }
    };
}

// Models
const User = require("./models/user");
const PatientProfile = require("./models/patientProfile");
const Doctor = require("./models/doctor");
const Appointment = require("./models/appointment");
const DoctorAvailability = require("./models/doctorAvailability");
const DoctorOrganization = require("./models/doctorOrganization");
const Organization = require("./models/organization");

// Controllers
const { searchDoctors, autocompleteDoctors } = require("./controllers/patient.controller");
const {
    getDoctorAvailability,
    bookAppointment,
    listPatientAppointments,
    cancelPatientAppointment,
    listDoctorAppointments,
    updateAppointmentStatus
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

const specializations = [
  "Cardiologist",
  "Dentist",
  "Dermatologist",
  "Neurologist",
  "General Physician"
];

const bloodGroups = ["A+", "B+", "O+", "AB+"];

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
            DoctorAvailability.deleteMany({}),
            DoctorOrganization.deleteMany({}),
            Organization.deleteMany({})
        ]);

        // ==========================================
        // 🏨 Seed Test Organization
        // ==========================================
        const testOrg = await Organization.create({
            name: "City Medical Care",
            type: "HOSPITAL",
            contactPhone: "9998887770",
            contactEmail: "citymed@example.com",
            addressLine1: "500 Health Boulevard",
            city: "Mumbai",
            state: "Maharashtra",
            pincode: "400001",
            status: "ACTIVE",
            verificationStatus: "VERIFIED"
        });
        console.log(`Created Organization: ${testOrg.name}`);

        // ==========================================
        // 🧑 Seed Patients (5)
        // ==========================================
        console.log("Seeding patients...");
        const patients = [];
        const hashedPassword = await bcrypt.hash("Password123!", 10);
        
        for (let i = 0; i < 5; i++) {
            const userId = new mongoose.Types.ObjectId();
            const u = await User.create({
                _id: userId,
                name: `Patient ${i + 1}`,
                email: faker.internet.email().toLowerCase(),
                password: hashedPassword,
                role: "patient",
                isVerified: true,
                onboardingCompleted: true
            });

            const p = await PatientProfile.create({
                userId: userId,
                dateOfBirth: new Date("1995-05-15"),
                gender: "male",
                bloodGroup: faker.helpers.arrayElement(bloodGroups),
                allergies: [faker.word.noun()],
                chronicConditions: [faker.word.noun()]
            });

            patients.push({ user: u, profile: p });
        }
        console.log(`Successfully seeded ${patients.length} patients.`);

        // ==========================================
        // 👨⚕️ Seed Doctors (3)
        // ==========================================
        console.log("Seeding doctors...");
        const doctors = [];

        const specialtiesList = ["Cardiologist", "Dentist", "Dermatologist"];
        for (let i = 0; i < 3; i++) {
            const userId = new mongoose.Types.ObjectId();
            const email = `doctor.${specialtiesList[i].toLowerCase()}@example.com`;
            const u = await User.create({
                _id: userId,
                name: `Dr. ${specialtiesList[i]} Specialist`,
                email: email,
                password: hashedPassword,
                role: "doctor",
                isVerified: true,
                onboardingCompleted: true
            });

            const d = await Doctor.create({
                userId: userId,
                specialization: specialtiesList[i],
                experience: faker.number.int({ min: 5, max: 15 }),
                consultationFee: 500 + (i * 200),
                rating: 4.5 + (i * 0.2),
                ratingCount: 15 + (i * 5),
                bio: `Expert care in ${specialtiesList[i]} clinical services.`,
                qualifications: ["MBBS", "MD"],
                symptoms: i === 0 ? ["chest pain", "palpitations"] : i === 1 ? ["toothache"] : ["skin rash"],
                hospitalName: testOrg.name,
                licenseHash: `hash_lic_${i}`,
                licenseEncrypted: "encrypted_lic",
                status: "active"
            });

            // Make active org membership so doctor is verified
            await DoctorOrganization.create({
                doctorId: d._id,
                organizationId: testOrg._id,
                role: "CONSULTANT",
                status: "ACTIVE",
                joinedAt: new Date()
            });

            doctors.push({ user: u, profile: d });
        }
        console.log(`Successfully seeded ${doctors.length} verified doctors.`);

        const testPatient = patients[0];
        const testDoctor = doctors[0]; // Cardiologist
        const bookingDate = "2026-06-12";
        const bookingTime = "11:00 AM";

        // ==========================================
        // 🧪 API End-To-End Test Cases
        // ==========================================
        const results = [];

        function logTestResult(name, passed, message) {
            results.push({ name, passed, message });
            console.log(`[${passed ? "PASS" : "FAIL"}] ${name} - ${message}`);
        }

        // Test 1: Search Doctors
        console.log("\nRunning Test 1: Search Doctors...");
        try {
            const req = { query: { specialization: "Cardiologist" } };
            const res = mockResponse();
            await searchDoctors(req, res);

            const hasDoc = res.body.success && res.body.data.length > 0 && res.body.data[0].specialization === "Cardiologist";
            logTestResult("Search Doctors by Specialization", hasDoc, `Found ${res.body.data?.length || 0} cardiologist(s)`);
        } catch (err) {
            logTestResult("Search Doctors by Specialization", false, err.message);
        }

        // Test 2: Search Doctors by Symptom
        console.log("\nRunning Test 2: Search Doctors by Symptom...");
        try {
            const req = { query: { symptom: "chest pain" } };
            const res = mockResponse();
            await searchDoctors(req, res);

            const hasDoc = res.body.success && res.body.data.length > 0 && res.body.data[0].symptoms.includes("chest pain");
            logTestResult("Search Doctors by Symptom", hasDoc, `Found ${res.body.data?.length || 0} matching doctor(s)`);
        } catch (err) {
            logTestResult("Search Doctors by Symptom", false, err.message);
        }

        // Test 3: Autocomplete
        console.log("\nRunning Test 3: Autocomplete Suggestions...");
        try {
            const req = { query: { query: "Cardio" } };
            const res = mockResponse();
            await autocompleteDoctors(req, res);

            const ok = res.body.success && res.body.data.some(s => s.type === "specialization" && s.value === "Cardiologist");
            logTestResult("Autocomplete Suggestions", ok, `Autocomplete returned: ${JSON.stringify(res.body.data)}`);
        } catch (err) {
            logTestResult("Autocomplete Suggestions", false, err.message);
        }

        // Test 4: Get Availability
        console.log("\nRunning Test 4: Get Doctor Availability...");
        try {
            const req = { params: { doctorId: testDoctor.profile._id }, query: { date: bookingDate } };
            const res = mockResponse();
            await getDoctorAvailability(req, res);

            const ok = res.body.success && res.body.data.slots.length > 0;
            logTestResult("Get Doctor Availability", ok, `Received ${res.body.data?.slots?.length || 0} slots`);
        } catch (err) {
            logTestResult("Get Doctor Availability", false, err.message);
        }

        // Test 5: Book Appointment
        console.log("\nRunning Test 5: Book Appointment...");
        let createdAppointmentId = null;
        let createdAccessToken = null;
        try {
            const req = {
                user: { id: testPatient.user._id.toString() },
                body: {
                    doctorId: testDoctor.profile._id.toString(),
                    date: bookingDate,
                    time: bookingTime,
                    shareRecords: true,
                    scope: "FULL_PROFILE",
                    expiryDays: 7
                }
            };
            const res = mockResponse();
            await bookAppointment(req, res);

            const ok = res.statusCode === 201 && res.body.success;
            if (ok) {
                createdAppointmentId = res.body.data.appointment._id;
                createdAccessToken = res.body.data.shareRecordsToken;
            }
            logTestResult("Book Appointment", ok, `Status: ${res.statusCode}. Token: ${createdAccessToken}`);
        } catch (err) {
            logTestResult("Book Appointment", false, err.message);
        }

        // Test 6: Block Double Booking
        console.log("\nRunning Test 6: Block Double Booking...");
        try {
            const req = {
                user: { id: testPatient.user._id.toString() },
                body: {
                    doctorId: testDoctor.profile._id.toString(),
                    date: bookingDate,
                    time: bookingTime
                }
            };
            const res = mockResponse();
            await bookAppointment(req, res);

            const blocked = res.statusCode === 400 && !res.body.success;
            logTestResult("Block Double Booking", blocked, `Status: ${res.statusCode}. Message: ${res.body?.message}`);
        } catch (err) {
            logTestResult("Block Double Booking", false, err.message);
        }

        // Test 7: List Patient Appointments
        console.log("\nRunning Test 7: List Patient Appointments...");
        try {
            const req = { user: { id: testPatient.user._id.toString() } };
            const res = mockResponse();
            await listPatientAppointments(req, res);

            const ok = res.body.success && res.body.data.length > 0 && res.body.data[0]._id.toString() === createdAppointmentId.toString();
            logTestResult("List Patient Appointments", ok, `Retrieved ${res.body.data?.length || 0} appointment(s)`);
        } catch (err) {
            logTestResult("List Patient Appointments", false, err.message);
        }

        // Test 8: List Doctor Appointments
        console.log("\nRunning Test 8: List Doctor Appointments...");
        try {
            const req = { user: { id: testDoctor.user._id.toString() } };
            const res = mockResponse();
            await listDoctorAppointments(req, res);

            const ok = res.body.success && res.body.data.length > 0;
            logTestResult("List Doctor Appointments", ok, `Retrieved ${res.body.data?.length || 0} appointment(s) for doctor`);
        } catch (err) {
            logTestResult("List Doctor Appointments", false, err.message);
        }

        // Test 9: Complete Appointment
        console.log("\nRunning Test 9: Update Status to COMPLETED...");
        try {
            const req = {
                user: { id: testDoctor.user._id.toString() },
                params: { appointmentId: createdAppointmentId.toString() },
                body: { status: "COMPLETED" }
            };
            const res = mockResponse();
            await updateAppointmentStatus(req, res);

            const ok = res.body.success && res.body.data.status === "COMPLETED";
            logTestResult("Complete Appointment Status", ok, `Status updated to COMPLETED`);
        } catch (err) {
            logTestResult("Complete Appointment Status", false, err.message);
        }

        // Test 10: Cancel Booking and Free Slot
        console.log("\nRunning Test 10: Cancel Booking and Free Slot...");
        // Rebook a new appointment first to test cancellation
        let cancelAppId = null;
        try {
            const bookReq = {
                user: { id: testPatient.user._id.toString() },
                body: {
                    doctorId: testDoctor.profile._id.toString(),
                    date: bookingDate,
                    time: "03:00 PM"
                }
            };
            const bookRes = mockResponse();
            await bookAppointment(bookReq, bookRes);
            cancelAppId = bookRes.body.data.appointment._id;

            const cancelReq = {
                user: { id: testPatient.user._id.toString() },
                params: { appointmentId: cancelAppId.toString() }
            };
            const cancelRes = mockResponse();
            await cancelPatientAppointment(cancelReq, cancelRes);

            const cancelOk = cancelRes.body.success && cancelRes.body.data.status === "CANCELLED";

            // Verify slot is free again
            const availReq = { params: { doctorId: testDoctor.profile._id }, query: { date: bookingDate } };
            const availRes = mockResponse();
            await getDoctorAvailability(availReq, availRes);

            const slot = availRes.body.data.slots.find(s => s.time === "03:00 PM");
            const slotFree = slot && slot.isBooked === false;

            logTestResult("Cancel Appointment & Release Slot", cancelOk && slotFree, `Cancel status: ${cancelRes.body?.data?.status}. Slot 3:00 PM isBooked: ${slot?.isBooked}`);
        } catch (err) {
            logTestResult("Cancel Appointment & Release Slot", false, err.message);
        }

        // Print final reports
        console.log("\n==========================================");
        console.log("📊 FINAL VERIFICATION REPORT");
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
