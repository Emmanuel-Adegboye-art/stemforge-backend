// Back-End/src/models/Student.js
const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    // ============================================
    // BASIC IDENTIFICATION
    // ============================================
    studentId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        description: 'Auto-generated ID (e.g., J1A001)'
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    
    // ============================================
    // CLASS & ARM
    // ============================================
    class: {
        type: String,
        required: true,
        trim: true
    },
    arm: {
        type: String,
        trim: true,
        default: null
    },
    currentClass: {
        type: String,
        trim: true
    },
    
    // ============================================
    // DEMOGRAPHICS
    // ============================================
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },
    dateOfBirth: {
        type: Date,
        default: null
    },
    age: {
        type: Number,
        min: 3,
        max: 25
    },
    
    // ============================================
    // PARENT / GUARDIAN
    // ============================================
    parentName: {
        type: String,
        trim: true
    },
    parentPhone: {
        type: String,
        trim: true
    },
    parentEmail: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    
    // ============================================
    // ADDRESS
    // ============================================
    address: {
        type: String,
        trim: true
    },
    
    // ============================================
    // ACADEMIC / ENROLLMENT
    // ============================================
    enrolledDate: {
        type: Date,
        default: Date.now
    },
    
    // ============================================
    // CLASS HISTORY (for upgrades)
    // ============================================
    classHistory: [{
        from: {
            type: String,
            trim: true
        },
        fromArm: {
            type: String,
            trim: true
        },
        to: {
            type: String,
            trim: true
        },
        toArm: {
            type: String,
            trim: true
        },
        movedAt: {
            type: Date,
            default: Date.now
        },
        reason: {
            type: String,
            enum: ['Class Upgrade', 'Rebalancing', 'Request', 'Academic', 'Other'],
            default: 'Other'
        }
    }],
    
    // ============================================
    // STATUS
    // ============================================
    isActive: {
        type: Boolean,
        default: true
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    
    // ============================================
    // METADATA
    // ============================================
    notes: {
        type: String,
        trim: true
    },
    tags: {
        type: [String],
        default: []
    },
    
    // ============================================
    // TIMESTAMPS
    // ============================================
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
    },
    
    // ============================================
    // USER REFERENCE (who created/updated)
    // ============================================
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================
StudentSchema.index({ studentId: 1 });
StudentSchema.index({ fullName: 1 });
StudentSchema.index({ class: 1 });
StudentSchema.index({ class: 1, arm: 1 });
StudentSchema.index({ isActive: 1 });
StudentSchema.index({ enrolledDate: -1 });

// ============================================
// VIRTUALS
// ============================================
StudentSchema.virtual('classDisplay').get(function() {
    return this.arm ? `${this.class} ${this.arm}` : this.class;
});

StudentSchema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Move student to a new class/arm
 */
StudentSchema.methods.moveTo = async function(targetClass, targetArm = null, reason = 'Other') {
    const oldClass = this.class;
    const oldArm = this.arm;
    
    // Record history
    if (!this.classHistory) this.classHistory = [];
    this.classHistory.push({
        from: oldClass,
        fromArm: oldArm,
        to: targetClass,
        toArm: targetArm,
        movedAt: new Date(),
        reason: reason
    });
    
    // Update student
    this.class = targetClass;
    this.arm = targetArm;
    this.currentClass = targetArm ? `${targetClass} ${targetArm}` : targetClass;
    this.updatedAt = new Date();
    
    await this.save();
    return this;
};

/**
 * Upgrade student to next class
 */
StudentSchema.methods.upgrade = async function(targetClass, keepArm = true) {
    return await this.moveTo(targetClass, keepArm ? this.arm : null, 'Class Upgrade');
};

/**
 * Archive student (soft delete)
 */
StudentSchema.methods.archive = async function() {
    this.isActive = false;
    this.isArchived = true;
    this.archivedAt = new Date();
    this.updatedAt = new Date();
    await this.save();
    return this;
};

/**
 * Reactivate student
 */
StudentSchema.methods.reactivate = async function() {
    this.isActive = true;
    this.isArchived = false;
    this.archivedAt = null;
    this.updatedAt = new Date();
    await this.save();
    return this;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Generate next student ID
 */
StudentSchema.statics.generateStudentId = async function(className, arm) {
    const prefix = getClassCode(className) + getArmCode(arm);
    
    // Find the highest existing ID with this prefix
    const existing = await this.findOne(
        { studentId: { $regex: `^${prefix}` } },
        { studentId: 1 },
        { sort: { studentId: -1 } }
    );
    
    let nextNum = 1;
    if (existing) {
        const numPart = existing.studentId.substring(prefix.length);
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed)) nextNum = parsed + 1;
    }
    
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
};

/**
 * Get all students in a class
 */
StudentSchema.statics.getByClass = async function(className, includeInactive = false) {
    const query = { class: className };
    if (!includeInactive) query.isActive = true;
    return await this.find(query).sort({ fullName: 1 });
};

/**
 * Get all students in a class and arm
 */
StudentSchema.statics.getByClassAndArm = async function(className, arm) {
    return await this.find({ 
        class: className, 
        arm: arm,
        isActive: true 
    }).sort({ fullName: 1 });
};

/**
 * Get students by class with stats
 */
StudentSchema.statics.getStatsByClass = async function(className) {
    const students = await this.find({ class: className, isActive: true });
    
    return {
        total: students.length,
        arms: students.reduce((acc, s) => {
            const key = s.arm || 'Unassigned';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {}),
        gender: students.reduce((acc, s) => {
            acc[s.gender] = (acc[s.gender] || 0) + 1;
            return acc;
        }, {})
    };
};

// ============================================
// HELPERS
// ============================================

function getClassCode(className) {
    // JSS 1 -> J1, SS 1 -> S1, Grade 1 -> G1, etc.
    if (className.startsWith('JSS')) {
        const num = className.replace('JSS', '').trim();
        return `J${num}`;
    }
    if (className.startsWith('SS')) {
        const num = className.replace('SS', '').trim();
        return `S${num}`;
    }
    if (className.startsWith('Grade')) {
        const num = className.replace('Grade', '').trim();
        return `G${num}`;
    }
    // Fallback: take first letter + first number
    const match = className.match(/([A-Za-z]+)\s*(\d+)/);
    if (match) {
        return match[1].charAt(0).toUpperCase() + match[2];
    }
    return 'X';
}

function getArmCode(arm) {
    if (!arm) return '';
    if (arm.length === 1) return arm.toUpperCase();
    // Gold -> G, Silver -> S, Diamond -> D
    return arm.charAt(0).toUpperCase();
}

// ============================================
// MIDDLEWARE: Auto-generate fullName
// ============================================
StudentSchema.pre('save', function(next) {
    if (this.firstName && this.lastName) {
        this.fullName = `${this.firstName} ${this.lastName}`.trim();
    }
    this.currentClass = this.arm ? `${this.class} ${this.arm}` : this.class;
    this.updatedAt = new Date();
    next();
});

// ============================================
// TO JSON TRANSFORM
// ============================================
StudentSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret.__v;
        return ret;
    }
});

StudentSchema.set('toObject', {
    virtuals: true
});

module.exports = mongoose.model('Student', StudentSchema);