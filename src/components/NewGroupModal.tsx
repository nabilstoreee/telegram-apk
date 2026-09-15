import React, { useState } from 'react';
import { 
  ArrowLeft, Search, Check, Camera, Smile, 
  Clock, X, CheckCircle2, ArrowRight, Sparkles,
  Shield, UserCheck, Users, Flame, Heart
} from 'lucide-react';
import { User } from '../types';
import { UserAvatar } from './UserAvatar';
import { compressImage } from '../utils/image';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User;
  onCreateGroup: (name: string, participantIds: string[], options?: {
    avatar?: string;
    color?: string;
    autoDeleteTimer?: number;
  }) => void;
}

const PRESET_COLORS = [
  '#4fae4e', '#5288c1', '#e17076', '#eea034', 
  '#7bc862', '#65aadd', '#a695e7', '#ee7aae'
];

export const NewGroupModal: React.FC<NewGroupModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onCreateGroup,
}) => {
  // Step 1: Select members, Step 2: Name & Settings
  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Step 2 state
  const [groupName, setGroupName] = useState('');
  const [groupColor, setGroupColor] = useState('#4fae4e');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [showAutoDeleteModal, setShowAutoDeleteModal] = useState(false);
  const [autoDeleteTimer, setAutoDeleteTimer] = useState<number>(0); // 0 = Mati, 86400 = 1 hari, etc.
  const [autoDeleteLabel, setAutoDeleteLabel] = useState<string>('Mati');

  if (!isOpen) return null;

  // Filter out self and search filter
  const availableUsers = users.filter((u) => u.id !== currentUser.id);
  const filteredUsers = availableUsers.filter((u) => {
    const q = searchQuery.toLowerCase().trim().replace(/^@/, '');
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  });

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleProceedToStep2 = () => {
    if (selectedUserIds.length === 0) return;
    
    // Suggest default group name based on first selected contacts (like Telegram)
    const selectedObjs = users.filter((u) => selectedUserIds.includes(u.id));
    if (selectedObjs.length === 1) {
      setGroupName(selectedObjs[0].name);
    } else if (selectedObjs.length === 2) {
      setGroupName(`${selectedObjs[0].name} dan ${selectedObjs[1].name}`);
    } else if (selectedObjs.length > 2) {
      setGroupName(`${selectedObjs[0].name}, ${selectedObjs[1].name} dan lainnya`);
    }
    setStep(2);
  };

  const handleCreate = () => {
    if (!groupName.trim()) return;
    onCreateGroup(groupName.trim(), selectedUserIds, {
      avatar: groupAvatar,
      color: groupColor,
      autoDeleteTimer,
    });
    // Reset and close
    setStep(1);
    setSelectedUserIds([]);
    setGroupName('');
    setGroupAvatar('');
    onClose();
  };

  const handleSetAutoDelete = (seconds: number, label: string) => {
    setAutoDeleteTimer(seconds);
    setAutoDeleteLabel(label);
    setShowAutoDeleteModal(false);
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const compressed = await compressImage(base64Data);
          setGroupAvatar(compressed);
        } catch (err) {
          console.error(err);
          setGroupAvatar(base64Data);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#17212b] w-full max-w-md h-full sm:h-[620px] rounded-none sm:rounded-2xl border border-[#242f3d] flex flex-col shadow-2xl overflow-hidden relative text-white">
        
        {/* STEP 1: MEMBER SELECTION */}
        {step === 1 && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3.5 bg-[#17212b] border-b border-[#242f3d] flex items-center gap-3">
              <button
                id="btn-close-new-group-step1"
                onClick={() => {
                  setStep(1);
                  setSelectedUserIds([]);
                  onClose();
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex flex-col">
                <h2 className="text-base font-semibold text-white leading-tight">Grup Baru</h2>
                <span className="text-xs text-[#7f91a4]">
                  {selectedUserIds.length > 0
                    ? `${selectedUserIds.length} dari 200.000 terpilih`
                    : 'hingga 200.000 anggota'}
                </span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-3 bg-[#17212b] border-b border-[#242f3d]">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  id="input-search-group-members"
                  type="text"
                  placeholder="Siapa yang ingin Anda tambahkan?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#242f3d] text-white text-sm rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#5288c1] placeholder:text-slate-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Selected Chips */}
            {selectedUserIds.length > 0 && (
              <div className="px-3 py-2 bg-[#1c2733] border-b border-[#242f3d] flex items-center gap-2 overflow-x-auto no-scrollbar">
                {selectedUserIds.map((userId) => {
                  const u = users.find((item) => item.id === userId);
                  if (!u) return null;
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleSelectUser(u.id)}
                      className="flex items-center gap-1.5 bg-[#242f3d] text-white px-2 py-1 rounded-full text-xs shrink-0 cursor-pointer hover:bg-[#2e3c4e] transition-colors"
                    >
                      <UserAvatar name={u.name} avatar={u.avatar} color={u.color} size="xs" />
                      <span className="max-w-[90px] truncate">{u.name}</span>
                      <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Contact List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#242f3d]/40">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-[#7f91a4] text-sm">
                  Tidak ada kontak yang ditemukan.
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      id={`contact-item-${user.id}`}
                      onClick={() => toggleSelectUser(user.id)}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <UserAvatar
                            name={user.name}
                            username={user.username}
                            avatar={user.avatar}
                            color={user.color}
                            size="md"
                            isOnline={user.isOnline}
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-white truncate">
                            {user.name}
                          </span>
                          <span className="text-xs text-[#7f91a4] truncate">
                            {user.isOnline ? (
                              <span className="text-[#5288c1]">online</span>
                            ) : (
                              user.lastSeen || 'terlihat belakangan ini'
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Telegram Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-[#5288c1] border-[#5288c1] text-white'
                            : 'border-slate-500 hover:border-slate-400 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Floating Action Button (Arrow Right) */}
            {selectedUserIds.length > 0 && (
              <button
                id="btn-new-group-next"
                onClick={handleProceedToStep2}
                className="absolute bottom-5 right-5 w-14 h-14 bg-[#5288c1] hover:bg-[#4374a8] active:scale-95 text-white rounded-full shadow-lg flex items-center justify-center transition-all cursor-pointer z-30"
                title="Lanjutkan"
              >
                <ArrowRight className="w-6 h-6 stroke-[2.5]" />
              </button>
            )}
          </div>
        )}

        {/* STEP 2: GROUP NAME & SETTINGS */}
        {step === 2 && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3.5 bg-[#17212b] border-b border-[#242f3d] flex items-center gap-3">
              <button
                id="btn-back-to-step1"
                onClick={() => setStep(1)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base font-semibold text-white">Grup Baru</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Group Photo & Name Row */}
              <div className="flex items-center gap-4">
                {/* Photo Picker */}
                <label
                  htmlFor="group-avatar-upload"
                  className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer relative group shrink-0 overflow-hidden shadow-inner border border-white/10"
                  style={{ backgroundColor: groupColor }}
                >
                  {groupAvatar ? (
                    <img
                      src={groupAvatar}
                      alt="Group Avatar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Camera className="w-7 h-7 text-white/90 group-hover:scale-110 transition-transform" />
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <input
                    id="group-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFile}
                    className="hidden"
                  />
                </label>

                {/* Group Name Input */}
                <div className="flex-1 relative flex items-center">
                  <input
                    id="input-new-group-name"
                    type="text"
                    placeholder="Nama grup"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-transparent border-b-2 border-[#5288c1] text-white text-base py-2 pr-9 focus:outline-none placeholder:text-slate-500 font-medium"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setGroupName((prev) => prev + ' 🌟')}
                    className="absolute right-1 text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Color Swatches */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-[#7f91a4] mr-1">Warna:</span>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setGroupColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                      groupColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#17212b]' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Auto Delete Messages Row (Hapus Pesan Otomatis) */}
              <div
                id="btn-auto-delete-setting"
                onClick={() => setShowAutoDeleteModal(true)}
                className="p-3.5 bg-[#202b36] hover:bg-[#273442] rounded-xl cursor-pointer transition-colors flex items-center justify-between border border-[#2e3c4e]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#2a3848] text-[#5288c1] rounded-lg">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">Hapus Pesan Otomatis</span>
                    <span className="text-xs text-[#7f91a4] leading-relaxed line-clamp-1">
                      Secara otomatis menghapus pesan dalam grup ini untuk semua anggota...
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#5288c1] bg-[#5288c1]/10 px-2 py-1 rounded">
                  {autoDeleteLabel}
                </span>
              </div>

              {/* Selected Members Section Header */}
              <div className="pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#5288c1] mb-2 px-1">
                  {selectedUserIds.length} anggota
                </div>
                <div className="space-y-1.5 max-h-[190px] overflow-y-auto">
                  {selectedUserIds.map((userId) => {
                    const u = users.find((item) => item.id === userId);
                    if (!u) return null;
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#202b36]/60 border border-[#2e3c4e]/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            name={u.name}
                            username={u.username}
                            avatar={u.avatar}
                            color={u.color}
                            size="sm"
                            isOnline={u.isOnline}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-white truncate">
                              {u.name}
                            </span>
                            <span className="text-[11px] text-[#7f91a4] truncate">
                              {u.isOnline ? 'online' : (u.lastSeen || 'terlihat belakangan ini')}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSelectUser(u.id)}
                          className="text-slate-400 hover:text-red-400 p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Floating Action Button (Create Checkmark) */}
            <button
              id="btn-new-group-create"
              onClick={handleCreate}
              disabled={!groupName.trim()}
              className={`absolute bottom-5 right-5 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all cursor-pointer z-30 ${
                groupName.trim()
                  ? 'bg-[#5288c1] hover:bg-[#4374a8] active:scale-95 text-white'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
              title="Buat Grup"
            >
              <Check className="w-6 h-6 stroke-[3]" />
            </button>
          </div>
        )}

        {/* Auto Delete Popup Modal */}
        {showAutoDeleteModal && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#1c2733] border border-[#2e3c4e] rounded-2xl p-5 w-full max-w-sm text-white shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#2e3c4e] pb-3">
                <h3 className="font-semibold text-base">Hapus Pesan Otomatis</h3>
                <button
                  onClick={() => setShowAutoDeleteModal(false)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#7f91a4] leading-relaxed">
                Secara otomatis menghapus pesan dalam grup ini untuk semua anggota setelah jangka waktu tertentu.
              </p>

              <div className="space-y-1">
                {[
                  { label: 'Mati', seconds: 0 },
                  { label: '1 hari', seconds: 86400 },
                  { label: '1 minggu', seconds: 604800 },
                  { label: '1 bulan', seconds: 2592000 },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => handleSetAutoDelete(opt.seconds, opt.label)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                      autoDeleteTimer === opt.seconds
                        ? 'bg-[#5288c1] text-white font-semibold'
                        : 'hover:bg-[#242f3d] text-slate-200'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {autoDeleteTimer === opt.seconds && <Check className="w-4 h-4 stroke-[2.5]" />}
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowAutoDeleteModal(false)}
                  className="px-4 py-2 bg-[#242f3d] hover:bg-[#2e3c4e] text-xs font-semibold rounded-lg text-white cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
