const ClinicalNote = require("../models/clinicalNote");
const AccessGrant = require("../models/accessGrant");

/**
 * POST /api/doctors/me/patients/:grantId/notes
 * Doctor adds a clinical note for a patient
 */
const createNote = async (req, res) => {
    try {
        const { type, title, content, tags = [], severity = "low", followUpDate } = req.body;

        if (!type || !title || !content) {
            return res.status(400).json({
                success: false,
                message: "type, title, and content are required"
            });
        }

        // Verify grant scope allows writing (FULL_WITH_WRITE only)
        // For notes, we allow any scope >= FULL_PROFILE
        // since notes are doctor-owned data, not patient mutations

        const noteId = ClinicalNote.generateNoteId();

        const note = await ClinicalNote.create({
            noteId,
            grantId: req.grantId,
            doctorId: req.user.id,
            patientId: req.patientId,
            type,
            title,
            content,
            tags,
            severity,
            followUpDate: followUpDate || null
        });

        return res.status(201).json({
            success: true,
            data: {
                noteId: note.noteId,
                type: note.type,
                title: note.title,
                severity: note.severity,
                createdAt: note.createdAt
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create clinical note"
        });
    }
};

/**
 * GET /api/doctors/me/patients/:grantId/notes
 * List all notes for a patient (by this doctor via this grant)
 */
const listNotes = async (req, res) => {
    try {
        const { page = 1, limit = 20, type } = req.query;

        const filter = {
            grantId: req.grantId,
            doctorId: req.user.id,
            isDeleted: false
        };

        if (type) filter.type = type;

        const [notes, total] = await Promise.all([
            ClinicalNote.find(filter)
                .sort({ createdAt: -1 })
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit))
                .select("-content -isDeleted") // Don't send full content in list view
                .lean(),
            ClinicalNote.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            data: {
                notes,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total
                }
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to list clinical notes"
        });
    }
};

/**
 * PUT /api/doctors/me/patients/:grantId/notes/:noteId
 * Update a clinical note
 */
const updateNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const { type, title, content, tags, severity, followUpDate } = req.body;

        const note = await ClinicalNote.findOne({
            noteId,
            doctorId: req.user.id,
            isDeleted: false
        });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: "Note not found"
            });
        }

        if (type) note.type = type;
        if (title) note.title = title;
        if (content) note.content = content;
        if (tags) note.tags = tags;
        if (severity) note.severity = severity;
        if (followUpDate !== undefined) note.followUpDate = followUpDate;

        await note.save();

        return res.status(200).json({
            success: true,
            data: {
                noteId: note.noteId,
                type: note.type,
                title: note.title,
                severity: note.severity,
                updatedAt: note.updatedAt
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update clinical note"
        });
    }
};

/**
 * DELETE /api/doctors/me/patients/:grantId/notes/:noteId
 * Soft-delete a clinical note
 */
const deleteNote = async (req, res) => {
    try {
        const { noteId } = req.params;

        const note = await ClinicalNote.findOne({
            noteId,
            doctorId: req.user.id,
            isDeleted: false
        });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: "Note not found"
            });
        }

        note.isDeleted = true;
        await note.save();

        return res.status(200).json({
            success: true,
            message: "Note deleted"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete clinical note"
        });
    }
};

module.exports = {
    createNote,
    listNotes,
    updateNote,
    deleteNote
};
