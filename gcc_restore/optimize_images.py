#!/usr/bin/env python3
"""
Image optimization script for GCC Restore Procedure
Reduces file sizes while maintaining quality for web use
"""

import os
from PIL import Image, ImageOps
import sys

def optimize_image(input_path, output_path, max_width=800, quality=85):
    """
    Optimize an image by resizing and compressing
    
    Args:
        input_path: Path to the original image
        output_path: Path to save the optimized image
        max_width: Maximum width in pixels (default 800)
        quality: JPEG quality 1-100 (default 85)
    """
    try:
        # Open the image
        with Image.open(input_path) as img:
            print(f"Processing: {input_path}")
            print(f"  Original size: {img.size} ({os.path.getsize(input_path) / 1024 / 1024:.2f} MB)")
            
            # Convert to RGB if necessary (handles RGBA, etc.)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # Calculate new size maintaining aspect ratio
            width, height = img.size
            if width > max_width:
                new_width = max_width
                new_height = int((height * max_width) / width)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                print(f"  Resized to: {img.size}")
            
            # Optimize and save
            if input_path.lower().endswith(('.jpg', '.jpeg')):
                img.save(output_path, 'JPEG', quality=quality, optimize=True)
            elif input_path.lower().endswith('.png'):
                # For PNG, use optimize and reduce colors if possible
                img.save(output_path, 'PNG', optimize=True)
            else:
                # Default to JPEG for other formats
                output_path = output_path.rsplit('.', 1)[0] + '.jpg'
                img.save(output_path, 'JPEG', quality=quality, optimize=True)
            
            # Show final size
            final_size = os.path.getsize(output_path) / 1024 / 1024
            original_size = os.path.getsize(input_path) / 1024 / 1024
            reduction = ((original_size - final_size) / original_size) * 100
            
            print(f"  Final size: {final_size:.2f} MB")
            print(f"  Reduction: {reduction:.1f}%")
            print()
            
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

def main():
    images_dir = "images"
    
    # Create backup directory
    backup_dir = "images_backup"
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    # List of images to optimize
    image_files = [
        "AV_Subnet-POE-Devices.jpg",
        "DSP_Stack.jpg", 
        "RG17.png",
        "Video_Switch.jpg"
        # qr.png is already small (541 bytes)
    ]
    
    print("=== Image Optimization for GCC Restore Procedure ===\n")
    
    for filename in image_files:
        input_path = os.path.join(images_dir, filename)
        backup_path = os.path.join(backup_dir, filename)
        
        if os.path.exists(input_path):
            # Create backup
            import shutil
            shutil.copy2(input_path, backup_path)
            print(f"Backup created: {backup_path}")
            
            # Optimize the image
            optimize_image(input_path, input_path, max_width=800, quality=85)
        else:
            print(f"File not found: {input_path}")
    
    print("=== Optimization Complete ===")
    print("Original images backed up to images_backup/")

if __name__ == "__main__":
    main()
