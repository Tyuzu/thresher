import os
import re

GO_DIR = "./backend"
# Matches struct fields: FieldName type `json:"tag"`
FIELD_REGEX = re.compile(r"^\s*([A-Z]\w*)\s+([\w\.\[\]\*\{\}]+)(?:\s+`([^`]+)`)?")

def to_snake_case(name):
    s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1).lower()

def check_struct_tags():
    issues = 0
    for root, _, files in os.walk(GO_DIR):
        for file in files:
            if file.endswith(".go") and not file.endswith("_test.go"):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    for line_num, line in enumerate(f, 1):
                        match = FIELD_REGEX.match(line)
                        if match:
                            field_name, _, tags = match.groups()
                            expected_tag = f'json:"{to_snake_case(field_name)}"'
                            
                            if not tags or 'json:"' not in tags:
                                print(f"{path}:{line_num} - Missing JSON tag on '{field_name}'. Expected `{expected_tag}`")
                                issues += 1
                            elif expected_tag not in tags and 'json:"-"' not in tags:
                                print(f"{path}:{line_num} - Improper JSON tag on '{field_name}'. Expected `{expected_tag}`")
                                issues += 1
    if issues == 0:
        print("All Go struct fields follow json:\"snake_case\" standards.")

if __name__ == "__main__":
    check_struct_tags()