// Firebase Configuration for GCC Restore Procedure
// Real Firebase project configuration

const firebaseConfig = {
    apiKey: "AIzaSyACASR1catYMUSmWy3ME4vpryQxdzuSuV0",
    authDomain: "gcc-restore-procedure.firebaseapp.com",
    databaseURL: "https://gcc-restore-procedure-default-rtdb.firebaseio.com",
    projectId: "gcc-restore-procedure",
    storageBucket: "gcc-restore-procedure.firebasestorage.app",
    messagingSenderId: "246909033796",
    appId: "1:246909033796:web:05d7078abb7957c6e60b11",
    measurementId: "G-0LV7ZBP1HZ"
};

// Initialize Firebase (will be done in each file that needs it)
// This file just exports the configuration

// For now, we'll use a development mode that falls back to localStorage
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.protocol === 'file:';

export { firebaseConfig, isDevelopment };
