import sys

file_path = "C:/Users/USER/Desktop/workSpace/Albionventas/AlbionArbitrage.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip = False

for i, line in enumerate(lines):
    if "/* ── SIDEBAR ── */" in line:
        skip = True
    elif "/* ── MAIN CONTENT ── */" in line:
        skip = False

    if "/* ── STAT CARDS ── */" in line:
        skip = True
    elif "/* ── FILTERS ── */" in line:
        skip = False

    if "/* ── HEALTH PANEL ── */" in line:
        skip = True
    elif ".checkbox-label {" in line:
        skip = False

    if "/* ── HISTORY & PINS ── */" in line:
        new_lines.append(line)
        skip = True
    elif ".row-pinned {" in line:
        skip = False

    if "/* ── CALCULATOR PANEL ── */" in line:
        skip = True
    elif "/* ── RESPONSIVE ── */" in line:
        skip = False
        new_lines.append("  /* ── RESPONSIVE ── */\n")
        new_lines.append("  @media (max-width: 768px) {\n")
        new_lines.append("    .main-content { padding: 12px; }\n")
        new_lines.append("    .header { flex-direction: column; gap: 10px; }\n")
        new_lines.append("  }\n")
        # Now we need to skip until the end of the template string
        skip = True
    elif "`;" in line and skip:
        skip = False

    if not skip and "/* ── RESPONSIVE ── */" not in line:
        new_lines.append(line)

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("CSS cleanup complete.")
