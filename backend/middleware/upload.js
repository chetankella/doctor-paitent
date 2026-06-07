const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");
const path = require("path");

const ALLOWED_MIME_TYPES = [
    "image/jpeg", 
    "image/jpg", 
    "image/png", 
    "application/pdf", 
    "text/csv", 
    "application/vnd.ms-excel"
];

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "healingtracker",
        allowed_formats: ["jpg", "png", "jpeg", "pdf", "csv"],
        resource_type: "auto"
    }
});

function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) || ext === '.csv') {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only PDF, JPG, PNG, and CSV are allowed."), false);
    }
}

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter
});

module.exports = upload;