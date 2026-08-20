import sys
import re
import subprocess

PATTERNS = {
    "Generic Secret/API Key": r"(?i)(api_key|secret|password|bearer|private_key)\s*[:=]\s*['\"]([^'\"]+){8,}['\"]",
    "JWT Token": r"eyJ[A-Za-z0-9-_=]+\.[0-9A-Za-z-_=]+\.?[0-9A-Za-z-_.+/=]*",
    "Environment Variable Hardcode": r"process\.env\.[A-Z0-9_]+\s*=\s*['\"][^'\"]+['\"]",
    "Unhandled Go Error": r"\b_,\s*err\s*:=|\berr\s*:=\s*[^;]+;\s*if\s+err\s*==\s*nil"
}

def scan_files():
    # Get changed files via git
    cmd = ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"]
    files = subprocess.check_output(cmd).decode("utf-8").splitlines()
    
    failed = False
    for file_path in files:
        if not os.path.exists(file_path) or file_path.endswith(".py"):
            continue

        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            for line_num, line in enumerate(f, 1):
                for check_name, pattern in PATTERNS.items():
                    if re.search(pattern, line):
                        print(f"[SECURITY ALERT] {check_name}")
                        print(f"  File: {file_path}:{line_num}")
                        print(f"  Line: {line.strip()}\n")
                        failed = True

    if failed:
        sys.exit(1)

if __name__ == "__main__":
    scan_files()