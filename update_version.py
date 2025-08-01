#!/usr/bin/env python3
"""
Cache-busting version updater for GCC Restore Procedure
This script updates version numbers in HTML files and service worker cache names
to ensure users get the latest version of the application.
"""

import re
import time
from pathlib import Path

def update_html_versions(html_file, new_version):
    """Update version parameters in HTML file"""
    content = html_file.read_text()
    
    # Update CSS version
    content = re.sub(r'href="style\.css\?v=[\d\.]+"', f'href="style.css?v={new_version}"', content)
    
    # Update JS version
    content = re.sub(r'src="script\.js\?v=[\d\.]+"', f'src="script.js?v={new_version}"', content)
    
    html_file.write_text(content)
    print(f"Updated {html_file.name} to version {new_version}")

def update_service_worker_cache(sw_file, new_cache_version):
    """Update cache name in service worker"""
    content = sw_file.read_text()
    
    # Update cache version
    content = re.sub(r"const CACHE_NAME = 'recovery-checklist-cache-v\d+';", 
                    f"const CACHE_NAME = 'recovery-checklist-cache-v{new_cache_version}';", 
                    content)
    
    sw_file.write_text(content)
    print(f"Updated {sw_file.name} cache to version {new_cache_version}")

def main():
    """Main function to update all version numbers"""
    # Get current timestamp for unique versioning
    version = str(int(time.time()))[-6:]  # Use last 6 digits of timestamp
    cache_version = int(time.time()) // 100  # Cache version changes less frequently
    
    current_dir = Path(__file__).parent
    
    # Update HTML file
    html_file = current_dir / "index.html"
    if html_file.exists():
        update_html_versions(html_file, version)
    else:
        print(f"Warning: {html_file} not found")
    
    # Update service worker
    sw_file = current_dir / "sw.js"
    if sw_file.exists():
        update_service_worker_cache(sw_file, cache_version)
    else:
        print(f"Warning: {sw_file} not found")
    
    print(f"\nCache-busting update complete!")
    print(f"Asset version: {version}")
    print(f"Cache version: {cache_version}")
    print("\nTo deploy these changes:")
    print("1. git add .")
    print("2. git commit -m 'Update cache-busting versions'")
    print("3. git push origin master")

if __name__ == "__main__":
    main()
