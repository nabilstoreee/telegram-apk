import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Check, Camera, Smile, Shield, Link as LinkIcon,
  Users, UserPlus, Trash2, Eye, EyeOff, Lock, Globe,
  Copy, Share2, QrCode, Sliders, Sparkles, MessageSquare,
  Flame, Heart, ThumbsUp, ThumbsDown, Bell, Zap, MoreVertical,
  CheckCircle2, Plus, AlertCircle, X, ChevronRight, Hash,
  Palette, RefreshCw, Star, Layers, ShieldCheck, UserX, Clock
} from 'lucide-react';
import { Chat, User } from '../types';
import { UserAvatar } from './UserAvatar';
import { compressImage } from '../utils/image';

interface GroupEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
  currentUser: User;
  allUsers: User[];
  onUpdateGroup: (chatId: string, updates: Partial<Chat>) => Promise<void>;
  onDeleteGroup: (chatId: string) => Promise<void>;
  onAddMembers: (chatId: string, participantIds: string[]) => Promise<void>;
}

type SubView = 
  | 'main' 
  | 'group_type' 
  | 'appearance' 
  | 'chat_history' 
  | 'topics' 
  | 'reactions' 
  | 'permissions' 
  | 'invite_links' 
  | 'create_invite_link'
  | 'admins' 
  | 'members' 
  | 'boosts' 
  | 'recent_actions'
  | 'add_members_picker';

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange?: (c: boolean) => void }) => (
  <div
    onClick={(e) => { e.stopPropagation(); onChange?.(!checked); }}
    className={`relative w-[42px] h-[24px] rounded-full transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
      checked ? 'bg-[#5288c1]' : 'bg-[#7f91a4]/40'
    }`}
  >
    <div
      className={`absolute top-0.5 left-0.5 w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
        checked ? 'translate-x-[18px]' : 'translate-x-0'
      }`}
    />
  </div>
);

const REACTION_LIST = [
  { emoji: '❤️', name: 'Hati Merah' },
  { emoji: '👍', name: 'Jempol' },
  { emoji: '👎', name: 'Jempol Terbalik' },
  { emoji: '🔥', name: 'Api' },
  { emoji: '🥰', name: 'Wajah Tersenyum dengan Hati' },
  { emoji: '👏', name: 'Tepuk Tangan' },
  { emoji: '😁', name: 'Wajah Bahagia' },
  { emoji: '🤔', name: 'Wajah Berpikir' },
  { emoji: '🤯', name: 'Kepala Meledak' },
  { emoji: '😱', name: 'Wajah Teriak' },
  { emoji: '🤬', name: 'Wajah dengan Simbol di Mulut' },
  { emoji: '😢', name: 'Wajah Menangis' },
];

const PRESET_WALLPAPERS = [
  { id: 'default', name: 'Standar Gelap', color: '#0e1621' },
  { id: 'space', name: 'Cosmic Blue', color: '#17212b' },
  { id: 'emerald', name: 'Deep Emerald', color: '#132e27' },
  { id: 'ruby', name: 'Midnight Ruby', color: '#2b121b' },
  { id: 'amethyst', name: 'Royal Purple', color: '#1f1633' },
];

