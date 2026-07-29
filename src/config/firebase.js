// Back-End/src/config/firebase.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
                ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
                : process.env.FIREBASE_SERVICE_ACCOUNT;

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('🔥 Firebase Admin initialized via service account JSON');
        } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID || 'stem-forge',
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey
                })
            });
            console.log('🔥 Firebase Admin initialized via env variables');
        } else {
            // Default project initialization
            admin.initializeApp({
                projectId: process.env.FIREBASE_PROJECT_ID || 'stem-forge'
            });
            console.log('🔥 Firebase Admin initialized with default config');
        }
    } catch (error) {
        console.warn('⚠️ Firebase Admin SDK initialization warning:', error.message);
    }
}

let db = null;
try {
    db = admin.firestore();
} catch (e) {
    db = null;
}

module.exports = { admin, db };
