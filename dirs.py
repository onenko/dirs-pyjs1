import os
import time
from collections import defaultdict

OUTPUT_DIR = r"C:\dirs\js"


def scan_directory(root_path, root_js_name):
    records = []

    # How many times we saw the directory with given name (for -1, -2, -3 ...)
    dir_counters = defaultdict(int)

    def get_dir_id(dirname):
        """Returns negative numeric id for a directory"""
        dir_counters[dirname] -= 1
        return dir_counters[dirname]  # -1, then -2, -3 ...

    def process_dir(dir_path, parent_key):
        for entry in os.scandir(dir_path):
            full_path = os.path.join(dir_path, entry.name)
            stat = entry.stat()
            timestamp = int(stat.st_mtime)  # seconds (epoch)

            if entry.is_dir():
                # directory -> negative id
                dir_id = get_dir_id(entry.name)
                records.append([parent_key, timestamp, dir_id, entry.name])

                # key for children
                child_parent_key = f"{entry.name}#{dir_id}"

                # recursion
                process_dir(full_path, child_parent_key)

            else:
                # file
                size = stat.st_size
                records.append([parent_key, timestamp, size, entry.name])

    process_dir(root_path, "root")
    return records


def generate_js_file(records, js_variable_name, output_file):
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(f'window["{js_variable_name}"] = [\n')
        for rec in records:
            parent, ts, size, name = rec
            f.write(f'    ["{parent}", {ts}, {size}, "{name}"],\n')
        f.write("];\n")


# ======================
#       START
# ======================

current_dir = os.getcwd()
current_name = os.path.basename(current_dir)

js_name = current_name
output_path = os.path.join(OUTPUT_DIR, f"{current_name}.js")

records = scan_directory(current_dir, js_name)
generate_js_file(records, js_name, output_path)

print(f"Generated: {output_path}")
print(f"Records: {len(records)}")