export const GroupEditModal: React.FC<GroupEditModalProps> = ({
  isOpen,
  onClose,
  chat,
  currentUser,
  allUsers,
  onUpdateGroup,
  onDeleteGroup,
  onAddMembers,
}) => {
  const [currentView, setCurrentView] = useState<SubView>('main');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Main Edit State
  const [name, setName] = useState(chat.name || '');
  const [description, setDescription] = useState(chat.description || '');
  const [avatar, setAvatar] = useState(chat.avatar || '');
  const [color, setColor] = useState(chat.color || '#4fae4e');

  // Group Type & Links State
  const [groupType, setGroupType] = useState<'private' | 'public'>(chat.groupType || 'private');
  const [publicUsername, setPublicUsername] = useState(chat.publicUsername || '');
  const [approveNewMembers, setApproveNewMembers] = useState(chat.approveNewMembers || false);
  const [restrictContentSaving, setRestrictContentSaving] = useState(chat.restrictContentSaving || false);

  // Chat History
  const [chatHistoryVisibility, setChatHistoryVisibility] = useState<'visible' | 'hidden'>(
    chat.chatHistoryVisibility || 'visible'
  );

  // Topics
  const [topicsEnabled, setTopicsEnabled] = useState(chat.topicsEnabled || false);
  const [topicsLayout, setTopicsLayout] = useState<'tabs' | 'list'>(chat.topicsLayout || 'tabs');

  // Reactions
  const [reactionsMode, setReactionsMode] = useState<'all' | 'some' | 'none'>(chat.reactionsMode || 'all');
  const [allowedReactions, setAllowedReactions] = useState<string[]>(
    chat.allowedReactions || ['❤️', '👍', '👎', '🔥', '🥰', '👏', '😁']
  );

  // Permissions (14/14)
  const [permSendText, setPermSendText] = useState(chat.permissions?.sendText ?? true);
  const [permMedia, setPermMedia] = useState(
    chat.permissions?.sendMedia ?? {
      photos: true,
      videos: true,
      stickersGifs: true,
      music: true,
      files: true,
      voiceNotes: true,
      videoNotes: true,
      embeddedLinks: true,
      polls: true,
    }
  );
  const [isMediaAccordionOpen, setIsMediaAccordionOpen] = useState(false);
  const [permAddMembers, setPermAddMembers] = useState(chat.permissions?.addMembers ?? true);
  const [permPinMessages, setPermPinMessages] = useState(chat.permissions?.pinMessages ?? true);
  const [permChangeChatInfo, setPermChangeChatInfo] = useState(chat.permissions?.changeChatInfo ?? true);
  const [starsEnabled, setStarsEnabled] = useState(chat.permissions?.starsPerMessage?.enabled ?? false);
  const [starsCount, setStarsCount] = useState(chat.permissions?.starsPerMessage?.stars ?? 1);
  const [slowMode, setSlowMode] = useState(chat.permissions?.slowMode ?? 0);
  const [unrestrictBoosters, setUnrestrictBoosters] = useState(chat.permissions?.unrestrictBoosters ?? true);
  const [boosterMinLevel, setBoosterMinLevel] = useState(chat.permissions?.boosterMinLevel ?? 1);
  const [hasUnsavedPerms, setHasUnsavedPerms] = useState(false);

  // Appearance
  const [selectedWallpaper, setSelectedWallpaper] = useState(chat.appearance?.backgroundWallpaper || 'default');

  // Admins & Members toggles
  const [antiSpamAggressive, setAntiSpamAggressive] = useState(chat.antiSpamAggressive || false);
  const [hideMembers, setHideMembers] = useState(chat.hideMembers || false);

  // New Invite Link Form
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkRequireApproval, setNewLinkRequireApproval] = useState(false);
  const [newLinkTimeLimit, setNewLinkTimeLimit] = useState('Tak Terbatas');
  const [newLinkUserLimit, setNewLinkUserLimit] = useState('Tak Terbatas');

  // Add Member Picker State
  const [selectedNewMemberIds, setSelectedNewMemberIds] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(chat.name || '');
    setDescription(chat.description || '');
    setAvatar(chat.avatar || '');
    setColor(chat.color || '#4fae4e');
    setGroupType(chat.groupType || 'private');
    setPublicUsername(chat.publicUsername || '');
    setChatHistoryVisibility(chat.chatHistoryVisibility || 'visible');
    setTopicsEnabled(chat.topicsEnabled || false);
    setTopicsLayout(chat.topicsLayout || 'tabs');
    setReactionsMode(chat.reactionsMode || 'all');
    setAllowedReactions(chat.allowedReactions || ['❤️', '👍', '👎', '🔥', '🥰', '👏', '😁']);
  }, [chat]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  
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
      showToast('Pengaturan berhasil diterapkan'); setHasUnsavedPerms(false);
      setCurrentView('main');
    } catch (e) {
      showToast('Gagal menerapkan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMain = async () => {
    if (!name.trim()) {
      showToast('Nama grup tidak boleh kosong');
      return;
    }
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
      showToast('Pengaturan grup berhasil disimpan');
      onClose();
    } catch (e) {
      showToast('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = (text: string, label = 'Tautan') => {
    navigator.clipboard.writeText(text);
    showToast(`${label} disalin ke papan klip!`);
  };

  const handleCreateNewInviteLink = async () => {
    const randomToken = Math.random().toString(36).substring(2, 9);
    const newLinkObj = {
      id: `link-${Date.now()}`,
      link: `https://t.me/+${randomToken}`,
      name: newLinkName.trim() || 'Tautan Kustom',
      requiresApproval: newLinkRequireApproval,
      timeLimit: newLinkTimeLimit,
      usageLimit: newLinkUserLimit,
      createdAt: Date.now(),
      usesCount: 0,
    };
    const existing = chat.customLinks || [];
    await onUpdateGroup(chat.id, {
      customLinks: [...existing, newLinkObj],
    });
    setNewLinkName('');
    showToast('Tautan undangan baru berhasil dibuat!');
    setCurrentView('invite_links');
  };

  const handleAddSelectedMembers = async () => {
    if (selectedNewMemberIds.length === 0) return;
    await onAddMembers(chat.id, selectedNewMemberIds);
    setSelectedNewMemberIds([]);
    showToast('Anggota berhasil ditambahkan ke grup!');
    setCurrentView('members');
  };

  const handleRemoveMember = async (memberId: string) => {
    if (memberId === chat.ownerId) {
      showToast('Pemilik grup tidak dapat dihapus');
      return;
    }
    const updated = (chat.participants || []).filter((id) => id !== memberId);
    await onUpdateGroup(chat.id, { participants: updated });
    showToast('Anggota telah dikeluarkan dari grup');
  };

  const isOwner = currentUser.id === chat.ownerId || !chat.ownerId;
  const currentParticipants = (chat.participants || [])
    .map((id) => allUsers.find((u) => u.id === id) || (id === currentUser.id ? currentUser : null))
    .filter(Boolean) as User[];

  const nonMemberUsers = allUsers.filter(
    (u) => !(chat.participants || []).includes(u.id) && u.id !== currentUser.id
  ).filter((u) => {
    const q = memberSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || (u.username && u.username.toLowerCase().includes(q));
  });

  // Calculate active media permissions count
  const activeMediaCount = Object.values(permMedia).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-2 animate-in fade-in duration-200">
      <div className="bg-[#0e1621] w-full max-w-full sm:max-w-xl h-full sm:h-[720px] rounded-none sm:rounded-2xl border-0 sm:border border-[#242f3d] flex flex-col shadow-2xl overflow-hidden relative text-white">
        
        {/* TOAST */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 bg-[#242f3d] text-white px-4 py-2 rounded-full text-xs font-medium border border-[#313d4f] shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
            {toastMessage}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MAIN VIEW */}
        {/* ------------------------------------------------------------- */}
        {currentView === 'main' && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-2.5 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  id="btn-close-group-edit"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-white">Edit</h2>
              </div>

              <button
                id="btn-save-group-edit"
                onClick={handleSaveMain}
                disabled={isSaving}
                className="p-1.5 text-[#5288c1] hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
                title="Terapkan"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#242f3d]/60">
              
              {/* Photo, Name, and Description Section */}
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="edit-group-avatar-upload"
                    className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer relative group shrink-0 overflow-hidden shadow-inner border border-white/10"
                    style={{ backgroundColor: color }}
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="Group Avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Camera className="w-7 h-7 text-white/90 group-hover:scale-110 transition-transform" />
                    )}
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                    <input
                      id="edit-group-avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = async () => {
                            const base64Data = reader.result as string;
                            try {
                              const compressed = await compressImage(base64Data);
                              setAvatar(compressed);
                            } catch (err) {
                              console.error(err);
                              setAvatar(base64Data);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  <div className="flex-1 space-y-1">
                    <input
                      id="input-edit-group-name"
                      type="text"
                      placeholder="Nama grup"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#202b36] border border-[#2e3c4e] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#5288c1]"
                    />
                    <span className="text-[11px] text-[#7f91a4] block">Pasang Foto Profil atau pilih warna</span>
                  </div>
                </div>

                <div>
                  <textarea
                    id="textarea-group-description"
                    rows={2}
                    placeholder="Deskripsi (opsional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#202b36] border border-[#2e3c4e] rounded-xl p-3 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#5288c1] placeholder:text-slate-500 resize-none"
                  />
                </div>
              </div>

              {/* Menu Sections List (Matches exact video layout) */}
              <div className="py-2">
                
                {/* 1. Tipe Grup */}
                <div
                  id="menu-group-type"
                  onClick={() => setCurrentView('group_type')}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-[#5288c1]" />
                    <span className="text-sm text-white">Tipe Grup</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#7f91a4]">
                    <span>{groupType === 'private' ? 'Pribadi' : 'Publik'}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* 2. Tampilan */}
                <div
                  id="menu-appearance"
                  onClick={() => setCurrentView('appearance')}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Palette className="w-5 h-5 text-[#5288c1]" />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-white">Tampilan</span>
                        <span className="text-[10px] uppercase font-bold bg-[#5288c1]/20 text-[#5288c1] px-1.5 rounded">
                          BARU
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>

                {/* 3. Riwayat Obrolan untuk anggota baru */}
                <div
                  id="menu-chat-history"
                  onClick={() => setCurrentView('chat_history')}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-[#5288c1]" />
                    <span className="text-sm text-white">Riwayat Obrolan untuk anggota baru</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#7f91a4]">
                    <span>{chatHistoryVisibility === 'visible' ? 'Terlihat' : 'Tersembunyi'}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* 4. Topik */}
                <div
                  id="menu-topics"
                  onClick={() => setCurrentView('topics')}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Hash className="w-5 h-5 text-[#5288c1]" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-white">Topik</span>
                      <span className="text-[10px] uppercase font-bold bg-[#5288c1]/20 text-[#5288c1] px-1.5 rounded">
                        BARU
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#7f91a4]">
                    <span>{topicsEnabled ? 'Aktif' : 'Mati'}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* 5. Reaksi */}
                <div
                  id="menu-reactions"
                  onClick={() => setCurrentView('reactions')}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="w-5 h-5 text-[#5288c1]" />
                    <span className="text-sm text-white">Reaksi</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#7f91a4]">
                    <span>
                      {reactionsMode === 'all'
                        ? 'Semua reaksi'
                        : reactionsMode === 'some'
                        ? `${allowedReactions.length} reaksi`
                        : 'Tidak ada'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* 6. Perizinan */}
                <div
                  id="menu-permissions"
                  onClick={() => setCurrentView('permissions')}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-[#5288c1]" />
                    <span className="text-sm text-white">Perizinan</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#7f91a4]">
                    <span>{activeMediaCount + (permSendText ? 1 : 0) + (permAddMembers ? 1 : 0) + (permPinMessages ? 1 : 0) + (permChangeChatInfo ? 1 : 0)}/14</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* 7. Tautan Undangan */}
                <div
                  id="menu-invite-links"
                  onClick={() => setCurrentView('invite_links')}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LinkIcon className="w-5 h-5 text-[#5288c1]" />
                    <span className="text-sm text-white">Tautan Undangan</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#7f91a4]">
                    <span>{(chat.customLinks?.length || 1)} tautan</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* 8. Admin */}
                <div
                  id="menu-admins"
                  onClick={() => setCurrentView('admins')}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#5288c1]" />
                    <span className="text-sm text-white">Admin</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#7f91a4]">
                    <span>{(chat.adminIds?.length || 1)}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* 9. Anggota */}
                <div
                  id="menu-members"
                  onClick={() => setCurrentView('members')}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-[#5288c1]" />
                    <span className="text-sm text-white">Anggota</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#7f91a4]">
                    <span>{currentParticipants.length}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* 10. Boost untuk Grup */}
                <div
                  id="menu-boosts"
                  onClick={() => setCurrentView('boosts')}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <span className="text-sm text-white">Boost untuk Grup</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#7f91a4]">
                    <span>Level {chat.appearance?.boostLevel || 0}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* 11. Tindakan Terkini */}
                <div
                  id="menu-recent-actions"
                  onClick={() => setCurrentView('recent_actions')}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#5288c1]" />
                    <span className="text-sm text-white">Tindakan Terkini</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>

              {/* Danger Zone: Hapus dan Keluar Grup */}
              <div className="p-4">
                <button
                  id="btn-delete-and-leave-group"
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Apakah Anda yakin ingin menghapus dan keluar dari grup ini?')) {
                      await onDeleteGroup(chat.id);
                      onClose();
                    }
                  }}
                  className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer border border-red-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus dan keluar grup</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBVIEW 1: TIPE GRUP (Pengaturan Grup) */}
        {/* ------------------------------------------------------------- */}
        {currentView === 'group_type' && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2.5 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('main')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-white">Pengaturan Grup</h2>
              </div>
              <button
                onClick={handleApplySubView} disabled={isSaving}
                className="p-1.5 text-[#5288c1] hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Radio Group Type */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#5288c1] uppercase">Tipe Grup</span>
                <div className="space-y-2">
                  <div
                    onClick={() => setGroupType('private')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 ${
                      groupType === 'private'
                        ? 'bg-[#202b36] border-[#5288c1]'
                        : 'bg-[#1c2733] border-[#2e3c4e] hover:bg-[#202b36]'
                    }`}
                  >
                    <div className="pt-0.5">
                      <div className={`w-5 h-5 rounded-full border-[2px] flex items-center justify-center ${groupType === 'private' ? 'border-[#5288c1]' : 'border-slate-500'}`}>
                        {groupType === 'private' && <div className="w-2.5 h-2.5 rounded-full bg-[#5288c1]" />}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-white block">Grup Pribadi</span>
                      <p className="text-xs text-[#7f91a4] mt-0.5 leading-relaxed">
                        Pengguna dapat masuk grup privat hanya jika diundang atau punya tautan undangan.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setGroupType('public')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 ${
                      groupType === 'public'
                        ? 'bg-[#202b36] border-[#5288c1]'
                        : 'bg-[#1c2733] border-[#2e3c4e] hover:bg-[#202b36]'
                    }`}
                  >
                    <div className="pt-0.5">
                      <div className={`w-5 h-5 rounded-full border-[2px] flex items-center justify-center ${groupType === 'public' ? 'border-[#5288c1]' : 'border-slate-500'}`}>
                        {groupType === 'public' && <div className="w-2.5 h-2.5 rounded-full bg-[#5288c1]" />}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-white block">Grup Publik</span>
                      <p className="text-xs text-[#7f91a4] mt-0.5 leading-relaxed">
                        Grup publik dapat ditemukan dalam fitur pencarian, riwayat obrolan tersedia bagi semua orang, dan siapa pun dapat bergabung.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Public link input or Private invite link */}
              {groupType === 'public' ? (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#5288c1] uppercase">Tautan Publik</span>
                  <div className="flex items-center bg-[#202b36] border border-[#2e3c4e] rounded-xl px-3 py-2">
                    <span className="text-sm text-slate-400">t.me/</span>
                    <input
                      type="text"
                      placeholder="tautan"
                      value={publicUsername}
                      onChange={(e) => setPublicUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      className="w-full bg-transparent text-sm text-white focus:outline-none pl-1"
                    />
                  </div>
                  <span className="text-[11px] text-[#7f91a4]">
                    Anda dapat menggunakan a–z, 0–9, dan garis bawah. Panjang minimum adalah 5 karakter.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#5288c1] uppercase">Tautan Undangan</span>
                  <div className="bg-[#202b36] border border-[#2e3c4e] rounded-xl p-3.5 flex items-center justify-between">
                    <span className="text-xs font-mono text-white truncate max-w-[200px]">
                      {chat.inviteLink || 'https://t.me/+q8R-kUJ_GOYSNjdl'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(chat.inviteLink || 'https://t.me/+q8R-kUJ_GOYSNjdl')}
                        className="px-2.5 py-1 bg-[#5288c1] hover:bg-[#4374a8] text-xs font-medium rounded-lg cursor-pointer"
                      >
                        Salin
                      </button>
                      <button
                        onClick={() => handleCopy(chat.inviteLink || 'https://t.me/+q8R-kUJ_GOYSNjdl')}
                        className="p-1.5 text-slate-400 hover:text-white bg-[#2e3c4e] rounded-lg cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Manage invite links button */}
              <div
                onClick={() => setCurrentView('invite_links')}
                className="p-3 bg-[#202b36] hover:bg-[#273442] rounded-xl border border-[#2e3c4e] cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <LinkIcon className="w-4 h-4 text-[#5288c1]" />
                  <span className="text-sm font-medium">Kelola Tautan Undangan</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="pr-4">
                    <span className="text-sm font-semibold block">Setujui anggota baru</span>
                    <span className="text-xs text-[#7f91a4]">Admin harus menyetujui pengguna yang ingin bergabung melalui tautan</span>
                  </div>
                  <ToggleSwitch checked={approveNewMembers} onChange={setApproveNewMembers} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="pr-4">
                    <span className="text-sm font-semibold block">Batasi penyimpanan konten</span>
                    <span className="text-xs text-[#7f91a4]">Anggota tidak dapat menyalin, menyimpan, atau meneruskan konten dari grup ini</span>
                  </div>
                  <ToggleSwitch checked={restrictContentSaving} onChange={setRestrictContentSaving} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBVIEW 2: TAMPILAN */}
        {/* ------------------------------------------------------------- */}
        {currentView === 'appearance' && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2.5 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('main')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-white">Tampilan</h2>
              </div>
              <button
                onClick={() => {
                  showToast('Tampilan berhasil diperbarui');
                  setCurrentView('main');
                }}
                className="p-1.5 text-[#5288c1] hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Color Palettes */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#5288c1] uppercase">Warna Ikon Grup</span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {[
                    '#4fae4e', '#5288c1', '#e17076', '#eea034', 
                    '#7bc862', '#65aadd', '#a695e7', '#ee7aae',
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444'
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-10 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                        color === c ? 'ring-2 ring-white scale-105 shadow-md' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wallpaper Backgrounds */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5288c1] uppercase">Latar Grup</span>
                  <span className="text-[11px] text-amber-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Level 10
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PRESET_WALLPAPERS.map((wp) => (
                    <div
                      key={wp.id}
                      onClick={() => setSelectedWallpaper(wp.id)}
                      className={`h-24 rounded-xl border p-2 flex flex-col justify-end cursor-pointer transition-all ${
                        selectedWallpaper === wp.id
                          ? 'border-[#5288c1] ring-1 ring-[#5288c1]'
                          : 'border-[#2e3c4e] hover:border-slate-500'
                      }`}
                      style={{ backgroundColor: wp.color }}
                    >
                      <span className="text-xs font-medium text-white truncate">{wp.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Level Badges */}
              <div className="bg-[#202b36] border border-[#2e3c4e] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Logo Profil</span>
                  <span className="text-xs text-amber-400 font-semibold">Level 5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Paket Emoji Grup</span>
                  <span className="text-xs text-amber-400 font-semibold">Level 4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status Emoji Grup</span>
                  <span className="text-xs text-amber-400 font-semibold">Level 8</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBVIEW 3: RIWAYAT OBROLAN */}
        {/* ------------------------------------------------------------- */}
        {currentView === 'chat_history' && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2.5 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('main')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-white">Riwayat Obrolan</h2>
              </div>
              <button
                onClick={handleApplySubView} disabled={isSaving}
                className="p-1.5 text-[#5288c1] hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div
                onClick={() => setChatHistoryVisibility('visible')}
                className={`p-4 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 ${
                  chatHistoryVisibility === 'visible'
                    ? 'bg-[#202b36] border-[#5288c1]'
                    : 'bg-[#1c2733] border-[#2e3c4e] hover:bg-[#202b36]'
                }`}
              >
                <div className="pt-0.5">
                  <div className={`w-5 h-5 rounded-full border-[2px] flex items-center justify-center ${chatHistoryVisibility === 'visible' ? 'border-[#5288c1]' : 'border-slate-500'}`}>
                    {chatHistoryVisibility === 'visible' && <div className="w-2.5 h-2.5 rounded-full bg-[#5288c1]" />}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-white block">Terlihat</span>
                  <p className="text-xs text-[#7f91a4] mt-0.5 leading-relaxed">
                    Anggota baru dapat melihat pesan obrolan sebelumnya yang dikirim sebelum mereka bergabung.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setChatHistoryVisibility('hidden')}
                className={`p-4 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 ${
                  chatHistoryVisibility === 'hidden'
                    ? 'bg-[#202b36] border-[#5288c1]'
                    : 'bg-[#1c2733] border-[#2e3c4e] hover:bg-[#202b36]'
                }`}
              >
                <div className="pt-0.5">
                  <div className={`w-5 h-5 rounded-full border-[2px] flex items-center justify-center ${chatHistoryVisibility === 'hidden' ? 'border-[#5288c1]' : 'border-slate-500'}`}>
                    {chatHistoryVisibility === 'hidden' && <div className="w-2.5 h-2.5 rounded-full bg-[#5288c1]" />}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-white block">Tersembunyi</span>
                  <p className="text-xs text-[#7f91a4] mt-0.5 leading-relaxed">
                    Anggota baru hanya dapat melihat 100 pesan terakhir saat mereka baru bergabung.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBVIEW 4: TOPIK */}
        {/* ------------------------------------------------------------- */}
        {currentView === 'topics' && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2.5 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('main')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-white">Topik</h2>
              </div>
              <button
                onClick={handleApplySubView} disabled={isSaving}
                className="p-1.5 text-[#5288c1] hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              <div className="flex items-center justify-between bg-[#202b36] p-4 rounded-xl border border-[#2e3c4e]">
                <div>
                  <span className="text-sm font-semibold block">Aktifkan Topik</span>
                  <span className="text-xs text-[#7f91a4] leading-relaxed">
                    Obrolan grup akan dipilah menjadi beberapa topik yang dibuat oleh admin atau pengguna.
                  </span>
                </div>
                <ToggleSwitch checked={topicsEnabled} onChange={setTopicsEnabled} />
              </div>

              {topicsEnabled && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#5288c1] uppercase">Tata Letak Topik</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTopicsLayout('tabs')}
                      className={`p-3 rounded-xl border text-center text-xs font-semibold cursor-pointer ${
                        topicsLayout === 'tabs' ? 'bg-[#5288c1] border-[#5288c1] text-white' : 'bg-[#202b36] border-[#2e3c4e] text-slate-300'
                      }`}
                    >
                      Tab di Bagian Atas
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopicsLayout('list')}
                      className={`p-3 rounded-xl border text-center text-xs font-semibold cursor-pointer ${
                        topicsLayout === 'list' ? 'bg-[#5288c1] border-[#5288c1] text-white' : 'bg-[#202b36] border-[#2e3c4e] text-slate-300'
                      }`}
                    >
                      Daftar Topik
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBVIEW 5: REAKSI */}
        {/* ------------------------------------------------------------- */}
        {currentView === 'reactions' && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2.5 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('main')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-white">Reaksi</h2>
              </div>
              <button
                onClick={handleApplySubView} disabled={isSaving}
                className="p-1.5 text-[#5288c1] hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-2">
                {[
                  { id: 'all', label: 'Semua reaksi', desc: 'Anggota grup dapat menggunakan emoji apa pun sebagai reaksi.' },
                  { id: 'some', label: 'Beberapa reaksi', desc: 'Hanya reaksi yang dipilih berikut yang dapat digunakan.' },
                  { id: 'none', label: 'Tidak ada reaksi', desc: 'Reaksi dinonaktifkan di grup ini.' },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setReactionsMode(item.id as any)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 ${
                      reactionsMode === item.id
                        ? 'bg-[#202b36] border-[#5288c1]'
                        : 'bg-[#1c2733] border-[#2e3c4e] hover:bg-[#202b36]'
                    }`}
                  >
                    <div className="pt-0.5">
                      <div className={`w-5 h-5 rounded-full border-[2px] flex items-center justify-center ${reactionsMode === item.id ? 'border-[#5288c1]' : 'border-slate-500'}`}>
                        {reactionsMode === item.id && <div className="w-2.5 h-2.5 rounded-full bg-[#5288c1]" />}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-white block">{item.label}</span>
                      <p className="text-xs text-[#7f91a4] mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {reactionsMode === 'some' && (
                <div className="pt-2 space-y-2">
                  <span className="text-xs font-bold text-[#5288c1] uppercase">Pilih Emoji yang Diizinkan</span>
                  <div className="divide-y divide-[#2e3c4e] bg-[#202b36] border border-[#2e3c4e] rounded-xl overflow-hidden">
                    {REACTION_LIST.map((r) => {
                      const isAllowed = allowedReactions.includes(r.emoji);
                      return (
                        <div
                          key={r.emoji}
                          onClick={() => {
                            setAllowedReactions((prev) =>
                              prev.includes(r.emoji) ? prev.filter((e) => e !== r.emoji) : [...prev, r.emoji]
                            );
                          }}
                          className="flex items-center justify-between px-3.5 py-2.5 hover:bg-[#273442] cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{r.emoji}</span>
                            <span className="text-xs text-white">{r.name}</span>
                          </div>
                          <ToggleSwitch checked={isAllowed} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBVIEW 6: PERIZINAN (14/14) */}
        {/* ------------------------------------------------------------- */}
        {currentView === 'permissions' && (
          <div className="flex flex-col h-full relative">
            <div className="px-4 py-2.5 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('main')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-white">Perizinan</h2>
              </div>
              <button
                onClick={() => {
                  setHasUnsavedPerms(false);
                  setCurrentView('main');
                }}
                className="p-1.5 text-[#5288c1] hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
              <span className="text-xs font-bold text-[#5288c1] uppercase block">
                Apa yang dapat dilakukan anggota grup ini?
              </span>

              <div className="bg-[#202b36] border border-[#2e3c4e] rounded-xl divide-y divide-[#2e3c4e]/60">
                {/* 1. Kirim Pesan Teks */}
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-sm">Kirim Pesan Teks</span>
                  <ToggleSwitch checked={permSendText} onChange={(c) => { setPermSendText(c);
                      setHasUnsavedPerms(true); }} />
                </div>

                {/* 2. Kirim Media (Accordion) */}
                <div>
                  <div
                    onClick={() => setIsMediaAccordionOpen(!isMediaAccordionOpen)}
                    className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-[#273442] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Kirim Media</span>
                      <span className="text-xs text-[#5288c1]">({activeMediaCount}/9)</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isMediaAccordionOpen ? 'rotate-90' : ''}`} />
                  </div>

                  {isMediaAccordionOpen && (
                    <div className="pl-6 pr-3.5 py-2 space-y-2 bg-[#1c2733] border-t border-[#2e3c4e]/40">
                      {[
                        { key: 'photos', label: 'Foto' },
                        { key: 'videos', label: 'Video' },
                        { key: 'stickersGifs', label: 'Stiker & GIF' },
                        { key: 'music', label: 'Musik' },
                        { key: 'files', label: 'Berkas' },
                        { key: 'voiceNotes', label: 'Pesan Suara' },
                        { key: 'videoNotes', label: 'Pesan Video' },
                        { key: 'embeddedLinks', label: 'Tautan Tertanam' },
                        { key: 'polls', label: 'Pol' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-1">
                          <span className="text-xs text-slate-300">{item.label}</span>
                          <ToggleSwitch 
                            checked={(permMedia as any)[item.key] ?? true}
                            onChange={(c) => {
                              setPermMedia((prev) => ({ ...prev, [item.key]: c }));
                              setHasUnsavedPerms(true);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Tambah Anggota */}
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-sm">Tambah Anggota</span>
                  <ToggleSwitch checked={permAddMembers} onChange={(c) => { setPermAddMembers(c);
                      setHasUnsavedPerms(true); }} />
                </div>

                {/* 4. Semat Pesan */}
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-sm">Semat Pesan</span>
                  <ToggleSwitch checked={permPinMessages} onChange={(c) => { setPermPinMessages(c);
                      setHasUnsavedPerms(true); }} />
                </div>

                {/* 5. Ubah Info Obrolan */}
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-sm">Ubah Info Obrolan</span>
                  <ToggleSwitch checked={permChangeChatInfo} onChange={(c) => { setPermChangeChatInfo(c);
                      setHasUnsavedPerms(true); }} />
                </div>
              </div>

              {/* Stars Per Message */}
              <div className="bg-[#202b36] border border-[#2e3c4e] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold">Biaya Stars untuk Pesan</span>
                  </div>
                  <ToggleSwitch checked={starsEnabled} onChange={(c) => { setStarsEnabled(c);
                      setHasUnsavedPerms(true); }} />
                </div>
                {starsEnabled && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Biaya: {starsCount} Stars</span>
                      <span className="text-amber-400 font-bold">{starsCount} ⭐️</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={starsCount}
                      onChange={(e) => {
                        setStarsCount(Number(e.target.value));
                        setHasUnsavedPerms(true);
                      }}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Mode Lambat Slider */}
              <div className="bg-[#202b36] border border-[#2e3c4e] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Mode Lambat</span>
                  <span className="text-xs text-[#5288c1] font-semibold">
                    {slowMode === 0 ? 'Mati' : slowMode < 60 ? `${slowMode} detik` : `${Math.round(slowMode / 60)} menit`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={600}
                  step={10}
                  value={slowMode}
                  onChange={(e) => {
                    setSlowMode(Number(e.target.value));
                    setHasUnsavedPerms(true);
                  }}
                  className="w-full accent-[#5288c1] cursor-pointer"
                />
                <span className="text-[11px] text-[#7f91a4] block">
                  Anggota harus menunggu sebelum mengirim pesan berikutnya.
                </span>
              </div>
            </div>

            {/* Unsaved Changes Banner (Sticky at bottom, matches video) */}
            {hasUnsavedPerms && (
              <div className="absolute bottom-0 inset-x-0 bg-[#242f3d] border-t border-[#313d4f] p-3.5 flex items-center justify-between shadow-2xl z-20">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-amber-400">Perubahan Belum Tersimpan</span>
                  <span className="text-[11px] text-slate-300">Anda telah mengubah perizinan di grup ini.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setHasUnsavedPerms(false);
                      setCurrentView('main');
                    }}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Buang
                  </button>
                  <button
                    onClick={handleApplySubView}
                    className="px-3.5 py-1.5 bg-[#5288c1] hover:bg-[#4374a8] text-white font-semibold text-xs rounded-lg cursor-pointer shadow"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBVIEW 7: KELOLA TAUTAN UNDANGAN */}
        {/* ------------------------------------------------------------- */}
        {currentView === 'invite_links' && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2.5 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('main')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-white">Tautan Undangan</h2>
              </div>
              <button
                onClick={() => setCurrentView('create_invite_link')}
                className="p-1.5 text-[#5288c1] hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                title="Buat Tautan Baru"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Primary Link Card */}
              <div className="bg-[#202b36] border border-[#2e3c4e] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5288c1] uppercase">Tautan Utama</span>
                  <span className="text-[11px] text-[#7f91a4]">Permanen</span>
                </div>
                <div className="font-mono text-sm text-white break-all">
                  {chat.inviteLink || 'https://t.me/+q8R-kUJ_GOYSNjdl'}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleCopy(chat.inviteLink || 'https://t.me/+q8R-kUJ_GOYSNjdl')}
                    className="flex-1 py-2 bg-[#5288c1] hover:bg-[#4374a8] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Tautan</span>
                  </button>
                  <button
                    onClick={() => handleCopy(chat.inviteLink || 'https://t.me/+q8R-kUJ_GOYSNjdl')}
                    className="p-2 bg-[#2e3c4e] hover:bg-[#394a5f] text-slate-300 hover:text-white rounded-lg cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Create New Link Action */}
              <button
                onClick={() => setCurrentView('create_invite_link')}
                className="w-full py-3 bg-[#202b36] hover:bg-[#273442] border border-[#2e3c4e] rounded-xl text-xs font-semibold text-[#5288c1] flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Tautan Baru</span>
              </button>

              {/* List of custom links if any */}
              {chat.customLinks && chat.customLinks.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-[#5288c1] uppercase">Tautan Kustom</span>
                  {chat.customLinks.map((l) => (
                    <div key={l.id} className="bg-[#202b36] border border-[#2e3c4e] rounded-xl p-3 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <span className="text-xs font-semibold text-white block truncate">{l.name || 'Tautan'}</span>
                        <span className="text-[11px] font-mono text-slate-400 truncate block">{l.link}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(l.link)}
                        className="p-1.5 text-slate-400 hover:text-white bg-[#2e3c4e] rounded-lg cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBVIEW 8: BUAT TAUTAN BARU */}
        {/* ------------------------------------------------------------- */}
        {currentView === 'create_invite_link' && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2.5 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('invite_links')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-white">Tautan Baru</h2>
              </div>
              <button
                onClick={handleCreateNewInviteLink}
                className="p-1.5 text-[#5288c1] hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="space-y-1">
                <span className="text-xs text-[#7f91a4]">Nama Tautan (opsional)</span>
                <input
                  type="text"
                  placeholder="Misal: Promo Twitter"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  className="w-full bg-[#202b36] border border-[#2e3c4e] rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between bg-[#202b36] border border-[#2e3c4e] p-3.5 rounded-xl">
                <div>
                  <span className="text-sm font-semibold block">Butuh Persetujuan Admin</span>
                  <span className="text-xs text-[#7f91a4]">Pengguna yang membuka tautan harus disetujui</span>
                </div>
                <ToggleSwitch checked={newLinkRequireApproval} onChange={setNewLinkRequireApproval} />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-[#5288c1] uppercase">Limit berdasarkan waktu</span>
                <div className="grid grid-cols-4 gap-2">
                  {['1 Jam', '1 Hari', '1 Minggu', 'Tak Terbatas'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewLinkTimeLimit(t)}
                      className={`py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        newLinkTimeLimit === t ? 'bg-[#5288c1] text-white' : 'bg-[#202b36] text-slate-300 hover:bg-[#273442]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-[#5288c1] uppercase">Limit jumlah pengguna</span>
                <div className="grid grid-cols-4 gap-2">
                  {['1', '10', '100', 'Tak Terbatas'].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setNewLinkUserLimit(u)}
                      className={`py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        newLinkUserLimit === u ? 'bg-[#5288c1] text-white' : 'bg-[#202b36] text-slate-300 hover:bg-[#273442]'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateNewInviteLink}
                className="w-full py-3 bg-[#5288c1] hover:bg-[#4374a8] text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Buat Tautan
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBVIEW 9: ADMIN */}
        {/* ------------------------------------------------------------- */}
        {currentView === 'admins' && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2.5 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('main')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-white">Admin</h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#5288c1] uppercase">Daftar Admin</span>
                <div className="divide-y divide-[#2e3c4e] bg-[#202b36] border border-[#2e3c4e] rounded-xl overflow-hidden">
                  {/* Owner */}
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={currentUser.name} avatar={currentUser.avatar} color={currentUser.color} size="md" />
                      <div>
                        <span className="text-sm font-semibold text-white block">{currentUser.name}</span>
                        <span className="text-xs text-[#5288c1]">Pemilik</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="bg-[#202b36] border border-[#2e3c4e] p-3.5 rounded-xl flex items-center justify-between">
                  <div className="pr-3">
                    <span className="text-sm font-semibold block">Anti-Spam Agresif</span>
                    <span className="text-xs text-[#7f91a4]">Penyaringan spam ketat untuk pesan masuk</span>
                  </div>
                  <ToggleSwitch checked={antiSpamAggressive} onChange={setAntiSpamAggressive} />
                </div>

                <div className="bg-[#202b36] border border-[#2e3c4e] p-3.5 rounded-xl flex items-center justify-between">
                  <div className="pr-3">
                    <span className="text-sm font-semibold block">Sembunyikan Anggota</span>
                    <span className="text-xs text-[#7f91a4]">Hanya admin yang dapat melihat daftar anggota grup</span>
                  </div>
                  <ToggleSwitch checked={hideMembers} onChange={setHideMembers} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBVIEW 10: ANGGOTA */}
        {/* ------------------------------------------------------------- */}
        {currentView === 'members' && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2.5 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('main')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-white">Anggota ({currentParticipants.length})</h2>
              </div>
              <button
                onClick={() => setCurrentView('add_members_picker')}
                className="p-1.5 text-[#5288c1] hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                title="Tambah Anggota"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#2e3c4e]/50">
              {/* Add member row */}
              <div
                onClick={() => setCurrentView('add_members_picker')}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#5288c1]/20 text-[#5288c1] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-[#5288c1]">Tambah Anggota</span>
              </div>

              {/* Invite via link row */}
              <div
                onClick={() => setCurrentView('invite_links')}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#5288c1]/20 text-[#5288c1] flex items-center justify-center">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-[#5288c1]">Undang melalui Tautan</span>
              </div>

              {/* Member list */}
              {currentParticipants.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[#202b36] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      name={member.name}
                      username={member.username}
                      avatar={member.avatar}
                      color={member.color}
                      size="md"
                      isOnline={member.isOnline}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-white truncate">
                        {member.name} {member.id === currentUser.id ? '(Anda)' : ''}
                      </span>
                      <span className="text-xs text-[#7f91a4] truncate">
                        {member.id === chat.ownerId ? (
                          <span className="text-[#5288c1] font-semibold">Pemilik</span>
                        ) : member.isOnline ? (
                          <span className="text-[#5288c1]">online</span>
                        ) : (
                          member.lastSeen || 'terlihat belakangan ini'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Remove button if owner and not self */}
                  {isOwner && member.id !== currentUser.id && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                      title="Keluarkan dari grup"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBVIEW 11: TAMBAH ANGGOTA PICKER */}
        {/* ------------------------------------------------------------- */}
        {currentView === 'add_members_picker' && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2.5 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('members')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-white">Tambah Anggota</h2>
              </div>
              {selectedNewMemberIds.length > 0 && (
                <button
                  onClick={handleAddSelectedMembers}
                  className="p-1.5 text-[#5288c1] hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                >
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </button>
              )}
            </div>

            <div className="p-3 bg-[#17212b] border-b border-[#242f3d]">
              <input
                type="text"
                placeholder="Cari kontak..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full bg-[#242f3d] text-white text-sm rounded-xl px-3 py-2 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#2e3c4e]/50">
              {nonMemberUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#7f91a4]">
                  Semua kontak Anda sudah berada di grup ini.
                </div>
              ) : (
                nonMemberUsers.map((u) => {
                  const isSelected = selectedNewMemberIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedNewMemberIds((prev) =>
                          prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                        );
                      }}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar name={u.name} avatar={u.avatar} color={u.color} size="md" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-white truncate">{u.name}</span>
                          <span className="text-xs text-[#7f91a4] truncate">
                            {u.isOnline ? 'online' : (u.lastSeen || 'terlihat belakangan ini')}
                          </span>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${isSelected ? 'bg-[#5288c1] border-[#5288c1] text-white' : 'border-slate-500'}`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBVIEW 12: BOOST UNTUK GRUP */}
        {/* ------------------------------------------------------------- */}
        {currentView === 'boosts' && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2.5 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('main')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-white">Boost untuk Grup</h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-linear-to-br from-amber-500/20 via-[#202b36] to-[#17212b] border border-amber-500/30 rounded-2xl p-5 text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-amber-400/20 text-amber-400 mx-auto flex items-center justify-center">
                  <Zap className="w-8 h-8 fill-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Level {chat.appearance?.boostLevel || 0}</h3>
                <p className="text-xs text-[#7f91a4]">
                  Grup memerlukan boost untuk membuka fitur seperti latar kustom, paket emoji, dan status grup.
                </p>
              </div>

              <div className="bg-[#202b36] border border-[#2e3c4e] rounded-xl p-3.5 flex items-center justify-between">
                <span className="text-xs font-mono text-white truncate max-w-[200px]">
                  t.me/boost?c={chat.id}
                </span>
                <button
                  onClick={() => handleCopy(`https://t.me/boost?c=${chat.id}`, 'Tautan Boost')}
                  className="px-3 py-1 bg-[#5288c1] hover:bg-[#4374a8] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Salin Tautan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBVIEW 13: TINDAKAN TERKINI */}
        {/* ------------------------------------------------------------- */}
        {currentView === 'recent_actions' && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2.5 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('main')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-white">Tindakan Terkini</h2>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#7f91a4] space-y-2">
              <Clock className="w-12 h-12 text-slate-600 stroke-[1.5]" />
              <span className="text-sm font-semibold text-slate-300">Belum ada tindakan baru</span>
              <p className="text-xs max-w-xs leading-relaxed">
                Riwayat tindakan administratif dalam 48 jam terakhir akan muncul di sini.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
