import os
import tiktoken  # pip install tiktoken

# Choose your tokenizer encoding (cl100k_base works for gpt-4, gpt-3.5-turbo, text-embedding-ada-002)
encoding = tiktoken.get_encoding("cl100k_base")


def get_file_stats(filepath):
    """Calculates file size, line count, and token count for a given file."""
    # File size in bytes
    size_bytes = os.path.getsize(filepath)

    line_count = 0
    token_count = 0

    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            line_count = len(content.splitlines())
            token_count = len(encoding.encode(content))
    except Exception as e:
        # Handles binary or unreadable files
        return None

    return {
        "path": filepath,
        "size_bytes": size_bytes,
        "lines": line_count,
        "tokens": token_count,
    }


def analyze_directory(root_dir):
    """Recursively scans directory and prints stats for all files."""
    total_files = 0
    total_lines = 0
    total_tokens = 0
    total_bytes = 0

    print(
        f"{'File Path':<60} | {'Size (KB)':<10} | {'Lines':<8} | {'Tokens':<8}"
    )
    print("-" * 90)

    for dirpath, _, filenames in os.walk(root_dir):
        # Skip hidden directories like .git
        if "/." in dirpath or "\\." in dirpath:
            continue

        for filename in filenames:
            # Skip hidden files
            if filename.startswith("."):
                continue

            filepath = os.path.join(dirpath, filename)
            stats = get_file_stats(filepath)

            if stats:
                total_files += 1
                total_lines += stats["lines"]
                total_tokens += stats["tokens"]
                total_bytes += stats["size_bytes"]

                size_kb = round(stats["size_bytes"] / 1024, 2)
                # Truncate long paths for clean console display
                display_path = (
                    filepath
                    if len(filepath) <= 58
                    else "..." + filepath[-55:]
                )

                print(
                    f"{display_path:<60} | {size_kb:<10} | {stats['lines']:<8} | {stats['tokens']:<8}"
                )

    print("-" * 90)
    print("SUMMARY")
    print(f"Total Files:  {total_files}")
    print(f"Total Lines:  {total_lines:,}")
    print(f"Total Tokens: {total_tokens:,}")
    print(f"Total Size:   {round(total_bytes / (1024 * 1024), 2)} MB")


if __name__ == "__main__":
    # Change '.' to your target folder path if needed
    target_directory = "."
    analyze_directory(target_directory)