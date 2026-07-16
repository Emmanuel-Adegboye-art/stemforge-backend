const Attendance = require('../models/Attendance');

exports.getAttendance = async (req, res, next) => {
    try {
        const { className, date } = req.query;
        const query = { user: req.user.id };
        
        if (className) query.class = className;
        if (date) query.date = date;
        
        const records = await Attendance.find(query)
            .sort('-date')
            .limit(50);
        
        res.json({ data: records });
    } catch (error) {
        next(error);
    }
};

exports.saveAttendance = async (req, res, next) => {
    try {
        const { className, date, students } = req.body;
        
        if (!className || !date || !students) {
            return res.status(400).json({ 
                error: { message: 'Class, date, and students are required' } 
            });
        }
        
        const presentCount = students.filter(s => s.present).length;
        const absentCount = students.length - presentCount;
        
        const record = await Attendance.findOneAndUpdate(
            { user: req.user.id, class: className, date },
            {
                user: req.user.id,
                class: className,
                date,
                students,
                presentCount,
                absentCount
            },
            { upsert: true, new: true }
        );
        
        res.json({ data: record });
    } catch (error) {
        next(error);
    }
};

exports.deleteAttendance = async (req, res, next) => {
    try {
        await Attendance.findOneAndDelete({ 
            _id: req.params.id, 
            user: req.user.id 
        });
        res.json({ data: { message: 'Attendance deleted' } });
    } catch (error) {
        next(error);
    }
};
