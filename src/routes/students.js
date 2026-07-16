const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const studentController = require('../controllers/studentController');

router.get('/api/students', authenticate, studentController.getAllStudents);
router.get('/api/students/class/:className', authenticate, studentController.getStudentsByClass);
router.post('/api/students', authenticate, studentController.addStudent);
router.put('/api/students/:id', authenticate, studentController.updateStudent);
router.delete('/api/students/:id', authenticate, studentController.deleteStudent);

module.exports = router;
