import sys

file_path = "C:/Users/USER/Desktop/workSpace/Albionventas/AlbionMaster.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Locate Table insertion point (before table-wrap)
table_insert_idx = -1
for i, line in enumerate(lines):
    if "{/* Table */}" in line:
        table_insert_idx = i
        break

# Locate Settings start and end
settings_start_idx = -1
settings_end_idx = -1
for i, line in enumerate(lines):
    if "{/* ═══════════════════ PAGE: SETTINGS ═══════════════════ */}" in line:
        settings_start_idx = i
        break

for i in range(settings_start_idx, len(lines)):
    if "{/* Footer */}" in lines[i]:
        settings_end_idx = i
        break

settings_lines = lines[settings_start_idx+2:settings_end_idx-3] 

# Locate the start of Calculator Panel
calc_start_idx = -1
for i, line in enumerate(lines):
    if "{/* Calculator Panel */}" in line:
        calc_start_idx = i
        break

# Build new filter block
new_settings_lines = []
new_settings_lines.append("        {/* Filters Container */}\n")
new_settings_lines.append("        <div className=\"filters-container\" style={{ marginBottom: 16 }}>\n")
new_settings_lines.append("          <button \n")
new_settings_lines.append("            className=\"filter-toggle-btn\" \n")
new_settings_lines.append("            onClick={() => setShowFilters(!showFilters)}\n")
new_settings_lines.append("            style={{ \n")
new_settings_lines.append("              background: '#1a2548', color: '#8899aa', border: '1px solid #2a3a5a', \n")
new_settings_lines.append("              padding: '8px 16px', borderRadius: 4, cursor: 'pointer',\n")
new_settings_lines.append("              marginBottom: showFilters ? 16 : 0, width: '100%', textAlign: 'left',\n")
new_settings_lines.append("              fontWeight: 'bold'\n")
new_settings_lines.append("            }}\n")
new_settings_lines.append("          >\n")
new_settings_lines.append("            {showFilters ? '⚙️ Ocultar Filtros ▲' : '⚙️ Mostrar Filtros ▼'}\n")
new_settings_lines.append("          </button>\n")
new_settings_lines.append("          \n")
new_settings_lines.append("          {showFilters && (\n")

for line in settings_lines:
    if "activePage === 'settings'" in line:
        # Ignore wrapper
        continue
    # Stop before closing divs
    if "</div>" in line and len(new_settings_lines) > len(settings_lines) - 5:
        continue
    new_settings_lines.append(line)

new_settings_lines.append("          )}\n")
new_settings_lines.append("        </div>\n\n")

# Reconstruct file
new_lines = []
new_lines.extend(lines[:table_insert_idx])
new_lines.extend(new_settings_lines)
new_lines.extend(lines[table_insert_idx:calc_start_idx])
new_lines.append("          {/* Footer */}\n")
new_lines.extend(lines[settings_end_idx:])

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Refactoring complete.")
