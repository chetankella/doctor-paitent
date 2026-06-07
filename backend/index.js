
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const express = require('express');
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");


const doctorRoutes = require("./routes/doctor.routes")
const adminRoutes = require("./routes/admin.routes")
const authRoutes = require("./routes/auth.routes")
const patientRoutes = require("./routes/patient.routes")
const emergencyRoutes = require("./routes/emergency.routes")
const organizationRoutes = require("./routes/organization.routes")
const departmentRoutes = require("./routes/department.routes")
const organizationRequestRoutes = require("./routes/organizationRequest.routes")
const superAdminRoutes = require("./routes/superAdmin.routes")
const departmentAdminRoutes = require("./routes/departmentAdmin.routes")
const staffRoutes = require("./routes/staff.routes")

const app = express();
app.disable("x-powered-by");
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Make `io` accessible in controllers via `req.io`
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Socket.io Connection Logic
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a specific appointment room
    socket.on("join_appointment", (appointmentId) => {
        socket.join(appointmentId);
        console.log(`User joined appointment room: ${appointmentId}`);
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    message: "Too many requests from this IP, please try again later."
});

// Stricter CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));

app.use(express.json({ limit: "10kb" }));
app.use(helmet({
    crossOriginResourcePolicy: false, // Required for cross-origin image loads (Cloudinary)
}));

// Apply rate limiter to all API routes
app.use("/api", limiter);

// Serve legacy uploads directory statically
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── New RESTful routes (plural, /me based) ───
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/emergency", emergencyRoutes);

// ─── Legacy routes (kept for backward compatibility) ───
app.use("/api/doctor", doctorRoutes);
app.use("/api/patient", patientRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/organization", organizationRoutes);

app.use("/api/organization", organizationRequestRoutes);

app.use("/api/superadmin", superAdminRoutes);

app.use("/api/department", departmentRoutes);

app.use("/api/department-admin", departmentAdminRoutes);

app.use("/api/staff", staffRoutes);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Mongo connected")
        const PORT = process.env.PORT || 5000;
        console.log("PORT VALUE =", PORT);

        // Bind to 0.0.0.0 so the API is reachable from other devices on the network
        server.listen(PORT, "0.0.0.0", () => {
            console.log(`server running on port ${PORT} (0.0.0.0)`)
        });
    })
    .catch(err => console.log(err));
