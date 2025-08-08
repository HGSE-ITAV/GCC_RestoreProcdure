# GCC Restore Procedure - Firebase-Powered Frontend/Backend System

A progressive web application for guided conference center system recovery with **real-time admin approval workflow** powered by Firebase Realtime Database.

## �️ **New Architecture (v2.0)**

### **Frontend (User Interface)**
- **File**: `index.html` + `user-app.js`
- **Purpose**: User access requests and restore procedure
- **Features**: QR authentication, real-time status updates, guided restoration steps

### **Backend (Admin Dashboard)** 
- **File**: `operator.html` + `admin-app.js`
- **Purpose**: Administrator approval/denial interface
- **Features**: Live request monitoring, approval workflow, audit logging

### **Data Layer**
- **File**: `data-service.js`
- **Primary**: Firebase Realtime Database (free tier)
- **Fallback**: localStorage (development/offline)
- **Features**: Real-time sync, cross-device updates, audit trails

## 🌐 **Live Demo**

**User Frontend**: https://hgse-itav.github.io/GCC_RestoreProcdure/
**Admin Dashboard**: https://hgse-itav.github.io/GCC_RestoreProcdure/operator.html
**Development Testing**: https://hgse-itav.github.io/GCC_RestoreProcdure/dev-testing.html

### **Testing the System**
1. Open **User Frontend** → Enter your name → Submit request
2. Open **Admin Dashboard** (password: `gcc2024`) → Approve/deny requests
3. Watch **real-time updates** between both interfaces

## 🚀 **Quick Setup**

### **Option 1: Use GitHub Pages (Immediate)**
- Works immediately with localStorage
- No setup required
- Perfect for testing and development

### **Option 2: Add Firebase (Real-time sync)**
1. Follow instructions in `FIREBASE_SETUP.md`
2. Update `firebase-config.js` with your project config
3. Deploy to GitHub Pages

### **Option 3: Local Development**
```bash
# Clone and serve locally
git clone https://github.com/HGSE-ITAV/GCC_RestoreProcdure.git
cd GCC_RestoreProcdure
python -m http.server 8000
# or
npm run dev
```

Open: http://localhost:8000/

## 🧪 **Testing & Development**

### **Built-in Testing Interface**
Visit: `/tools/dev-testing.html` for comprehensive testing tools:
- System status monitoring
- Data service testing  
- Firebase connection testing
- Multi-user simulation
- Real-time sync testing

2. **Generate QR Codes**: Visit `/tools/qr-generator.html`

### **Manual Testing Flow**
1. **User Flow**: `index.html` → Enter name → Submit request
2. **Admin Flow**: `operator.html` → Login (`gcc2024`) → Approve/deny
3. **Watch real-time updates** between both interfaces

### **Testing Passwords**
- **Admin Dashboard**: `gcc2024`, `operator123`, `admin2024`
- **QR Tokens**: `gcc_access_2024`, `test_access_token`

## 🔄 **How the Real-Time System Works**

### **User → Admin Flow**
1. **User Access**: Scans QR code → Enters name → Submits request
2. **Real-time Sync**: Request appears instantly in admin dashboard
3. **Admin Action**: Approves/denies → User sees update in real-time
4. **Procedure Access**: If approved and granted → User proceeds to restoration

### **Architecture Components**

#### **Frontend (`index.html` + `user-app.js`)**
- QR code authentication system
- Real-time Firebase communication for access requests
- Step-by-step restoration procedures
- Progressive Web App with offline capability

#### **Backend (`operator.html` + `admin-app.js`)**
- Real-time request monitoring via Firebase
- Live approval/denial workflow
- Multi-admin support with audit logging
- Cross-device synchronization

#### **Data Layer (`data-service.js`)**
- Firebase Realtime Database integration
- Automatic localStorage fallback
- Cross-device real-time synchronization
- Audit trail and session management

## 🔒 **Security Features**

- Firebase security rules (configurable)
- Session-based access control
- QR code token validation
- Admin authentication system
- Physical presence requirement via QR scanning
- Comprehensive audit logging

## 🛠️ **Development**

### **File Structure**
```
├── index.html              # User frontend
├── operator.html           # Admin dashboard  
├── dev-testing.html        # Development testing interface
├── user-app.js            # User application logic
├── admin-app.js           # Admin dashboard logic
├── data-service.js        # Firebase/localStorage data layer
├── firebase-config.js     # Firebase configuration
├── style.css              # Main application styling
├── admin-styles.css       # Admin dashboard styles
├── script.js              # Legacy restoration procedure logic
├── manifest.json          # PWA configuration
├── sw.js                  # Service worker
├── FIREBASE_SETUP.md      # Firebase setup instructions
└── images/               # Restoration procedure images
```

### **Technologies Used**
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase Realtime Database
- **Hosting**: GitHub Pages (static hosting)
- **Development**: Python HTTP server
- **Architecture**: Separated frontend/backend with shared data layer

## 📱 Components

### Main Application (`index.html`)
- Token-based authentication system
- Real-time WebSocket communication for access requests
- Step-by-step restoration procedures
- Progressive Web App with offline capability

### Admin Dashboard (`admin.html`)
- Real-time request monitoring
- Live statistics (pending, approved, denied, active sessions)
- One-click approve/deny functionality
- Audio notifications for new requests
- Access code display for approved users

### QR Generator (`qr-generator.html`)
- Generates access request URLs for QR codes
- Simple interface for creating new request links

### WebSocket Server (`server.js`)
- Real-time bidirectional communication
- Request management and validation
- Secure code generation and expiration
- HTTP file serving for all components

## 🔒 Security Features

- Cryptographically secure access code generation
- 30-minute session timeouts with automatic cleanup
- Real-time request validation
- Physical presence requirement via QR scanning
- Admin oversight for all access requests

## 🛠️ Development

### File Structure
```
├── index.html          # Main restoration app
├── script.js           # Application logic
├── style.css           # Styling with CRT effects
├── admin.html          # Real-time admin dashboard
├── qr-generator.html   # QR code URL generator
├── server.js           # WebSocket server
├── package.json        # Node.js dependencies
├── manifest.json       # PWA configuration
├── sw.js              # Service worker
└── images/            # Restoration procedure images
```

### Technologies Used
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js with WebSocket (ws library)
- **Real-time**: WebSocket bidirectional communication
- **PWA**: Service Worker, Web App Manifest
- **Styling**: CSS with terminal/CRT aesthetic

## 📈 Analytics

Google Analytics integration tracks:
- Recovery procedure starts by issue type
- Authentication events
- User engagement metrics
- Security events (approvals, denials)

---

**Note**: This system requires physical presence and admin oversight, making it ideal for secure environments where access control is critical.