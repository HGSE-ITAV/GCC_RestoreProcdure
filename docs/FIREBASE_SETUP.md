# Firebase Setup Instructions for GCC Restore Procedure

## 🔥 **Quick Firebase Setup Guide**

### **Step 1: Create Firebase Project**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name: `gcc-restore-procedure`
4. Enable Google Analytics (optional)
5. Click "Create project"

### **Step 2: Enable Realtime Database**
1. In your Firebase project, go to "Realtime Database"
2. Click "Create Database"
3. Start in **test mode** (for now)
4. Choose your region (closest to your users)
5. Click "Done"

### **Step 3: Get Configuration**
1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Web" icon (`</>`)
4. App nickname: `gcc-restore-web`
5. Check "Also set up Firebase Hosting" (optional)
6. Click "Register app"
7. **Copy the config object**

### **Step 4: Update firebase-config.js**
Replace the config in `/firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "gcc-restore-procedure.firebaseapp.com",
    databaseURL: "https://gcc-restore-procedure-default-rtdb.firebaseio.com",
    projectId: "gcc-restore-procedure",
    storageBucket: "gcc-restore-procedure.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789012"
};
```

### **Step 5: Set Database Rules (Optional - for production)**
In Realtime Database > Rules, replace with:

```json
{
  "rules": {
    "requests": {
      ".read": true,
      ".write": true
    },
    "metadata": {
      ".read": true,
      ".write": true
    },
    "audit_log": {
      ".read": true,
      ".write": true
    }
  }
}
```

⚠️ **Note**: These rules allow public access. For production, implement proper authentication.

## 🚀 **Testing Without Firebase**

The app automatically falls back to localStorage if Firebase isn't configured:

1. **Development Mode**: Works with localStorage
2. **Production Mode**: Requires Firebase configuration

## 📊 **Data Structure**

### **Requests Collection**
```
/requests/{requestId}
{
  id: "req_abc123",
  userName: "John Smith",
  timestamp: 1640995200000,
  status: "pending|approved|granted|denied",
  userAgent: "Mozilla/5.0...",
  browserInfo: {...},
  token: "access_token",
  processedAt: 1640995300000,
  processedBy: "admin_id"
}
```

### **Metadata Collection**
```
/metadata
{
  lastUpdated: 1640995200000,
  totalRequests: 42
}
```

### **Audit Log Collection**
```
/audit_log/{logId}
{
  timestamp: 1640995200000,
  requestId: "req_abc123",
  action: "approved",
  adminId: "operator_1",
  details: {...}
}
```

## 🔒 **Security Best Practices**

### **For Production:**

1. **Enable Authentication**
2. **Restrict Database Rules**
3. **Use Environment Variables for config**
4. **Enable API key restrictions**
5. **Monitor usage and set quotas**

### **Current Security Status:**
- ✅ Frontend/Backend separation
- ✅ Input validation
- ✅ Admin authentication (basic)
- ⚠️ Database rules (test mode)
- ⚠️ API key restrictions (not set)

## 🌐 **GitHub Pages Deployment**

Works perfectly with GitHub Pages:
1. Push all files to your repository
2. Enable GitHub Pages in repository settings
3. Configure Firebase (if using)
4. App will work immediately

## 🛠️ **Development Testing**

### **Without Firebase:**
- Uses localStorage
- Full functionality
- No real-time sync between tabs

### **With Firebase:**
- Real-time synchronization
- Persistent data
- Multi-device access
- Audit logging

## 📞 **Support**

If you encounter issues:
1. Check browser console for errors
2. Verify Firebase configuration
3. Ensure network connectivity
4. Check Firebase project status

The app provides detailed console logging for debugging.
