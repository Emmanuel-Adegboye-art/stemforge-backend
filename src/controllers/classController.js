// Back-End/src/controllers/classController.js
const Class = require('../models/Class');
const Student = require('../models/Student');

// ============================================
// GET ALL CLASSES
// ============================================
async function getAllClasses(req, res) {
    try {
        const classes = await Class.find({ isArchived: false })
            .sort({ name: 1 });
        
        res.json({
            success: true,
            data: classes,
            count: classes.length
        });
    } catch (error) {
        console.error('Get all classes error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch classes' }
        });
    }
}

// ============================================
// GET CLASS BY ID
// ============================================
async function getClassById(req, res) {
    try {
        const { id } = req.params;
        const classData = await Class.findById(id);
        
        if (!classData) {
            return res.status(404).json({
                success: false,
                error: { message: 'Class not found' }
            });
        }
        
        res.json({
            success: true,
            data: classData
        });
    } catch (error) {
        console.error('Get class error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch class' }
        });
    }
}

// ============================================
// CREATE CLASS
// ============================================
async function createClass(req, res) {
    try {
        const { name, level, arms = ['A', 'B', 'C'] } = req.body;
        
        // Check if class already exists
        const existing = await Class.findOne({ name });
        if (existing) {
            return res.status(400).json({
                success: false,
                error: { message: `Class "${name}" already exists` }
            });
        }
        
        const newClass = new Class({
            name,
            level: level || null,
            arms: arms,
            createdBy: req.user?.id || null
        });
        
        await newClass.save();
        
        res.status(201).json({
            success: true,
            data: newClass,
            message: `Class "${name}" created successfully`
        });
    } catch (error) {
        console.error('Create class error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to create class' }
        });
    }
}

// ============================================
// UPDATE CLASS
// ============================================
async function updateClass(req, res) {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const classData = await Class.findById(id);
        if (!classData) {
            return res.status(404).json({
                success: false,
                error: { message: 'Class not found' }
            });
        }
        
        // Prevent duplicate name
        if (updates.name && updates.name !== classData.name) {
            const existing = await Class.findOne({ name: updates.name });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: { message: `Class "${updates.name}" already exists` }
                });
            }
        }
        
        Object.assign(classData, updates);
        classData.updatedAt = new Date();
        await classData.save();
        
        res.json({
            success: true,
            data: classData,
            message: 'Class updated successfully'
        });
    } catch (error) {
        console.error('Update class error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to update class' }
        });
    }
}

// ============================================
// DELETE CLASS (Soft Delete)
// ============================================
async function deleteClass(req, res) {
    try {
        const { id } = req.params;
        
        const classData = await Class.findById(id);
        if (!classData) {
            return res.status(404).json({
                success: false,
                error: { message: 'Class not found' }
            });
        }
        
        // Check if there are students in this class
        const students = await Student.find({ 
            class: classData.name,
            isActive: true
        });
        
        if (students.length > 0) {
            return res.status(400).json({
                success: false,
                error: { 
                    message: `Cannot delete class with ${students.length} active students. Move or delete students first.`
                }
            });
        }
        
        // Soft delete
        classData.isArchived = true;
        classData.archivedAt = new Date();
        await classData.save();
        
        res.json({
            success: true,
            message: `Class "${classData.name}" deleted successfully`
        });
    } catch (error) {
        console.error('Delete class error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to delete class' }
        });
    }
}

