# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This is a client-side Progressive Web Application with no build process or dependencies. To run locally:

```bash
# Start the WebSocket server for real-time functionality
node simple-backend.js

# Open in browser
# Main App: http://localhost:8000/
# Admin Dashboard: http://localhost:8000/operator.html  
# QR Generator: http://localhost:8000/qr-generator.html
```

No build, lint, or test commands exist - this is a vanilla HTML/CSS/JS application.

## Architecture Overview

**GCC Restore Procedure** is a real-time access control system for guided conference center system recovery. It's designed as a Progressive Web Application with offline capability.

### Core Components

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+) with no frameworks
- **Real-time Communication**: WebSocket-based approval system via `simple-backend.js`
- **Authentication**: Token-based system with QR code access requests
- **Storage**: LocalStorage for simple backend simulation
- **PWA Features**: Service worker (`sw.js`), manifest, offline capability

### Key Files

- `index.html` - Main restoration procedure app with step-by-step guides
- `operator.html` - Real-time admin dashboard for approving/denying access requests
- `qr-generator.html` - Generates QR codes for access request URLs
- `simple-backend.js` - LocalStorage-based backend simulation for cross-network sharing
- `script.js` - Main application logic with authentication and WebSocket communication
- `style.css` - Terminal/CRT aesthetic styling
- `sw.js` - Service worker for PWA offline functionality

### Authentication Flow

1. **Request Access**: User scans QR code pointing to `?request=access`
2. **Admin Approval**: Real-time WebSocket notification to operator dashboard
3. **Token Generation**: Secure 6-digit code generated for approved requests  
4. **Session Management**: 30-minute expiring sessions with automatic cleanup

### Data Flow

- **Simple Backend**: Uses LocalStorage + sharing instructions for cross-network requests
- **Real-time Updates**: WebSocket bidirectional communication between user and operator
- **Security**: Cryptographically secure access codes, session timeouts, admin oversight

### Special Features

- **CRT/Terminal Aesthetic**: Retro green-on-black styling with scan lines and effects
- **Analytics Integration**: Google Analytics tracking for usage metrics
- **Email Notifications**: EmailJS integration for QR scan alerts
- **Image Assets**: Restoration procedure diagrams in `/images/` directory

## Integration Points

- **EmailJS**: Configured with service ID `service_pc4qthj` for notifications
- **Google Analytics**: Tracking ID `G-26ZP8BKWYJ` for usage analytics
- **CDN Dependencies**: Font Awesome icons, EmailJS browser SDK

## Version Control

Version numbers are managed via cache-busting query parameters (e.g., `?v=20250106`) on CSS/JS files. The `update_version.py` script handles version bumping across files.