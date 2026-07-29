// Run this ONCE from the Back-End folder:
//    node scripts/create-test-promo.js
// It will add (or overwrite) the document "TESTCODE" in the promoCodes collection.

const admin = require('firebase-admin');
const path = require('path');

// Initialise Admin SDK using your existing service account file
const serviceAccount = require(path.join(__dirname, '..', 'firebase-service-account.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function createTestPromo() {
  const docRef = db.collection('promoCodes').doc('TESTCODE');
  const data = {
    code: 'TESTCODE',
    description: 'Free 3‑day full access (manual test)',
    days: 3,
    uses: 1,
    usedBy: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: null
  };

  await docRef.set(data, { merge: true });
  console.log('✅ Test promo code created/updated in Firestore!');
}

createTestPromo()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error creating test promo:', err);
    process.exit(1);
  });
