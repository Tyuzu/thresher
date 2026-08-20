import os
from PIL import Image

def convert_to_webp(directory, quality=80):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.lower().endswith((".png", ".jpg", ".jpeg")):
                img_path = os.path.join(root, file)
                webp_path = os.path.splitext(img_path)[0] + ".webp"
                with Image.open(img_path) as img:
                    img.save(webp_path, "WEBP", quality=quality)
                print(f"Converted: {rel_path} -> {os.path.basename(webp_path)}")