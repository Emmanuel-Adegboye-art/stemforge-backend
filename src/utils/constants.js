const CLASS_CODES = {
    'JSS1A': 'J1A', 'JSS1B': 'J1B', 'JSS1C': 'J1C',
    'JSS2A': 'J2A', 'JSS2B': 'J2B', 'JSS2C': 'J2C',
    'JSS3A': 'J3A', 'JSS3B': 'J3B', 'JSS3C': 'J3C',
    'SS1A': 'S1A', 'SS1B': 'S1B', 'SS1C': 'S1C',
    'SS2A': 'S2A', 'SS2B': 'S2B', 'SS2C': 'S2C',
    'SS3A': 'S3A', 'SS3B': 'S3B', 'SS3C': 'S3C'
};

const SUBJECTS = [
    'robotics', 'electronics', 'programming', 
    'mechanics', 'engineering', 'physics', 'chemistry'
];

const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

const TERMS = ['First Term', 'Second Term', 'Third Term'];

const LESSON_MODES = ['lesson-plan', 'lesson-note'];

module.exports = {
    CLASS_CODES,
    SUBJECTS,
    GRADES,
    TERMS,
    LESSON_MODES
};