// ============================================
// UPGRADE CLASS
// ============================================
async function upgradeClass(req, res) {
    try {
        const { id } = req.params;
        const { targetClass, keepArms = true } = req.body;
        
        if (!targetClass) {
            return res.status(400).json({
                success: false,
                error: { message: 'Target class is required' }
            });
        }
        
        const sourceClass = await Class.findById(id);
        if (!sourceClass) {
            return res.status(404).json({
                success: false,
                error: { message: 'Source class not found' }
            });
        }
        
        // Get students in source class
        const students = await Student.find({
            class: sourceClass.name,
            isActive: true
        });
        
        if (students.length === 0) {
            return res.status(400).json({
                success: false,
                error: { message: 'No students to upgrade' }
            });
        }
        
        // Ensure target class exists (or create it)
        let targetClassData = await Class.findOne({ name: targetClass });
        if (!targetClassData) {
            targetClassData = new Class({
                name: targetClass,
                arms: keepArms ? [...new Set(students.map(s => s.arm).filter(Boolean))] : ['A', 'B', 'C']
            });
            await targetClassData.save();
        }
        
        // Move students
        const movedStudents = [];
        for (const student of students) {
            const oldClass = student.class;
            const oldArm = student.arm;
            
            student.class = targetClass;
            student.classHistory = student.classHistory || [];
            student.classHistory.push({
                from: oldClass,
                fromArm: oldArm,
                to: targetClass,
                toArm: keepArms ? oldArm : null,
                movedAt: new Date().toISOString(),
                reason: 'Class Upgrade'
            });
            
            // Keep arm if enabled
            if (!keepArms) {
                student.arm = null;
            }
            
            student.updatedAt = new Date();
            await student.save();
            movedStudents.push(student);
        }
        
        // Update stats
        await sourceClass.updateStats();
        await targetClassData.updateStats();
        
        res.json({
            success: true,
            data: {
                sourceClass,
                targetClass: targetClassData,
                movedStudents: movedStudents.length,
                students: movedStudents.map(s => ({ id: s.id, name: s.name }))
            },
            message: `Successfully upgraded ${movedStudents.length} students to "${targetClass}"`
        });
    } catch (error) {
        console.error('Upgrade class error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to upgrade class' }
        });
    }
}

// ============================================
// ADD ARM TO CLASS
// ============================================
async function addArm(req, res) {
    try {
        const { id } = req.params;
        const { arm } = req.body;
        
        if (!arm) {
            return res.status(400).json({
                success: false,
                error: { message: 'Arm name is required' }
            });
        }
        
        const classData = await Class.findById(id);
        if (!classData) {
            return res.status(404).json({
                success: false,
                error: { message: 'Class not found' }
            });
        }
        
        if (classData.arms.includes(arm)) {
            return res.status(400).json({
                success: false,
                error: { message: `Arm "${arm}" already exists in ${classData.name}` }
            });
        }
        
        classData.arms.push(arm);
        classData.updatedAt = new Date();
        await classData.save();
        
        res.json({
            success: true,
            data: classData,
            message: `Arm "${arm}" added to ${classData.name}`
        });
    } catch (error) {
        console.error('Add arm error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to add arm' }
        });
    }
}

// ============================================
// REMOVE ARM FROM CLASS
// ============================================
async function removeArm(req, res) {
    try {
        const { id, arm } = req.params;
        
        const classData = await Class.findById(id);
        if (!classData) {
            return res.status(404).json({
                success: false,
                error: { message: 'Class not found' }
            });
        }
        
        if (!classData.arms.includes(arm)) {
            return res.status(400).json({
                success: false,
                error: { message: `Arm "${arm}" not found in ${classData.name}` }
            });
        }
        
        // Check if there are students in this arm
        const students = await Student.find({
            class: classData.name,
            arm: arm,
            isActive: true
        });
        
        if (students.length > 0) {
            return res.status(400).json({
                success: false,
                error: { 
                    message: `Cannot remove arm with ${students.length} students. Move students first.`
                }
            });
        }
        
        classData.arms = classData.arms.filter(a => a !== arm);
        classData.updatedAt = new Date();
        await classData.save();
        
        res.json({
            success: true,
            data: classData,
            message: `Arm "${arm}" removed from ${classData.name}`
        });
    } catch (error) {
        console.error('Remove arm error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to remove arm' }
        });
    }
}

// ============================================
// GET CLASS STATS
// ============================================
async function getClassStats(req, res) {
    try {
        const { id } = req.params;
        
        const classData = await Class.findById(id);
        if (!classData) {
            return res.status(404).json({
                success: false,
                error: { message: 'Class not found' }
            });
        }
        
        const students = await Student.find({
            class: classData.name,
            isActive: true
        });
        
        const stats = {
            class: classData.name,
            totalStudents: students.length,
            arms: {},
            gender: { Male: 0, Female: 0, Other: 0 },
            parentContacted: 0
        };
        
        students.forEach(student => {
            const arm = student.arm || 'Unassigned';
            if (!stats.arms[arm]) stats.arms[arm] = 0;
            stats.arms[arm]++;
            
            if (student.gender) stats.gender[student.gender] = (stats.gender[student.gender] || 0) + 1;
            if (student.parentPhone || student.parentEmail) stats.parentContacted++;
        });
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get class stats error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to get class stats' }
        });
    }
}

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

module.exports = {
    getAllClasses,
    getClassById,
    createClass,
    updateClass,
    deleteClass,
    upgradeClass,
    addArm,
    removeArm,
    getClassStats
};