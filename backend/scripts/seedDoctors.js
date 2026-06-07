require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Doctor = require("../models/doctor");
const Organization = require("../models/organization");
const DoctorOrganization = require("../models/doctorOrganization");

const MOCK_ORGANIZATIONS = [
    {
        name: "City General Hospital",
        type: "HOSPITAL",
        description: "Leading multi-specialty healthcare provider.",
        contactPhone: "9876543210",
        contactEmail: "citygeneral@example.com",
        addressLine1: "101 Healthcare Lane",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        status: "ACTIVE",
        verificationStatus: "VERIFIED"
    },
    {
        name: "Apex Heart & General Institute",
        type: "HOSPITAL",
        description: "Specialized cardiac and general care services.",
        contactPhone: "9876543211",
        contactEmail: "apexheart@example.com",
        addressLine1: "505 Cardiac Avenue",
        city: "Delhi",
        state: "Delhi",
        pincode: "110001",
        status: "ACTIVE",
        verificationStatus: "VERIFIED"
    },
    {
        name: "Metro Dental & Skin Clinic",
        type: "CLINIC",
        description: "State-of-the-art dental and skincare clinic.",
        contactPhone: "9876543212",
        contactEmail: "metrodental@example.com",
        addressLine1: "202 Wellness Boulevard",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400050",
        status: "ACTIVE",
        verificationStatus: "VERIFIED"
    }
];

const MOCK_DOCTORS = [
    {
        email: "cardiologist.smith@example.com",
        name: "Dr. Eleanor Smith",
        specialization: "Cardiologist",
        experience: 15,
        rating: 4.9,
        ratingCount: 42,
        consultationFee: 1200,
        bio: "Dr. Eleanor Smith is an esteemed cardiologist with over 15 years of experience specializing in cardiovascular health, heart surgery, and critical cardiac care.",
        qualifications: ["MBBS", "MD - Cardiology", "FACC"],
        symptoms: ["chest pain", "breathlessness", "high blood pressure", "palpitations", "dizziness"],
        orgIndex: 1 // Apex Heart Institute
    },
    {
        email: "dentist.kumar@example.com",
        name: "Dr. Rajesh Kumar",
        specialization: "Dentist",
        experience: 8,
        rating: 4.7,
        ratingCount: 28,
        consultationFee: 400,
        bio: "Dr. Rajesh Kumar is dedicated to providing high-quality dental care including cosmetic dentistry, orthodontics, root canals, and pediatric dental services.",
        qualifications: ["BDS", "MDS - Orthodontics"],
        symptoms: ["toothache", "gum bleeding", "cavity", "bad breath", "tooth sensitivity"],
        orgIndex: 2 // Metro Dental
    },
    {
        email: "physician.jones@example.com",
        name: "Dr. Robert Jones",
        specialization: "General Physician",
        experience: 12,
        rating: 4.6,
        ratingCount: 95,
        consultationFee: 500,
        bio: "Dr. Robert Jones is a family physician treating broad acute and chronic ailments. Friendly, approachable, and focused on wellness.",
        qualifications: ["MBBS", "MD - General Medicine"],
        symptoms: ["fever", "cough", "cold", "body ache", "headache", "stomach pain", "fatigue"],
        orgIndex: 0 // City General
    },
    {
        email: "dermatologist.davis@example.com",
        name: "Dr. Sarah Davis",
        specialization: "Dermatologist",
        experience: 10,
        rating: 4.8,
        ratingCount: 54,
        consultationFee: 800,
        bio: "Expert dermatologist specializing in clinical and aesthetic skin care, acne treatments, allergy diagnosis, and hair loss solutions.",
        qualifications: ["MBBS", "DDVL (Dermatology)"],
        symptoms: ["skin rash", "acne", "hair fall", "itching", "skin allergy", "dry skin"],
        orgIndex: 2 // Metro Dental & Skin
    },
    {
        email: "pediatrician.sharma@example.com",
        name: "Dr. Priya Sharma",
        specialization: "Pediatrician",
        experience: 9,
        rating: 4.9,
        ratingCount: 88,
        consultationFee: 600,
        bio: "Compassionate pediatrician committed to newborn care, child development milestones, vaccinations, and treating common childhood infections.",
        qualifications: ["MBBS", "DCH (Pediatrics)"],
        symptoms: ["child fever", "child cough", "vomiting", "infant colic", "vaccination", "loss of appetite"],
        orgIndex: 0 // City General
    }
];

