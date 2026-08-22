import os
import re
import hashlib
import shutil
from collections import defaultdict

# --- CONFIGURATION ---
PROJECT_ROOT = "."
ASSET_EXTS = (".png", ".jpg", ".jpeg", ".svg", ".webp", ".ico", ".woff", ".woff2", ".ttf")
SOURCE_EXTS = (".js", ".js", ".mjs", ".html", ".css")
STYLE_EXTS = (".css",)
MARKUP_EXTS = (".js", ".js", ".html")

# Paths/Directories to ignore entirely
IGNORE_DIRS = {".git", "node_modules", "dist", "build", ".cache", "_audit_backups"}


def get_all_files(root_dir):
    """Recursively fetch relative file paths, ignoring specified directories."""
    file_list = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for f in filenames:
            rel_path = os.path.relpath(os.path.join(dirpath, f), root_dir)
            file_list.append(rel_path)
    return file_list


def find_unused_assets(all_files, root_dir):
    """Finds image/font assets that are never referenced by filename in source code."""
    assets = [f for f in all_files if f.lower().endswith(ASSET_EXTS)]
    sources = [f for f in all_files if f.lower().endswith(SOURCE_EXTS)]

    source_buffer = ""
    for src in sources:
        try:
            with open(os.path.join(root_dir, src), "r", encoding="utf-8", errors="ignore") as f:
                source_buffer += f.read() + "\n"
        except Exception as e:
            print(f"[Warning] Failed to read {src}: {e}")

    unused = []
    for asset in assets:
        filename = os.path.basename(asset)
        if filename not in source_buffer:
            unused.append(asset)

    return unused


def find_duplicate_files(all_files, root_dir):
    """Finds exact duplicate files across the repository using MD5 hashing."""
    hashes = defaultdict(list)
    
    for rel_path in all_files:
        full_path = os.path.join(root_dir, rel_path)
        if os.path.getsize(full_path) == 0:
            continue
            
        hasher = hashlib.md5()
        try:
            with open(full_path, "rb") as f:
                while chunk := f.read(8192):
                    hasher.update(chunk)
            hashes[hasher.hexdigest()].append(rel_path)
        except Exception as e:
            print(f"[Warning] Could not hash {rel_path}: {e}")

    return {h: paths for h, paths in hashes.items() if len(paths) > 1}


def find_unused_css_classes(all_files, root_dir):
    """Extracts CSS class selectors and checks if they are used in HTML/JS/TS files."""
    style_files = [f for f in all_files if f.lower().endswith(STYLE_EXTS)]
    markup_files = [f for f in all_files if f.lower().endswith(MARKUP_EXTS)]

    markup_buffer = ""
    for m in markup_files:
        try:
            with open(os.path.join(root_dir, m), "r", encoding="utf-8", errors="ignore") as f:
                markup_buffer += f.read() + "\n"
        except Exception:
            pass

    class_pattern = re.compile(r'\.([a-zA-Z0-9_-]+)\s*[\{,:\.]')
    unused_by_file = defaultdict(list)

    for style in style_files:
        try:
            with open(os.path.join(root_dir, style), "r", encoding="utf-8", errors="ignore") as f:
                css_content = f.read()
                classes = set(class_pattern.findall(css_content))
                
                for cls in classes:
                    if cls not in markup_buffer:
                        unused_by_file[style].append(cls)
        except Exception:
            pass

    return unused_by_file


def backup_and_remove_file(rel_path, root_dir, backup_dir):
    """Safely backs up a file before removing it from the project."""
    src_path = os.path.join(root_dir, rel_path)
    dest_path = os.path.join(backup_dir, rel_path)
    
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    shutil.copy2(src_path, dest_path)
    os.remove(src_path)


