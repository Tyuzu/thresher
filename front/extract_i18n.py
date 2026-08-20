import os
import re
import json

# ADJUST THIS PATH to where your frontend JS files live relative to this script
JS_DIR = "./js"  
LANG_DIR = "./public"

# Matches: t('key'), t("key"), t(`key`), t('key with spaces'), etc.
# Handles optional whitespace inside the parentheses.
T_PATTERN = re.compile(r"\bt\(\s*['\"`]([^'\"`]+)['\"`]\s*\)")

def extract_strings():
    extracted_keys = set()
    files_scanned = 0

    if not os.path.exists(JS_DIR):
        print(f"Error: Could not find directory '{JS_DIR}'. Please check JS_DIR path.")
        return

    # Walk through directory
    for root, _, files in os.walk(JS_DIR):
        for file in files:
            if file.endswith(".ts") or file.endswith(".html"):
                files_scanned += 1
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    matches = T_PATTERN.findall(content)
                    for match in matches:
                        extracted_keys.add(match)

    print(f"Scanned {files_scanned} files in '{JS_DIR}'.")

    if not extracted_keys:
        print("Found 0 t('...') keys. Check if JS_DIR points to the right folder.")
        return

    os.makedirs(LANG_DIR, exist_ok=True)
    en_path = os.path.join(LANG_DIR, "en.json")

    # Load existing translations so we don't overwrite manual edits
    en_data = {}
    if os.path.exists(en_path):
        with open(en_path, "r", encoding="utf-8") as f:
            try:
                en_data = json.load(f)
            except json.JSONDecodeError:
                en_data = {}

    # Add missing keys
    new_keys_count = 0
    for key in extracted_keys:
        if key not in en_data:
            en_data[key] = key  # Default value equals the key
            new_keys_count += 1

    with open(en_path, "w", encoding="utf-8") as f:
        json.dump(en_data, f, indent=2, ensure_ascii=False)

    print(f"Extraction complete!")
    print(f"- Total unique t('...') keys found: {len(extracted_keys)}")
    print(f"- New keys added to en.json: {new_keys_count}")
    print(f"- File written to: {en_path}")

if __name__ == "__main__":
    extract_strings()