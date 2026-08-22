import os
import re
import sys
from collections import defaultdict

# Extensions to analyze
TARGET_EXTS = (".js", ".tsx", ".js", ".jsx", ".mjs")

# Directories to ignore
IGNORE_DIRS = {".git", "node_modules", "dist", "build", ".cache", "_audit_backups"}


def normalize_import_path(resolved_path, js_dir):
    """Normalizes paths and strips extensions so 'file.ts' and 'file' map to the same target."""
    rel_path = os.path.relpath(resolved_path, js_dir).replace("\\", "/")
    
    # Strip extension if present to combine 'file.ts' and 'file'
    for ext in TARGET_EXTS:
        if rel_path.endswith(ext):
            return rel_path[:-len(ext)]
    return rel_path


def analyze_imports(js_dir):
    """Analyzes TS/JS files to count import usages and map dependencies."""
    import_counts = defaultdict(int)
    file_dependencies = defaultdict(list)
    all_project_files = set()

    import_pattern = re.compile(
        r'(?:import\s+(?:[\s\w*{},$]+\s+from\s+)?[\'"]([^\'"]+)[\'"]|import\(\s*[\'"]([^\'"]+)[\'"]\s*\))'
    )

    for root, dirs, files in os.walk(js_dir):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in files:
            if file.endswith(TARGET_EXTS):
                file_path = os.path.join(root, file)
                rel_source_file = normalize_import_path(file_path, js_dir)
                all_project_files.add(rel_source_file)

                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()

                    matches = import_pattern.findall(content)

                    for match_group in matches:
                        module_path = next(item for item in match_group if item)

                        if module_path.startswith("."):
                            abs_import_dir = os.path.dirname(file_path)
                            resolved_path = os.path.normpath(os.path.join(abs_import_dir, module_path))
                            target_module = normalize_import_path(resolved_path, js_dir)
                        else:
                            target_module = module_path

                        import_counts[target_module] += 1
                        file_dependencies[rel_source_file].append(target_module)

                except Exception as e:
                    print(f"[Warning] Failed to read {file_path}: {e}")

    # Find unused/orphan internal files (excluding entry points)
    unused_files = [
        f for f in all_project_files 
        if import_counts[f] == 0 and not f.endswith("index") and "main" not in f and "vite.config" not in f
    ]

    sorted_counts = sorted(import_counts.items(), key=lambda x: x[1], reverse=True)
    return sorted_counts, file_dependencies, sorted(unused_files)


def print_dependency_report(js_dir):
    """Prints a formatted report of import frequencies and file dependencies."""
    abs_target_dir = os.path.abspath(js_dir)

    if not os.path.exists(abs_target_dir):
        print(f"[Error] Directory '{abs_target_dir}' does not exist.")
        sys.exit(1)

    print("=" * 60)
    print(" DEPENDENCY GRAPH ANALYSIS")
    print(f" Target Directory: {abs_target_dir}")
    print("=" * 60)

    sorted_counts, file_deps, unused_files = analyze_imports(abs_target_dir)

    if not sorted_counts:
        print("\nNo JavaScript or TypeScript import statements found.")
        print("=" * 60)
        return

    # Categorize internal vs external
    internal_imports = [item for item in sorted_counts if item[0].startswith(".") or "/" in item[0]]
    external_imports = [item for item in sorted_counts if item not in internal_imports]

    print(f"\n[MOST IMPORTED INTERNAL MODULES] ({len(internal_imports)} unique targets):")
    for mod, count in internal_imports[:15]:
        print(f"  - {mod:<45} (imported {count}x)")

    print(f"\n[EXTERNAL NPM PACKAGES USED] ({len(external_imports)} found):")
    for pkg, count in external_imports:
        print(f"  - {pkg:<45} (imported {count}x)")

    print(f"\n[POTENTIALLY UNUSED / ORPHAN FILES] ({len(unused_files)} found):")
    if unused_files:
        for uf in unused_files[:15]:
            print(f"  - {uf}")
        if len(unused_files) > 15:
            print(f"  ... and {len(unused_files) - 15} more orphan files.")
    else:
        print("  None! All internal files are imported at least once.")

    print("\n[FILE DEPENDENCY BREAKDOWN]:")
    for source_file, targets in sorted(file_deps.items())[:10]:
        print(f"  {source_file}")
        for t in targets:
            # Replaced Unicode └── with standard ASCII |-> to prevent CP1252 crash
            print(f"    |-> {t}")

    if len(file_deps) > 10:
        print(f"  ... and {len(file_deps) - 10} more files.")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    target_directory = sys.argv[1] if len(sys.argv) > 1 else "."
    print_dependency_report(target_directory)