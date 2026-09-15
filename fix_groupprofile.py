import re

with open('src/components/GroupProfileModal.tsx', 'r') as f:
    content = f.read()

permissions_logic = """
  const isGroup = chat.type === 'group';
  const isAdminOrOwner = isGroup && (chat.ownerId === currentUser.id || chat.adminIds?.includes(currentUser.id));
  const canChangeChatInfo = !isGroup || isAdminOrOwner || chat.permissions?.changeChatInfo !== false;
  const canAddMembers = !isGroup || isAdminOrOwner || chat.permissions?.addMembers !== false;
"""

# Insert right after `const toggleMute = ...`
content = content.replace("const isOwner = currentUser.id === chat.ownerId || !chat.ownerId;", permissions_logic + "\n  const isOwner = currentUser.id === chat.ownerId || !chat.ownerId;")

# Replace the edit button
old_edit = """                <button
                  id="btn-edit-group"
                  onClick={() => setShowEditModal(true)}
                  className="p-2 text-white hover:bg-black/20 rounded-full transition-colors cursor-pointer backdrop-blur-sm"
                  title="Edit Grup"
                >"""

new_edit = """                {canChangeChatInfo && (
                  <button
                    id="btn-edit-group"
                    onClick={() => setShowEditModal(true)}
                    className="p-2 text-white hover:bg-black/20 rounded-full transition-colors cursor-pointer backdrop-blur-sm"
                    title="Edit Grup"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                )}"""

content = content.replace(old_edit + '\n                  <Edit3 className="w-5 h-5" />\n                </button>', new_edit)


# Replace the Tambah Anggota item
old_add = """              {/* Tambah Anggota List Item */}
              <div
                onClick={() => setShowAddMembersModal(true)}
                className="flex items-center gap-4 px-4 py-2 hover:bg-[#202b36] cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#5288c1] flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-[#5288c1]">Tambah Anggota</span>
              </div>"""

new_add = """              {/* Tambah Anggota List Item */}
              {canAddMembers && (
                <div
                  onClick={() => setShowAddMembersModal(true)}
                  className="flex items-center gap-4 px-4 py-2 hover:bg-[#202b36] cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#5288c1] flex items-center justify-center flex-shrink-0">
                    <UserPlus className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-[#5288c1]">Tambah Anggota</span>
                </div>
              )}"""

content = content.replace(old_add, new_add)


with open('src/components/GroupProfileModal.tsx', 'w') as f:
    f.write(content)

print("GroupProfile Done")
