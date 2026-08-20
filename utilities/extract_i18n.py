import os
import re
import json

JS_DIR = "./src"
LANG_DIR = "./public/i18n"
PATTERN = r"(?:i18n|t)\(\s*['\"]([^'\"]+)['\"]\s*\)"

def extract_strings():
    extracted_keys = set()
    for root, _, files in os.walk(JS_DIR):
        for file in files:
            if file.endswith(".js"):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    matches = re.findall(PATTERN, f.read())
                    extracted_keys.update(matches)

    # Load or create en.json
    en_path = os.path.join(LANG_DIR, "en.json")
    en_data = {}
    if os.path.exists(en_path):
        with open(en_path, "r", encoding="utf-8") as f:
            en_data = json.load(f)

    # Sync en.json with new keys
    for key in extracted_keys:
        if key not in en_data:
            en_data[key] = key  # Default value as key

    with open(en_path, "w", encoding="utf-8") as f:
        json.dump(en_data, f, indent=2, ensure_ascii=False)

    # Audit secondary language packs
    for lang_file in os.listdir(LANG_DIR):
        if lang_file.endswith(".json") and lang_file != "en.json":
            lang_path = os.path.join(LANG_DIR, lang_file)
            with open(lang_path, "r", encoding="utf-8") as f:
                lang_data = json.load(f)
            
            missing = [k for k in en_data if k not in lang_data]
            if missing:
                print(f"[{lang_file}] Missing {len(missing)} keys:")
                for k in missing:
                    print(f"  - {k}")

if __name__ == "__main__":
    extract_strings()