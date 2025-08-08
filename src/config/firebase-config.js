// Firebase Configuration for GCC Restore Procedure
// Replace with your actual Firebase project configuration

const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "gcc-restore-procedure.firebaseapp.com",
    databaseURL: "https://gcc-restore-procedure-default-rtdb.firebaseio.com",
    projectId: "gcc-restore-procedure",
    storageBucket: "gcc-restore-procedure.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789012"
};

// Initialize Firebase (will be done in each file that needs it)
// This file just exports the configuration

// For now, we'll use a development mode that falls back to localStorage
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.protocol === 'file:';

export { firebaseConfig, isDevelopment };
