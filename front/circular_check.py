import os, sys
from collections import defaultdict
from dependency_graph import analyze_imports  # Uses your previous script logic

_, file_deps, _ = analyze_imports(".")

def find_cycles(graph):
    visited, stack, cycles = set(), [], []

    def dfs(node):
        visited.add(node)
        stack.append(node)
        for neighbor in graph.get(node, []):
            if neighbor in stack:
                cycles.append(stack[stack.index(neighbor):] + [neighbor])
            elif neighbor not in visited:
                dfs(neighbor)
        stack.pop()

    for node in list(graph.keys()):
        if node not in visited:
            dfs(node)
    return cycles

cycles = find_cycles(file_deps)
if cycles:
    print(f"[WARNING] Detected {len(cycles)} circular dependencies:")
    for c in cycles[:5]:
        print(" -> ".join(c))
else:
    print("[OK] No circular dependencies found!")