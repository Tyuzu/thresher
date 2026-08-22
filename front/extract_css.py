import os
import re
import json

TARGET_EXTENSIONS = {'.js', '.jsx', '.ts', '.tsx', '.mjs'}

def extract_element_builder_classes(root_dir):
    unique_classes = set()
    class_counts = {}

    # Pattern 1: Matches class key in createElement props object
    # e.g., class: "flex items-center text-center" OR "class": 'card active'
    create_element_class_pattern = re.compile(
        r'["\']?class["\']?\s*:\s*(["\'`]([^"\'`]+)["\'`]|\[([^\]]+)\])'
    )

    # Pattern 2: Matches array element string literals: class: ['flex', 'items-center']
    array_string_pattern = re.compile(r'["\'`]([a-zA-Z0-9_-]+)["\'`]')

    # Pattern 3: Standard JS classList usages: element.classList.add('flex', 'hidden')
    class_list_pattern = re.compile(
        r'classList\.(?:add|remove|toggle)\(\s*([^)]+)\s*\)'
    )

    print(f"Scanning codebase for DOM helper classes in: {root_dir}\n" + "-" * 50)

    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in {'node_modules', 'dist', 'build', '.git'}]

        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in TARGET_EXTENSIONS:
                file_path = os.path.join(root, file)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()

                        # 1. Parse class properties in object literals
                        for match in create_element_class_pattern.finditer(content):
                            string_val = match.group(2)
                            array_val = match.group(3)

                            # Handle single string value: class: "flex text-center"
                            if string_val:
                                classes = string_val.split()
                                for cls in classes:
                                    cleaned = re.sub(r'\$\{.*?\}', '', cls).strip()
                                    if cleaned and not cleaned.startswith('/*'):
                                        unique_classes.add(cleaned)
                                        class_counts[cleaned] = class_counts.get(cleaned, 0) + 1

                            # Handle array value: class: ["flex", "items-center"]
                            elif array_val:
                                for str_match in array_string_pattern.finditer(array_val):
                                    cls = str_match.group(1).strip()
                                    if cls:
                                        unique_classes.add(cls)
                                        class_counts[cls] = class_counts.get(cls, 0) + 1

                        # 2. Parse classList operations
                        for match in class_list_pattern.finditer(content):
                            args = match.group(1)
                            for str_match in array_string_pattern.finditer(args):
                                cls = str_match.group(1).strip()
                                if cls:
                                    unique_classes.add(cls)
                                    class_counts[cls] = class_counts.get(cls, 0) + 1

                except Exception as e:
                    print(f"Skipped {file_path}: {e}")

    sorted_classes = sorted(list(unique_classes))
    
    # Save formatted results
    with open("extracted_js_classes.json", "w", encoding="utf-8") as f:
        json.dump({
            "total_unique_classes": len(sorted_classes),
            "classes": sorted_classes,
            "frequencies": dict(sorted(class_counts.items(), key=lambda item: item[1], reverse=True))
        }, f, indent=2)

    return sorted_classes, class_counts


if __name__ == "__main__":
    project_folder = "./src"  # Adjust to your JS components directory
    classes, counts = extract_element_builder_classes(project_folder)

    print(f"\nExtracted {len(classes)} unique classes from JS object trees.")
    print("\nTop 10 Most Used Classes:")
    top_10 = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:10]
    for cls, count in top_10:
        print(f"  .{cls} ({count} occurrences)")