def clean_unused_css(unused_css_dict, root_dir, backup_dir):
    """Removes unused CSS rules from style files while keeping a backup of originals."""
    for style_file, classes in unused_css_dict.items():
        if not classes:
            continue

        full_path = os.path.join(root_dir, style_file)
        
        # Backup original CSS file first
        dest_path = os.path.join(backup_dir, style_file)
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        shutil.copy2(full_path, dest_path)

        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        # Remove CSS rule blocks for each unused class selector
        for cls in classes:
            pattern = re.compile(r'\.' + re.escape(cls) + r'\s*\{[^}]*\}')
            content = re.sub(pattern, '', content)

        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)


def prune_dead_code(unused_assets, duplicates, unused_css, root_dir):
    """Interactive function to handle removal of unused assets, duplicates, and CSS."""
    backup_dir = os.path.join(root_dir, "_audit_backups")
    
    print("\n" + "=" * 60)
    print(" AUTOMATIC PRUNING & CLEANUP")
    print("=" * 60)
    
    confirm = input("Would you like to automatically clean up these items? (y/N): ").strip().lower()
    if confirm != 'y':
        print("Cleanup aborted. No files were modified.")
        return

    # 1. Remove Unused Assets
    if unused_assets:
        print("\nDeleting unused asset files...")
        for asset in unused_assets:
            backup_and_remove_file(asset, root_dir, backup_dir)
            print(f"  [Removed & Backed Up] {asset}")

    # 2. Remove Duplicate Files (keeps the 1st instance, deletes the rest)
    if duplicates:
        print("\nDeleting duplicate files (keeping 1 copy)...")
        for paths in duplicates.values():
            keep = paths[0]
            remove_list = paths[1:]
            for dup in remove_list:
                backup_and_remove_file(dup, root_dir, backup_dir)
                print(f"  [Removed Duplicate] {dup} (Kept: {keep})")

    # 3. Clean Unused CSS Selectors
    if unused_css:
        print("\nStripping unused CSS class rules...")
        clean_unused_css(unused_css, root_dir, backup_dir)
        for style_file in unused_css.keys():
            print(f"  [Pruned CSS Rules] {style_file}")

    print(f"\nCleanup complete! All modified/deleted original files are backed up in: {backup_dir}")


def run_prune_audit():
    print("=" * 60)
    print(" RUNNING CODEBASE PRUNING & AUDIT TOOL")
    print("=" * 60)

    all_files = get_all_files(PROJECT_ROOT)
    print(f"\nScanned {len(all_files)} total files (excluding ignored dirs).\n")

    # 1. Unused Assets
    unused_assets = find_unused_assets(all_files, PROJECT_ROOT)
    print(f"[UNUSED ASSETS] ({len(unused_assets)} found):")
    if unused_assets:
        for a in unused_assets:
            print(f"  - {a}")
    else:
        print("  None! All asset filenames were found in source code.")

    # 2. Duplicate Files
    duplicates = find_duplicate_files(all_files, PROJECT_ROOT)
    print(f"\n[EXACT DUPLICATE FILES] ({len(duplicates)} sets found):")
    if duplicates:
        for hash_val, paths in duplicates.items():
            print(f"  [MD5: {hash_val[:8]}]")
            for p in paths:
                print(f"    - {p}")
    else:
        print("  None! No duplicate file contents found.")

    # 3. Potentially Unused CSS Classes
    unused_css = find_unused_css_classes(all_files, PROJECT_ROOT)
    total_unused_classes = sum(len(classes) for classes in unused_css.values())
    print(f"\n[POTENTIALLY UNUSED CSS CLASSES] ({total_unused_classes} found across {len(unused_css)} files):")
    if unused_css:
        for style_file, classes in unused_css.items():
            if classes:
                print(f"  - {style_file} ({len(classes)} classes):")
                print(f"    {', '.join(sorted(classes)[:10])}{' ...' if len(classes) > 10 else ''}")
    else:
        print("  None! All CSS classes were matched in your code.")

    # Execute Pruning Logic
    has_issues = unused_assets or duplicates or total_unused_classes > 0
    if has_issues:
        prune_dead_code(unused_assets, duplicates, unused_css, PROJECT_ROOT)

    print("\n" + "=" * 60)


if __name__ == "__main__":
    run_prune_audit()