const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name:     { type: String, required: true, trim: true },
    role:     { type: String, enum: ['teacher', 'admin'], default: 'teacher' },
    school:   { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    // Password reset
    resetPasswordToken:   { type: String, default: null },
    resetPasswordExpires: { type: Date,   default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
