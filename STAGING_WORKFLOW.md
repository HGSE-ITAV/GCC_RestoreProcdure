# GCC Restore Procedure - Development & Staging Workflow

## 🏗️ **Server Architecture**

### Development Server (Port 8000)
- **Purpose**: Active development and testing
- **URL**: http://172.17.130.85:8000
- **Directory**: `/home/jared/app_dev/GCC_RestoreProcdure`
- **Access**: Local development only

### Staging Server (Port 8001)  
- **Purpose**: Share stable versions for team testing
- **URL**: http://172.17.130.85:8001
- **Directory**: `/home/jared/app_dev/GCC_RestoreProcdure_staging`
- **Access**: Network accessible for team testing

## 🔄 **Workflow Commands**

### Quick Server Management
```bash
# Check server status
./server_manager.sh status

# Deploy current code to staging
./server_manager.sh deploy-staging

# Start development server
./server_manager.sh start-dev

# Stop all servers
./server_manager.sh stop-all
```

### Manual Deployment
```bash
# Deploy to staging with automatic versioning
python3 deploy_staging.py

# Update versions only (development)
python3 update_version.py
```

## 🚀 **Development Workflow**

### 1. **Daily Development**
- Work in the main folder: `/home/jared/app_dev/GCC_RestoreProcdure`
- Test on development server: http://172.17.130.85:8000
- Make changes, test immediately

### 2. **Share with Team**
```bash
./server_manager.sh deploy-staging
```
- This copies your code to staging
- Updates cache-busting versions automatically  
- Starts staging server on port 8001
- Share: http://172.17.130.85:8001

### 3. **Version Management**
- **Development**: Manual versions with `update_version.py`
- **Staging**: Automatic timestamp-based versions
- **Production**: Manual deployment to master branch

## 📱 **Network Access**

### Team Testing URLs
- **Development**: http://172.17.130.85:8000 (your work-in-progress)
- **Staging**: http://172.17.130.85:8001 (stable for team testing)

### Mobile Testing
Both URLs work on mobile devices connected to the same network.

## 🔧 **File Structure**

```
GCC_RestoreProcdure/           # Development folder
├── index.html                 # Main app file
├── script.js                  # Application logic  
├── style.css                  # Styling
├── sw.js                      # Service worker
├── images/                    # Optimized images
├── deploy_staging.py          # Staging deployment
├── server_manager.sh          # Server management
└── update_version.py          # Version management

GCC_RestoreProcdure_staging/   # Auto-generated staging
├── index.html                 # Staged version
├── script.js                  # (with updated versions)
├── style.css                  
├── sw.js                      # (staging cache names)
└── images/                    # Copied images
```

## ⚡ **Quick Reference**

| Task | Command |
|------|---------|
| Check servers | `./server_manager.sh status` |
| Deploy to staging | `./server_manager.sh deploy-staging` |
| Development URL | http://172.17.130.85:8000 |
| Staging URL | http://172.17.130.85:8001 |
| Update dev versions | `python3 update_version.py` |

## 🎯 **Benefits**

✅ **Isolated Development**: Work without affecting team testing  
✅ **Easy Sharing**: One command deploys to staging  
✅ **Automatic Versioning**: No manual cache-busting for staging  
✅ **Network Access**: Team can test on any device  
✅ **Production Ready**: Easy path to production deployment