async function seed() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected successfully!");

        // 1. Seed Organizations
        console.log("Seeding Organizations...");
        const orgs = [];
        for (const oData of MOCK_ORGANIZATIONS) {
            let org = await Organization.findOne({ name: oData.name });
            if (!org) {
                org = await Organization.create(oData);
                console.log(`Created Organization: ${org.name}`);
            } else {
                console.log(`Organization exists: ${org.name}`);
            }
            orgs.push(org);
        }

        // 2. Seed Doctors
        console.log("Seeding Doctors...");
        const hashedPassword = await bcrypt.hash("Password123!", 10);

        for (const docData of MOCK_DOCTORS) {
            // Find or create User
            let user = await User.findOne({ email: docData.email });
            if (!user) {
                user = await User.create({
                    name: docData.name,
                    email: docData.email,
                    password: hashedPassword,
                    role: "doctor",
                    isVerified: true,
                    onboardingCompleted: true
                });
                console.log(`Created User: ${user.email}`);
            } else {
                user.name = docData.name;
                user.onboardingCompleted = true;
                await user.save();
                console.log(`User exists: ${user.email}`);
            }

            // Find or create Doctor profile
            let doctor = await Doctor.findOne({ userId: user._id });
            
            // License variables
            const licenseNumber = `LIC-${docData.name.replace(/[^a-zA-Z]/g, "").toUpperCase()}-${docData.experience}`;
            const licenseHash = crypto
                .createHash("sha256")
                .update(licenseNumber)
                .digest("hex");
            const encryptedLicense = "dummy_encrypted_license";

            if (!doctor) {
                doctor = await Doctor.create({
                    userId: user._id,
                    specialization: docData.specialization,
                    experience: docData.experience,
                    hospitalName: orgs[docData.orgIndex].name,
                    licenseHash,
                    licenseEncrypted: encryptedLicense,
                    status: "active",
                    rating: docData.rating,
                    ratingCount: docData.ratingCount,
                    consultationFee: docData.consultationFee,
                    bio: docData.bio,
                    qualifications: docData.qualifications,
                    symptoms: docData.symptoms,
                    profileImage: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(docData.name)}`
                });
                console.log(`Created Doctor Profile for: ${user.name}`);
            } else {
                // Update profile with search details
                doctor.specialization = docData.specialization;
                doctor.experience = docData.experience;
                doctor.hospitalName = orgs[docData.orgIndex].name;
                doctor.rating = docData.rating;
                doctor.ratingCount = docData.ratingCount;
                doctor.consultationFee = docData.consultationFee;
                doctor.bio = docData.bio;
                doctor.qualifications = docData.qualifications;
                doctor.symptoms = docData.symptoms;
                doctor.profileImage = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(docData.name)}`;
                await doctor.save();
                console.log(`Updated Doctor Profile for: ${user.name}`);
            }

            // 3. Create Doctor Organization link
            const org = orgs[docData.orgIndex];
            const membership = await DoctorOrganization.findOne({
                doctorId: doctor._id,
                organizationId: org._id
            });

            if (!membership) {
                await DoctorOrganization.create({
                    doctorId: doctor._id,
                    organizationId: org._id,
                    role: "CONSULTANT",
                    status: "ACTIVE",
                    joinedAt: new Date()
                });
                console.log(`Linked Dr. ${user.name} to ${org.name}`);
            } else {
                membership.status = "ACTIVE";
                await membership.save();
                console.log(`Membership active for Dr. ${user.name} at ${org.name}`);
            }
        }

        console.log("Seeding completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Seeding error:", err);
        process.exit(1);
    }
}

// Ensure crypto is required
const crypto = require("crypto");
seed();
