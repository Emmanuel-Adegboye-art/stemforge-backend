const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

router.get('/api/attendance', authenticate, attendanceController.getAttendance);
router.post('/api/attendance', authenticate, attendanceController.saveAttendance);
router.delete('/api/attendance/:id', authenticate, attendanceController.deleteAttendance);

module.exports = router;
