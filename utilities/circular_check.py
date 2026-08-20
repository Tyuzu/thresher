import os, sys
from collections import defaultdict
from dependency_graph import analyze_imports  

_, file_deps, raw_import_details = analyze_imports(".")

# --- DEBUG: Print the raw structure to see what keys/data are inside ---
if raw_import_details and len(raw_import_details) > 0:
    print("[DEBUG] Sample import item structure:", repr(raw_import_details[0]))

import_details = {}
if isinstance(raw_import_details, list):
    for item in raw_import_details:
        if isinstance(item, dict):
            # Check for common key variations
            src = item.get("source") or item.get("from") or item.get("file") or item.get("caller")
            tgt = item.get("target") or item.get("to") or item.get("imported") or item.get("module")
            import_details[(src, tgt)] = item
        elif isinstance(item, (tuple, list)) and len(item) >= 3:
            import_details[(item[0], item[1])] = item[2]

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
    print(f"\n[WARNING] Detected {len(cycles)} circular dependencies:\n")
    for idx, cycle in enumerate(cycles[:5], 1):
        print(f"--- Cycle #{idx} ---")
        for i in range(len(cycle) - 1):
            source = cycle[i]
            target = cycle[i + 1]
            
            meta = import_details.get((source, target), {})
            
            if isinstance(meta, dict):
                # Search across all common line number and code statement keys
                line_no = meta.get("line") or meta.get("lineno") or meta.get("line_num") or meta.get("loc") or "??"
                stmt = meta.get("statement") or meta.get("code") or meta.get("import_str") or meta.get("raw") or f"imports {target}"
                
                print(f"  {source} (Line {line_no})")
                print(f"    |--> {stmt}")
            else:
                print(f"  {source} --> {target} ({meta})")
                
        print(f"  |--> Completes loop back to {cycle[0]}\n")
else:
    print("[OK] No circular dependencies found!")