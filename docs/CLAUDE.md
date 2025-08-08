# CLAUDE.md

This file provides guidance to Claude when working with this GCC Restore Procedure repository.

## 🏗️ **Architecture Overview (v2.0)**

This is a **Firebase-powered frontend/backend application** with separated user and admin interfaces:

### **Development Commands**

```bash
# Start local development server
python -m http.server 8000
# or
npm run dev

# Access points:
# User Frontend: http://localhost:8000/
# Admin Dashboard: http://localhost:8000/operator.html
# Development Testing: http://localhost:8000/dev-testing.html
```

### **No Build Process Required**
- Pure HTML/CSS/JavaScript application
- Firebase SDK loaded via CDN
- No bundling or compilation needed
- GitHub Pages compatible

## 🔧 **Architecture Components**

### **Frontend (User Interface)**
- **File**: `index.html` + `user-app.js`
- **Purpose**: User access requests and guided restoration procedures
- **Data**: Real-time Firebase communication via `data-service.js`

### **Backend (Admin Dashboard)**
- **File**: `operator.html` + `admin-app.js` 
- **Purpose**: Administrator approval/denial workflow
- **Features**: Live request monitoring, cross-device sync, audit logging

### **Data Layer**
- **File**: `data-service.js`
- **Primary**: Firebase Realtime Database (free tier)
- **Fallback**: localStorage (development/offline mode)
- **Features**: Real-time updates, audit trails, cross-device sync

## 🧪 **Testing & Development**

### **Built-in Testing Interface**
- **File**: `dev-testing.html`
- **Features**: System status, data testing, Firebase connection testing, multi-user simulation

### **Manual Testing Flow**
1. **User Flow**: `index.html` → QR token → Enter name → Submit request
2. **Admin Flow**: `operator.html` → Login (`gcc2024`) → Approve/deny requests  
3. **Real-time**: Watch updates sync between both interfaces

## 📁 **Key Files**

### **Application Logic**
- `user-app.js` - User interface application logic
- `admin-app.js` - Admin dashboard application logic  
- `data-service.js` - Firebase/localStorage data management
- `firebase-config.js` - Firebase project configuration

### **User Interface**
- `index.html` - User frontend interface
- `operator.html` - Admin dashboard interface
- `style.css` - Main application styles
- `admin-styles.css` - Admin-specific styles

### **Legacy Components** 
- `script.js` - Original restoration procedure logic (still used)
- `simple-backend.js` - Old localStorage system (replaced by data-service.js)

## 🔥 **Firebase Setup**

See `FIREBASE_SETUP.md` for complete instructions. The app works immediately with localStorage fallback, but Firebase enables:
- Real-time cross-device synchronization
- Persistent data storage  
- Multi-admin support
- Comprehensive audit logging

## 🎯 **Development Notes**

- **No build process** - Direct file editing and refresh
- **Automatic fallback** - localStorage when Firebase unavailable
- **Real-time updates** - Both interfaces sync via Firebase
- **GitHub Pages ready** - Static hosting compatible
- **Mobile responsive** - Works on all device sizes

## 🔑 **Testing Credentials**

### **Admin Passwords**
- `gcc2024`, `operator123`, `admin2024`, `restore_admin`

### **QR Access Tokens**
- `gcc_access_2024`, `test_access_token`, `conference_token_valid`

## 📊 **Analytics & Integrations**

- **Google Analytics**: Tracking ID `G-26ZP8BKWYJ`
- **EmailJS**: Service ID `service_pc4qthj` (optional notifications)
- **Font Awesome**: CDN icons
- **Firebase**: Real-time database and hosting

## 🗂️ **Version Control**

Version numbers managed via cache-busting query parameters (`?v=20250108`). The new architecture eliminates the need for complex versioning as Firebase handles data synchronization.