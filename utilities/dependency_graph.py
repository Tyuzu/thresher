import os
import re
from collections import defaultdict

def analyze_imports(js_dir):
    import_counts = defaultdict(int)
    import_pattern = re.compile(r'import\s+.*?\s+from\s+[\'"](.*?)[\'"]')

    for root, _, files in os.walk(js_dir):
        for file in files:
            if file.endswith((".ts", ".js")):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        matches = import_pattern.findall(line)
                        for m in matches:
                            import_counts[m] += 1
    return sorted(import_counts.items(), key=lambda x: x[1], reverse=True)