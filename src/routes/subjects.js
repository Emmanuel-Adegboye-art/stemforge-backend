const express = require('express');
const router = express.Router();

const SUBJECTS = [
    { id: 'robotics', name: 'Robotics & Automation', icon: '🤖' },
    { id: 'electronics', name: 'Electronics & Circuits', icon: '⚡' },
    { id: 'programming', name: 'Programming for Robotics', icon: '💻' },
    { id: 'mechanics', name: 'Mechanics & Mechanisms', icon: '🔩' },
    { id: 'engineering', name: 'Engineering Design', icon: '🏗️' },
    { id: 'physics', name: 'Physics (Forces & Motion)', icon: '⚛️' },
    { id: 'chemistry', name: 'Chemistry (Materials Science)', icon: '🧪' }
];

router.get('/api/subjects', (req, res) => {
    res.json({ data: SUBJECTS });
});

module.exports = router;
