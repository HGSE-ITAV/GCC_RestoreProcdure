#!/usr/bin/env python3
"""
Public Deployment Script for GCC Restore Procedure
Deploy staging to GitHub Pages for VPN users
"""

import os
import subprocess
import shutil
from pathlib import Path

def deploy_to_github_pages():
    """Deploy staging to GitHub Pages for public access"""
    
    staging_dir = Path("/home/jared/app_dev/GCC_RestoreProcdure_staging")
    
    if not staging_dir.exists():
        print("❌ Staging directory not found. Run deploy_staging.py first.")
        return
    
    print("🚀 Deploying to GitHub Pages for VPN access...")
    
    # Create gh-pages branch deployment
    try:
        # Copy staging files to a temporary deployment directory
        deploy_dir = Path("./gh-pages-deploy")
        if deploy_dir.exists():
            shutil.rmtree(deploy_dir)
        
        shutil.copytree(staging_dir, deploy_dir)
        
        # Create .nojekyll file for GitHub Pages
        (deploy_dir / ".nojekyll").touch()
        
        print("✅ Files prepared for GitHub Pages deployment")
        print("\nTo complete deployment:")
        print("1. git checkout -b gh-pages")
        print("2. cp -r gh-pages-deploy/* .")
        print("3. git add .")
        print("4. git commit -m 'Deploy to GitHub Pages'")
        print("5. git push origin gh-pages")
        print("\nThen enable GitHub Pages in repository settings.")
        print("VPN users can access via: https://hgse-itav.github.io/GCC_RestoreProcdure/")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    deploy_to_github_pages()
