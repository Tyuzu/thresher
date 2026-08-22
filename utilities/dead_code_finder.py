import os
import re

def find_unused_assets(root_dir, asset_extensions, src_extensions):
    all_files = []
    for dirpath, _, filenames in os.walk(root_dir):
        for f in filenames:
            all_files.append(os.path.join(dirpath, f))

    assets = [f for f in all_files if f.endswith(asset_extensions)]
    source_files = [f for f in all_files if f.endswith(src_extensions)]

    # Read all source code into memory
    source_content = ""
    for src in source_files:
        try:
            with open(src, "r", encoding="utf-8", errors="ignore") as f:
                source_content += f.read()
        except Exception:
            pass

    unused = []
    for asset in assets:
        asset_name = os.path.basename(asset)
        if asset_name not in source_content:
            unused.append(asset)

    return unused

# Example usage:
# unused = find_unused_assets(".", (".png", ".svg", ".jpg"), (".js", ".js", ".html", ".css"))