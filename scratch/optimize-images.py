import os
import sys
import subprocess

def install_pillow():
    print("Installing pillow...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])

try:
    from PIL import Image
except ImportError:
    install_pillow()
    from PIL import Image

def optimize_image(file_path, max_size=512):
    try:
        original_size = os.path.getsize(file_path)
        
        # Open the image
        img = Image.open(file_path)
        
        # Get original dimensions
        width, height = img.size
        
        # Calculate new dimensions keeping aspect ratio
        if width > max_size or height > max_size:
            if width > height:
                new_width = max_size
                new_height = int(height * (max_size / width))
            else:
                new_height = max_size
                new_width = int(width * (max_size / height))
            
            # Resize image
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            print(f"Resized {os.path.basename(file_path)} from {width}x{height} to {new_width}x{new_height}")
        
        # Save image compressed
        img.save(file_path, "PNG", optimize=True)
        new_size = os.path.getsize(file_path)
        
        reduction = (original_size - new_size) / original_size * 100
        print(f"Optimized {os.path.basename(file_path)}: {original_size/1024/1024:.2f}MB -> {new_size/1024:.2f}KB ({reduction:.1f}% reduction)")
    except Exception as e:
        print(f"Error optimizing {file_path}: {e}")

def main():
    base_dir = "public/badges"
    
    print("Starting image optimization...")
    
    # Optimize badges
    for file_name in os.listdir(base_dir):
        file_path = os.path.join(base_dir, file_name)
        if os.path.isfile(file_path) and file_name.endswith('.png'):
            optimize_image(file_path, max_size=256)
            
    # Optimize ranks
    ranks_dir = os.path.join(base_dir, "ranks")
    if os.path.exists(ranks_dir):
        for file_name in os.listdir(ranks_dir):
            file_path = os.path.join(ranks_dir, file_name)
            if os.path.isfile(file_path) and file_name.endswith('.png'):
                optimize_image(file_path, max_size=512)

    print("Image optimization complete!")

if __name__ == "__main__":
    main()
