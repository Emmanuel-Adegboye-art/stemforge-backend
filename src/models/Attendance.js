const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    class: { type: String, required: true },
    date: { type: String, required: true },
    students: [{
        id: String,
        name: String,
        present: Boolean
    }],
    presentCount: { type: Number, default: 0 },
    absentCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

attendanceSchema.index({ user: 1, class: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
