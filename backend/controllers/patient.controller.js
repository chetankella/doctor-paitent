
const User = require("../models/user");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");    
const Patient = require("../models/patientProfile");
const { projectPatientData } = require("../services/projection.service");



const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

      
        const user = await User.findOne({ email, role: "patient" });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Account already verified"
            });
        }
        if (user.otpBlockedUntil && user.otpBlockedUntil > Date.now()) {
            return res.status(429).json({
                success: false,
                message: "Too many failed attempts. Try again later."
            });
        }


        if (!user.otp || !user.otpExpires) {
            return res.status(400).json({
                success: false,
                message: "OTP not found. Please request a new one."
            });
        }

       
        if (user.otpExpires < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "OTP expired. Please request a new one."
            });
        }

       
        const hashedOtp = crypto
            .createHash("sha256")
            .update(otp)
            .digest("hex");

        
        if (hashedOtp !== user.otp) {
            user.otpAttempts += 1;
             if (user.otpAttempts >= 5) {
                user.otpBlockedUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
                user.otpAttempts = 0;
            }
             await user.save();

            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

     
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        user.otpAttempts = 0;
        user.otpBlockedUntil = undefined;

        await user.save();
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            success: true,
            message: "Account verified successfully",
            token
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email, role: "patient" });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Account already verified"
            });
        }

        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const hashedOtp = crypto
            .createHash("sha256")
            .update(otp)
            .digest("hex");

        user.otp = hashedOtp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        user.otpAttempts = 0;
        user.otpBlockedUntil = undefined;

        await user.save();

        await sendEmail(
            email,
            "Your New OTP – Digital Health Platform",
            `<h2>Your new OTP is: ${otp}</h2>
             <p>Expires in 10 minutes.</p>`
        );

        res.json({
            success: true,
            message: "New OTP sent"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const registerPatient = async (req, res) => {
    
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already registered"
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = crypto
            .createHash("sha256")
            .update(otp)
            .digest("hex");
         const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "patient",
            isVerified: false,
            otp: hashedOtp,
            otpExpires: Date.now() + 10 * 60 * 1000 // 10 minutes
        });
        await sendEmail(
            email,
            "Verify Your Account – Digital Health Platform",
            `
            <div style="font-family: Arial; line-height: 1.6;">
                <h2>Email Verification</h2>
                <p>Hello ${name},</p>
                <p>Your OTP for account verification is:</p>
                <h1 style="letter-spacing: 3px;">${otp}</h1>
                <p>This OTP will expire in 10 minutes.</p>
                <p>If you did not register, please ignore this email.</p>
                <br/>
                <strong>Digital Health Platform Team</strong>
            </div>
            `
        );
        res.status(201).json({
            success: true,
            message: "Registration successful. Please verify OTP sent to email."
        });

    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        })
    }
    
}

