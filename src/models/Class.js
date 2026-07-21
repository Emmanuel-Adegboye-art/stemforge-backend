// Back-End/src/models/Class.js
const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
    // Basic Info
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    level: {
        type: Number,
        min: 1,
        max: 12,
        description: 'Used for upgrades (JSS 1 → JSS 2)'
    },
    
    // Arms
    arms: {
        type: [String],
        default: ['A', 'B', 'C']
    },
    
    // Metadata
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: false
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    
    // Statistics (denormalized for performance)
    stats: {
        totalStudents: { type: Number, default: 0 },
        activeStudents: { type: Number, default: 0 },
        armsCount: { type: Number, default: 0 }
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    archivedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for performance
ClassSchema.index({ name: 1 });
ClassSchema.index({ isActive: 1 });
ClassSchema.index({ level: 1 });

// Virtual: next class level (for upgrades)
ClassSchema.virtual('nextLevel').get(function() {
    if (!this.level) return null;
    const levels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 
                    'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 
                    'Grade 11', 'Grade 12', 'JSS 1', 'JSS 2', 'JSS 3', 
                    'SS 1', 'SS 2', 'SS 3'];
    const currentIndex = levels.indexOf(this.name);
    if (currentIndex !== -1 && currentIndex < levels.length - 1) {
        return levels[currentIndex + 1];
    }
    return null;
});

// Method: Get all students in this class
ClassSchema.methods.getStudents = async function() {
    const Student = mongoose.model('Student');
    return await Student.find({ 
        class: this.name,
        isActive: true
    });
};

// Method: Get stats
ClassSchema.methods.updateStats = async function() {
    const Student = mongoose.model('Student');
    const students = await Student.find({ 
        class: this.name,
        isActive: true
    });
    
    this.stats.totalStudents = students.length;
    this.stats.activeStudents = students.filter(s => s.isActive).length;
    
    // Count arms
    const arms = new Set();
    students.forEach(s => {
        if (s.arm) arms.add(s.arm);
    });
    this.stats.armsCount = arms.size;
    
    this.arms = Array.from(arms).sort();
    this.updatedAt = new Date();
    
    await this.save();
};

module.exports = mongoose.model('Class', ClassSchema);