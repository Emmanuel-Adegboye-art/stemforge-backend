// Back-End/src/routes/classes.js
const express = require('express');
const router = express.Router();
const {
    getAllClasses,
    getClassById,
    createClass,
    updateClass,
    deleteClass,
    upgradeClass,
    addArm,
    removeArm,
    getClassStats
} = require('../controllers/classController');
const { authenticate } = require('../middleware/auth');
const { validateClass } = require('../middleware/validateRequest');

// All routes require authentication
router.use(authenticate);

// ============================================
// CLASS ROUTES
// ============================================

// GET all classes
router.get('/', getAllClasses);

// GET class by ID
router.get('/:id', getClassById);

// POST create new class
router.post('/', validateClass, createClass);

// PUT update class
router.put('/:id', validateClass, updateClass);

// DELETE class (soft delete)
router.delete('/:id', deleteClass);

// ============================================
// ARM ROUTES
// ============================================

// POST add arm to class
router.post('/:id/arms', addArm);

// DELETE remove arm from class
router.delete('/:id/arms/:arm', removeArm);

// ============================================
// UPGRADE ROUTES
// ============================================

// POST upgrade class (move all students)
router.post('/:id/upgrade', upgradeClass);

// ============================================
// STATS ROUTES
// ============================================

// GET class statistics
router.get('/:id/stats', getClassStats);

module.exports = router;