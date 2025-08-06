# GCC Restore Procedure - Real-Time Access Control System

A progressive web application for guided conference center system recovery with real-time admin approval workflow.

## 🌐 GitHub Pages Demo

**Live Demo**: https://hgse-itav.github.io/GCC_RestoreProcdure/

⚠️ **Important**: The GitHub Pages version shows the UI components but **WebSocket functionality is not available** since GitHub Pages only serves static files.

## 🚀 Full Local Testing

For complete real-time functionality including WebSocket approval system:

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/HGSE-ITAV/GCC_RestoreProcdure.git
   cd GCC_RestoreProcdure
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the WebSocket server**:
   ```bash
   node server.js
   ```

4. **Open your browser and navigate to**:
   - **Main App**: http://localhost:8000/
   - **Admin Dashboard**: http://localhost:8000/admin.html
   - **QR Generator**: http://localhost:8000/qr-generator.html

## 🔄 How the Real-Time System Works

### Option B: Real-Time Admin Approval Flow

1. **Admin Setup**: 
   - Admin opens the dashboard at `http://localhost:8000/admin.html`
   - Generates QR code using `http://localhost:8000/qr-generator.html`

2. **User Request**:
   - User scans QR code (pointing to `http://localhost:8000/?request=access`)
   - App automatically sends access request to admin via WebSocket

3. **Admin Approval**:
   - Admin receives real-time notification with user details
   - Admin approves/denies with one click
   - System generates secure 6-digit code for approved requests

4. **User Access**:
   - User receives approval notification and code entry prompt
   - After entering valid code, user gets 30-minute access to the system
   - Sessions automatically expire and clean up

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