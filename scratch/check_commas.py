import re

with open('resources/js/components/Memorisation.vue', 'r') as f:
    lines = f.readlines()

in_methods = False
brace_count = 0
for i, line in enumerate(lines):
    if 'methods: {' in line:
        in_methods = True
        brace_count = 1
        continue
    
    if in_methods:
        for char in line:
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
        
        if brace_count == 1: # We are back at the method level
            # Check if this line is a closing brace of a method
            if re.match(r'^[[:space:]]*\}', line) and not line.strip().endswith('},') and not line.strip().endswith('}'):
                # Wait, if it ends with } it's also potentially missing a comma if followed by another method
                pass
            
            # Check if next non-empty line starts a new method
            if line.strip() == '}':
                # find next non-empty line
                next_idx = i + 1
                while next_idx < len(lines) and not lines[next_idx].strip():
                    next_idx += 1
                
                if next_idx < len(lines):
                    next_line = lines[next_idx].strip()
                    if '(' in next_line and '{' in next_line and not next_line.startswith('//'):
                        print(f"Potential missing comma at line {i+1}: {line.strip()}")
        
        if brace_count == 0:
            in_methods = False
