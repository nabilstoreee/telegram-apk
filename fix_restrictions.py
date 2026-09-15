import re

with open('src/components/ChatView.tsx', 'r') as f:
    chat_view = f.read()

# Add permissions logic to ChatView.tsx
permissions_logic = """
  const isGroup = chat.type === 'group';
  const isOwnerOrAdmin = isGroup && (chat.ownerId === currentUser.id || chat.adminIds?.includes(currentUser.id));
  const canSendText = !isGroup || isOwnerOrAdmin || chat.permissions?.sendText !== false;
  
  const mediaPerms = chat.permissions?.sendMedia;
  const canSendMedia = !isGroup || isOwnerOrAdmin || (
    mediaPerms === undefined || 
    mediaPerms.photos !== false || 
    mediaPerms.videos !== false || 
    mediaPerms.files !== false || 
    mediaPerms.voiceNotes !== false
  );
"""

# Insert right after `const { settings } = useSettings();`
chat_view = chat_view.replace("const { settings } = useSettings();", "const { settings } = useSettings();\n" + permissions_logic)

# Replace the input area
# find: <div className="p-2.5 md:p-3.5 bg-[#17212b] border-t border-[#101921] flex items-center gap-2">
input_area_pattern = re.compile(
    r'<div className="p-2\.5 md:p-3\.5 bg-\[#17212b\] border-t border-\[#101921\] flex items-center gap-2">.*?(?=</div>\s*</div>\s*</div>\s*</div>)',
    re.DOTALL
)

def replace_input_area(m):
    # We will just wrap the contents or conditionally render
    original = m.group(0)
    # We want to show a message if neither text nor media is allowed
    # If text is not allowed, but media is, we should disable the text input
    
    # Actually, let's just do a simpler replacement
    return original

with open('src/components/ChatView.tsx', 'w') as f:
    f.write(chat_view)

print("Done")
