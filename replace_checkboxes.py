import re

with open('src/components/GroupEditModal.tsx', 'r') as f:
    content = f.read()

# Pattern for checkboxes with onChange={(e) => setSomething(e.target.checked)}
pattern_with_event = re.compile(
    r'<input\s+type="checkbox"\s+checked={([^}]+)}\s+onChange={\(e\) => ([^}]+)\(e\.target\.checked\)}\s+className="[^"]+"\s*/>',
    re.MULTILINE
)

# Pattern for checkboxes with multi-line onChange
pattern_multiline_event = re.compile(
    r'<input\s+type="checkbox"\s+checked={([^}]+)}\s+onChange={\(e\) => {\s*([^}]+?)\s*}}\s+className="[^"]+"\s*/>',
    re.MULTILINE | re.DOTALL
)

# Pattern for empty onChange (like in reactions)
pattern_empty_event = re.compile(
    r'<input\s+type="checkbox"\s+checked={([^}]+)}\s+onChange={\(\) => {}}\s+className="[^"]+"\s*/>',
    re.MULTILINE
)


def replace_event(m):
    checked = m.group(1)
    setter = m.group(2)
    return f'<ToggleSwitch checked={{{checked}}} onChange={{{setter}}} />'

def replace_multiline_event(m):
    checked = m.group(1)
    body = m.group(2)
    # The body usually contains e.target.checked. We need to replace it with a boolean parameter 'c'
    body = body.replace('e.target.checked', 'c')
    return f'<ToggleSwitch checked={{{checked}}} onChange={{(c) => {{ {body} }}}} />'

def replace_empty_event(m):
    checked = m.group(1)
    return f'<ToggleSwitch checked={{{checked}}} />'

content = pattern_with_event.sub(replace_event, content)
content = pattern_multiline_event.sub(replace_multiline_event, content)
content = pattern_empty_event.sub(replace_empty_event, content)

# Check if there are any left
remaining = re.findall(r'<input[^>]+type="checkbox"[^>]*>', content)
if remaining:
    print("WARNING: Some checkboxes were not replaced:")
    for r in remaining:
        print(r)

with open('src/components/GroupEditModal.tsx', 'w') as f:
    f.write(content)

print("Done")
