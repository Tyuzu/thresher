from collections import defaultdict

def analyze_coupling(file_deps):
    """Calculates Fan-In (dependents) and Fan-Out (dependencies) for each file."""
    fan_out = {node: len(targets) for node, targets in file_deps.items()}
    fan_in = defaultdict(int)

    for source, targets in file_deps.items():
        for target in targets:
            fan_in[target] += 1

    all_files = set(fan_out.keys()).union(set(fan_in.keys()))
    
    stats = []
    for f in all_files:
        in_c = fan_in[f]
        out_c = fan_out.get(f, 0)
        stats.append((f, in_c, out_c, in_c + out_c))
    
    # Sort by total connections descending
    stats.sort(key=lambda x: x[3], reverse=True)

    print(f"{'File Path':<45} | {'Fan-In (Used By)':<18} | {'Fan-Out (Imports)':<18}")
    print("-" * 87)
    for path, in_c, out_c, _ in stats[:10]:  # Top 10
        print(f"{path:<45} | {in_c:<18} | {out_c:<18}")

# Example usage
mock_deps = {
    "services/auth": ["utils/db", "utils/logger"],
    "services/user": ["utils/db", "services/auth"],
    "utils/db": ["utils/logger"]
}
analyze_coupling(mock_deps)