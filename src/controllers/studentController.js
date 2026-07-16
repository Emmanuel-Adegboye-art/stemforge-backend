const Student = require('../models/Student');

exports.getAllStudents = async (req, res, next) => {
    try {
        const students = await Student.find({ active: true }).sort('id');
        res.json({ data: students });
    } catch (error) {
        next(error);
    }
};

exports.getStudentsByClass = async (req, res, next) => {
    try {
        const { className } = req.params;
        const students = await Student.find({ 
            className, 
            active: true 
        }).sort('id');
        
        res.json({ data: students });
    } catch (error) {
        next(error);
    }
};

exports.addStudent = async (req, res, next) => {
    try {
        const { className, name } = req.body;
        
        if (!className || !name) {
            return res.status(400).json({ 
                error: { message: 'Class and name are required' } 
            });
        }
        
        const student = new Student({ className, name });
        await student.save();
        
        res.status(201).json({ data: student });
    } catch (error) {
        next(error);
    }
};

exports.updateStudent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const student = await Student.findOneAndUpdate(
            { id },
            updates,
            { new: true, runValidators: true }
        );
        
        if (!student) {
            return res.status(404).json({ 
                error: { message: 'Student not found' } 
            });
        }
        
        res.json({ data: student });
    } catch (error) {
        next(error);
    }
};

exports.deleteStudent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const student = await Student.findOneAndUpdate(
            { id },
            { active: false },
            { new: true }
        );
        
        if (!student) {
            return res.status(404).json({ 
                error: { message: 'Student not found' } 
            });
        }
        
        res.json({ data: { message: 'Student deactivated' } });
    } catch (error) {
        next(error);
    }
};