const createOrUpdateProfile = async (req, res) => {
    try {
        const allowedFields = [
                    "dateOfBirth",
                    "gender",
                    "bloodGroup",
                    "phoneNumber",
                    "heightCm",
                    "weightKg",
                    "allergies",
                    "chronicConditions",
                    "currentMedications",
                    "pastSurgeries",
                    "familyHistory",
                    "lifestyle",
                    "emergencyContact",
                    "insurance",
                    "address"
                ];

        if (!req.user?.id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const filteredData = {};
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    filteredData[field] = req.body[field];
                }
            });

        // Check if profile exists
        const existingProfile = await Patient.findOne({
            userId: req.user.id
        });

        let profile;

        if (existingProfile) {
            // Update existing
            profile = await Patient.findOneAndUpdate(
                { userId: req.user.id },
                { $set: filteredData },
                { new: true }
            );
        } else {
            // Create new
            profile = await Patient.create({
                userId: req.user.id,
                ...filteredData
            });
        }

        return res.status(200).json({
            success: true,
            message: existingProfile
                ? "Profile updated successfully"
                : "Profile created successfully",
            data: profile
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const getProfile = async (req, res) => {
    try {

        if (!req.user?.id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        // 1️⃣ Find patient profile
        const profile = await Patient.findOne({
            userId: req.user.id
        })
        .select("-__v -status")   // remove internal fields
        .populate("userId", "name email");

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found"
            });
        }

        // 2️⃣ Structure clean response
        return res.status(200).json({
            success: true,
            data: {
                id: profile._id,
                name: profile.userId.name,
                email: profile.userId.email,
                dateOfBirth: profile.dateOfBirth,
                gender: profile.gender,
                bloodGroup: profile.bloodGroup,
                phoneNumber: profile.phoneNumber,
                heightCm: profile.heightCm,
                weightKg: profile.weightKg,
                allergies: profile.allergies,
                chronicConditions: profile.chronicConditions,
                currentMedications: profile.currentMedications,
                pastSurgeries: profile.pastSurgeries,
                familyHistory: profile.familyHistory,
                lifestyle: profile.lifestyle,
                emergencyContact: profile.emergencyContact,
                insurance: profile.insurance,
                address: profile.address,
                organDonor: profile.organDonor,
                criticalAlerts: profile.criticalAlerts,
                createdAt: profile.createdAt,
                updatedAt: profile.updatedAt
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



const getPatientProfile = async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId).lean();
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }
        if (!req.patientAccess) {
            return res.status(403).json({
                success: false,
                message: "No access to this patient"
            });
        }
        const filteredData = projectPatientData(patient, req.patientAccess);

        return res.status(200).json({
            success: true,
            data: filteredData
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


/**
 * Get patient profile using token (no ID exposed)
 */
const getProfileByToken = async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({
                success: false,
                message: "Invalid token or access denied"
            });
        }

        const patient = await Patient.findOne({
            userId: req.patientId
        })
        .select("-__v -status")
        .populate("userId", "name email");

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found"
            });
        }

        // Apply scope-based filtering
        let filteredData = patient.toObject();

        if (req.accessScope === "EMERGENCY") {
            // Emergency: limited data
            filteredData = {
                bloodGroup: patient.bloodGroup,
                allergies: patient.allergies,
                chronicConditions: patient.chronicConditions,
                currentMedications: patient.currentMedications,
                emergencyContact: patient.emergencyContact
            };
        }

        return res.status(200).json({
            success: true,
            data: filteredData
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Generate emergency QR code (for patient to share in emergencies)
 */
const generateEmergencyQR = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const { generateEmergencyQRCode } = require("../services/qrcode.service");
        
        const qrResult = await generateEmergencyQRCode(
            req.user.id,
            req.user.email
        );

        if (!qrResult.success) {
            return res.status(500).json({
                success: false,
                message: "Failed to generate QR code"
            });
        }

        res.status(200).json({
            success: true,
            data: {
                qrCode: qrResult.qrCodeImage,
                token: qrResult.qrToken,
                expiresAt: qrResult.expiresAt
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


/**
 * Generate access token for sharing with doctor
 */
const generateAccessTokenForDoctor = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const { doctorEmail, scope = "FULL_PROFILE", expiryDays = 30 } = req.body;

        // Find doctor user by email
        const doctorUser = await User.findOne({
            email: doctorEmail,
            role: "doctor"
        });

        if (!doctorUser) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found"
            });
        }

        const Doctor = require("../models/doctor");
        const doctor = await Doctor.findOne({ userId: doctorUser._id });
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found"
            });
        }

        const PatientAccessService = require("../services/patientAccess.service");
        const { generateAccessToken: generateToken } = require("../utils/token.utils");

        // Create access record
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        const accessRecord = await PatientAccessService.createAccess({
            patientId: req.user.id,
            doctorId: doctor._id,
            accessType: "MANUAL",
            scope,
            expiresAt,
            createdBy: "PATIENT"
        });

        // Generate token
        const token = generateToken(req.user.id, scope, `${expiryDays}d`);

        res.status(200).json({
            success: true,
            data: {
                token,
                doctorEmail,
                scope,
                expiresAt
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


/**
 * Get patient profile using email (for authorized doctors)
 */
const getProfileByEmail = async (req, res) => {
    try {
        if (!req.user?.id || req.user.role !== "doctor") {
            return res.status(403).json({
                success: false,
                message: "Only doctors can access this endpoint"
            });
        }

        const { patientEmail } = req.body;

        // Find patient by email
        const patientUser = await User.findOne({
            email: patientEmail,
            role: "patient"
        });

        if (!patientUser) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        const Doctor = require("../models/doctor");
        const doctor = await Doctor.findOne({ userId: req.user.id });
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found"
            });
        }

        // Check if doctor has access
        const PatientAccess = require("../models/patientAccess");
        const accessFilter = {
            patientId: patientUser._id,
            doctorId: doctor._id,
            status: "ACTIVE",
            expiresAt: { $gt: new Date() }
        };

        // If called in a tenant-scoped context, enforce org scoping
        if (req.organizationId) {
            accessFilter.organizationId = req.organizationId;
        }

        const access = await PatientAccess.findOne(accessFilter);

        if (!access) {
            return res.status(403).json({
                success: false,
                message: "No active access to this patient"
            });
        }

        // Get profile
        const patient = await Patient.findOne({
            userId: patientUser._id
        }).lean();

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found"
            });
        }

        const { projectPatientData } = require("../services/projection.service");
        const filteredData = projectPatientData(patient, access);

        res.status(200).json({
            success: true,
            data: {
                patientEmail,
                accessScope: access.scope,
                profile: filteredData
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
 
const searchDoctors = async (req, res) => {
    try {
        const { search, specialization, symptom, city, experience, rating, availability } = req.query;
        const Doctor = require("../models/doctor");
        const DoctorOrganization = require("../models/doctorOrganization");
        const DoctorAvailability = require("../models/doctorAvailability");
        require("../models/organization"); // Ensure Organization model is registered in Mongoose

        // Fetch active doctors
        const doctors = await Doctor.find({
            status: { $in: ["active", "approved"] }
        }).populate("userId", "name email");

        // Fetch memberships for all active doctors
        const doctorIds = doctors.map(doc => doc._id);
        const memberships = await DoctorOrganization.find({
            doctorId: { $in: doctorIds },
            status: "ACTIVE"
        }).populate("organizationId", "name type city");

        // Group memberships by doctorId
        const membershipsByDoctor = {};
        memberships.forEach(m => {
            if (!membershipsByDoctor[m.doctorId.toString()]) {
                membershipsByDoctor[m.doctorId.toString()] = [];
            }
            if (m.organizationId) {
                membershipsByDoctor[m.doctorId.toString()].push(m.organizationId);
            }
        });

        // Map doctors to include their organizations and new rating details
        let results = doctors.map(doc => {
            const docObj = doc.toObject();
            return {
                id: docObj._id,
                name: docObj.userId?.name || "Doctor",
                email: docObj.userId?.email || "",
                specialization: docObj.specialization,
                experience: docObj.experience,
                hospitalName: docObj.hospitalName,
                rating: docObj.rating ?? 4.5,
                ratingCount: docObj.ratingCount ?? 10,
                consultationFee: docObj.consultationFee ?? 500,
                bio: docObj.bio || "Experienced healthcare specialist committed to patient well-being.",
                qualifications: docObj.qualifications || ["MBBS", "MD"],
                symptoms: docObj.symptoms || [],
                profileImage: docObj.profileImage || "",
                organizations: membershipsByDoctor[docObj._id.toString()] || []
            };
        });

        // Filter results by query parameters
        if (specialization) {
            const specLower = specialization.toLowerCase();
            results = results.filter(doc => doc.specialization && doc.specialization.toLowerCase().includes(specLower));
        }

        if (symptom) {
            const symLower = symptom.toLowerCase();
            results = results.filter(doc => doc.symptoms && doc.symptoms.some(s => s.toLowerCase().includes(symLower)));
        }

        if (city) {
            const cityLower = city.toLowerCase();
            results = results.filter(doc => doc.organizations.some(org => org.city && org.city.toLowerCase().includes(cityLower)));
        }

        if (experience) {
            const minExp = parseInt(experience);
            if (!isNaN(minExp)) {
                results = results.filter(doc => doc.experience >= minExp);
            }
        }

        if (rating) {
            const minRating = parseFloat(rating);
            if (!isNaN(minRating)) {
                results = results.filter(doc => doc.rating >= minRating);
            }
        }

        if (availability) {
            let targetDate = new Date();
            if (availability === "tomorrow") {
                targetDate.setDate(targetDate.getDate() + 1);
            }
            targetDate.setHours(0, 0, 0, 0);

            // Fetch doctor availabilities for that target date
            const avList = await DoctorAvailability.find({ date: targetDate });
            
            // Map doctorId to availability status (if all slots are booked, they are unavailable)
            const unavailableDoctorIds = avList
                .filter(av => av.slots.length > 0 && av.slots.every(s => s.isBooked))
                .map(av => av.doctorId.toString());

            results = results.filter(doc => !unavailableDoctorIds.includes(doc.id.toString()));
        }

        if (search) {
            const queryLower = search.toLowerCase();
            results = results.filter(doc => {
                const nameMatch = doc.name && doc.name.toLowerCase().includes(queryLower);
                const specMatch = doc.specialization && doc.specialization.toLowerCase().includes(queryLower);
                const hospitalMatch = doc.hospitalName && doc.hospitalName.toLowerCase().includes(queryLower);
                const orgMatch = doc.organizations.some(org => org.name && org.name.toLowerCase().includes(queryLower));
                const symptomMatch = doc.symptoms && doc.symptoms.some(s => s.toLowerCase().includes(queryLower));
                return nameMatch || specMatch || hospitalMatch || orgMatch || symptomMatch;
            });
        }

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const autocompleteDoctors = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.json({ success: true, data: [] });
        }

        const queryLower = query.toLowerCase();
        const Doctor = require("../models/doctor");

        const doctors = await Doctor.find({
            status: { $in: ["active", "approved"] }
        }).populate("userId", "name");

        const suggestions = [];
        const seen = new Set();

        doctors.forEach(doc => {
            if (doc.userId?.name && doc.userId.name.toLowerCase().includes(queryLower)) {
                const key = `doc:${doc.userId.name}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    suggestions.push({ type: "doctor", value: doc.userId.name, id: doc._id });
                }
            }
            if (doc.specialization && doc.specialization.toLowerCase().includes(queryLower)) {
                const key = `spec:${doc.specialization}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    suggestions.push({ type: "specialization", value: doc.specialization });
                }
            }
            if (doc.symptoms) {
                doc.symptoms.forEach(s => {
                    if (s.toLowerCase().includes(queryLower)) {
                        const key = `sym:${s}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            suggestions.push({ type: "symptom", value: s });
                        }
                    }
                });
            }
        });

        res.json({
            success: true,
            data: suggestions.slice(0, 8)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    verifyOtp,
    resendOtp,
    registerPatient,
    createOrUpdateProfile,
    getProfile,
    getPatientProfile,
    getProfileByToken,
    generateEmergencyQR,
    generateAccessTokenForDoctor,
    getProfileByEmail,
    searchDoctors,
    autocompleteDoctors
};