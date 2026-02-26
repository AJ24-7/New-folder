// config/firebase.js
// Firebase Admin SDK initialization
const admin = require('firebase-admin');

let firebaseInitialized = false;
let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 * Uses FIREBASE_SERVICE_ACCOUNT_JSON env var (full JSON string)
 * or individual credential env vars as fallback
 */
function initializeFirebase() {
  if (firebaseInitialized && firebaseApp) {
    return firebaseApp;
  }

  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      firebaseApp = admin.apps[0];
      firebaseInitialized = true;
      console.log('✅ Firebase Admin SDK already initialized');
      return firebaseApp;
    }

    let serviceAccount = null;

    // Option 1: Full service account JSON as string in env var (recommended for production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        console.log('🔑 Firebase: Using service account from FIREBASE_SERVICE_ACCOUNT_JSON env var');
      } catch (parseError) {
        console.error('❌ Firebase: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', parseError.message);
      }
    }

    // Option 2: Try to load from local file (development only)
    if (!serviceAccount) {
      try {
        const path = require('path');
        const fs = require('fs');
        const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
        
        if (fs.existsSync(serviceAccountPath)) {
          serviceAccount = require('./firebase-service-account.json');
          console.log('🔑 Firebase: Using service account from local file');
        }
      } catch (fileError) {
        // File doesn't exist, continue
      }
    }

    // Option 3: Build service account from individual env vars
    if (!serviceAccount) {
      if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_CLIENT_EMAIL
      ) {
        serviceAccount = {
          type: 'service_account',
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID || '',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || '',
        };
        console.log('🔑 Firebase: Using service account from individual env vars');
      }
    }

    if (!serviceAccount) {
      console.warn('⚠️  Firebase: No service account credentials found.');
      console.warn('⚠️  Push notifications will be disabled.');
      console.warn('⚠️  Set FIREBASE_SERVICE_ACCOUNT_JSON in .env to enable push notifications.');
      return null;
    }

    // Initialize Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID,
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log(`📱 Firebase Project: ${serviceAccount.project_id}`);
    return firebaseApp;

  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    console.warn('⚠️  Push notifications will be disabled.');
    return null;
  }
}

/**
 * Get Firebase Admin instance
 */
function getFirebaseAdmin() {
  if (!firebaseInitialized) {
    initializeFirebase();
  }
  return firebaseInitialized ? admin : null;
}

/**
 * Get Firebase Messaging instance
 */
function getFirebaseMessaging() {
  const adminInstance = getFirebaseAdmin();
  if (!adminInstance) return null;
  
  try {
    return adminInstance.messaging();
  } catch (error) {
    console.error('❌ Error getting Firebase Messaging:', error.message);
    return null;
  }
}

module.exports = {
  initializeFirebase,
  getFirebaseAdmin,
  getFirebaseMessaging,
};
