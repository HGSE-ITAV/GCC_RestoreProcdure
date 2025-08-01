#!/usr/bin/env python3
"""
Staging Deployment Script for GCC Restore Procedure
This script deploys the development version to a staging server for network testing.
"""

import os
import shutil
import time
import subprocess
import re
from pathlib import Path

# Configuration
DEV_DIR = Path(__file__).parent
STAGING_DIR = Path("/home/jared/app_dev/GCC_RestoreProcdure_staging")
STAGING_PORT = 8001

# Files to copy (exclude development-only files)
INCLUDE_FILES = [
    "index.html",
    "script.js", 
    "style.css",
    "sw.js",
    "manifest.json",
    "icon-192.png",
    "icon-512.png",
    "images/",
    "qr.png"
]

# Files to exclude from staging
EXCLUDE_FILES = [
    "__pycache__",
    "*.pyc",
    ".git",
    ".gitignore",
    "deploy_staging.py",
    "update_version.py",
    "optimize_images.py",
    "images_backup/",
    "*.md"
]

def update_staging_versions(staging_dir):
    """Update version numbers for staging deployment"""
    timestamp = str(int(time.time()))[-6:]
    cache_version = int(time.time()) // 100
    
    # Update HTML file versions
    html_file = staging_dir / "index.html"
    if html_file.exists():
        content = html_file.read_text()
        
        # Update CSS version
        content = re.sub(r'href="style\.css\?v=[\d\.]+"', f'href="style.css?v={timestamp}"', content)
        
        # Update JS version  
        content = re.sub(r'src="script\.js\?v=[\d\.]+"', f'src="script.js?v={timestamp}"', content)
        
        html_file.write_text(content)
        print(f"✓ Updated HTML versions to {timestamp}")
    
    # Update service worker cache version
    sw_file = staging_dir / "sw.js"
    if sw_file.exists():
        content = sw_file.read_text()
        content = re.sub(r"const CACHE_NAME = 'recovery-checklist-cache-v\d+';", 
                        f"const CACHE_NAME = 'recovery-checklist-cache-staging-v{cache_version}';", 
                        content)
        sw_file.write_text(content)
        print(f"✓ Updated service worker cache to staging-v{cache_version}")
    
    return timestamp, cache_version

def copy_files_to_staging():
    """Copy development files to staging directory"""
    print(f"📁 Copying files from {DEV_DIR} to {STAGING_DIR}")
    
    # Clear staging directory
    if STAGING_DIR.exists():
        shutil.rmtree(STAGING_DIR)
    STAGING_DIR.mkdir(exist_ok=True)
    
    copied_count = 0
    
    for item in INCLUDE_FILES:
        src_path = DEV_DIR / item
        dst_path = STAGING_DIR / item
        
        if src_path.exists():
            if src_path.is_dir():
                shutil.copytree(src_path, dst_path)
                print(f"✓ Copied directory: {item}")
            else:
                dst_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src_path, dst_path)
                print(f"✓ Copied file: {item}")
            copied_count += 1
        else:
            print(f"⚠ Warning: {item} not found in development directory")
    
    print(f"📦 Copied {copied_count} items to staging")

def start_staging_server():
    """Start the staging server on a different port"""
    print(f"🚀 Starting staging server on port {STAGING_PORT}")
    
    # Kill any existing server on the staging port
    try:
        result = subprocess.run(['lsof', '-ti', f':{STAGING_PORT}'], 
                               capture_output=True, text=True)
        if result.stdout.strip():
            pid = result.stdout.strip()
            subprocess.run(['kill', pid])
            print(f"✓ Stopped existing server on port {STAGING_PORT}")
            time.sleep(2)
    except Exception as e:
        pass
    
    # Start new staging server
    os.chdir(STAGING_DIR)
    subprocess.Popen(['python3', '-m', 'http.server', str(STAGING_PORT), '--bind', '0.0.0.0'])
    
    # Get IP address
    try:
        result = subprocess.run(['hostname', '-I'], capture_output=True, text=True)
        ip_address = result.stdout.strip().split()[0]
        
        print(f"""
🌟 STAGING SERVER READY! 🌟

Local Access:
  http://localhost:{STAGING_PORT}
  
Network Access:
  http://{ip_address}:{STAGING_PORT}
  
Development Server (port 8000): http://{ip_address}:8000
Staging Server (port {STAGING_PORT}): http://{ip_address}:{STAGING_PORT}

Share the staging URL with others for testing!
        """)
    except Exception as e:
        print(f"Server started on port {STAGING_PORT}")

def main():
    """Main deployment function"""
    print("🔄 DEPLOYING TO STAGING...")
    print("=" * 50)
    
    # Copy files to staging
    copy_files_to_staging()
    
    # Update versions for staging
    version, cache_version = update_staging_versions(STAGING_DIR)
    
    # Start staging server
    start_staging_server()
    
    print("=" * 50)
    print("✅ STAGING DEPLOYMENT COMPLETE!")
    print(f"Asset version: {version}")
    print(f"Cache version: staging-v{cache_version}")
    print("\nYou can now:")
    print("1. Continue developing in the main folder")
    print("2. Share the staging URL with others for testing")
    print("3. Re-run this script to update staging with new changes")

if __name__ == "__main__":
    main()
