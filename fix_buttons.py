import re

with open('src/components/GroupEditModal.tsx', 'r') as f:
    content = f.read()

# insert handleApplySubView
handle_apply = """
  const handleApplySubView = async () => {
    setIsSaving(true);
    try {
      await onUpdateGroup(chat.id, {
        name: name.trim(),
        description: description.trim(),
        avatar,
        color,
        groupType,
        publicUsername: groupType === 'public' ? publicUsername.trim() : undefined,
        approveNewMembers,
        restrictContentSaving,
        chatHistoryVisibility,
        topicsEnabled,
        topicsLayout,
        reactionsMode,
        allowedReactions,
        permissions: {
          sendText: permSendText,
          sendMedia: permMedia,
          addMembers: permAddMembers,
          pinMessages: permPinMessages,
          changeChatInfo: permChangeChatInfo,
          starsPerMessage: { enabled: starsEnabled, stars: starsCount },
          slowMode,
          unrestrictBoosters,
          boosterMinLevel,
          blockedMembers: chat.permissions?.blockedMembers || [],
        },
        appearance: {
          color,
          backgroundWallpaper: selectedWallpaper,
          boostLevel: chat.appearance?.boostLevel || 0,
          totalBoosts: chat.appearance?.totalBoosts || 0,
        },
        antiSpamAggressive,
        hideMembers,
      });
      showToast('Pengaturan berhasil diterapkan');
      setCurrentView('main');
    } catch (e) {
      showToast('Gagal menerapkan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };
"""

content = content.replace("const handleSaveMain = async () => {", handle_apply + "\n  const handleSaveMain = async () => {")

# Find pattern where a button has onClick={() => setCurrentView('main')} and child is <Check
pattern = re.compile(
    r'<button\s+onClick={\(\) => setCurrentView\(\'main\'\)}\s+className="p-1\.5 text-\[#5288c1\][^"]+"[^>]*>\s*<Check className="w-5 h-5 stroke-\[2\.5\]"',
    re.MULTILINE
)

content = pattern.sub(
    lambda m: m.group(0).replace("onClick={() => setCurrentView('main')}", "onClick={handleApplySubView} disabled={isSaving}"),
    content
)

# And also replace the floating bar in Permissions:
# onClick={() => { setHasUnsavedPerms(false); showToast('Perizinan berhasil diterapkan'); setCurrentView('main'); }}
floating_apply = r"onClick={\(\) => {\s*setHasUnsavedPerms\(false\);\s*showToast\('Perizinan berhasil diterapkan'\);\s*setCurrentView\('main'\);\s*}}"
content = re.sub(floating_apply, "onClick={handleApplySubView}", content)

with open('src/components/GroupEditModal.tsx', 'w') as f:
    f.write(content)

print("Done")
