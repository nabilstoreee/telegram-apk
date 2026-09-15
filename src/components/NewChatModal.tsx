import React, { useState, useEffect } from 'react';
import { Users, User as UserIcon, Search, X, Check, CheckCircle2, MessageSquarePlus } from 'lucide-react';
import { User } from '../types';
import { UserAvatar } from './UserAvatar';
import { getMaskedContact } from '../utils/privacy';
import { VerifiedBadge } from './VerifiedBadge';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User;
  onStartDirectChat: (targetUser: User) => void;
  onCreateGroupChat: (name: string, participantIds: string[]) => void;
  onOpenNewGroupModal?: () => void;
  onViewContactProfile?: (targetUser: User) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onStartDirectChat,
  onCreateGroupChat,
  onOpenNewGroupModal,
  onViewContactProfile,
}) => {
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSwitchToGroup = () => {
    if (onOpenNewGroupModal) {
      onClose();
      onOpenNewGroupModal();
    } else {
      setTab('group');
    }
  };

  const otherUsers = users.filter((u) => u.id !== currentUser.id).map((u) => getMaskedContact(u, currentUser.id));

  const filteredUsers = otherUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q))
    );
  });

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    onCreateGroupChat(groupName.trim(), selectedParticipants);
    onClose();
  };

  return (
    <div 
      id="new-chat-modal-overlay" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-[#17212b] border border-[#242f3d] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 bg-[#17212b] flex items-center justify-between border-b border-[#242f3d]">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <MessageSquarePlus className="w-5 h-5 text-[#5288c1]" />
            <span>{tab === 'direct' ? 'Kontak & Mulai Obrolan' : 'Buat Grup Baru'}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-[#242f3d] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-[#242f3d] bg-[#0e1621]">
          <button
            onClick={() => setTab('direct')}
            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              tab === 'direct' ? 'text-[#5288c1] border-b-2 border-[#5288c1] bg-[#17212b]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Kirim Pesan Pribadi</span>
          </button>
          <button
            onClick={handleSwitchToGroup}
            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              tab === 'group' ? 'text-[#5288c1] border-b-2 border-[#5288c1] bg-[#17212b]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Buat Grup Baru</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-[#17212b] border-b border-[#242f3d]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#7f91a4] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pengguna berdasarkan nama atau username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#242f3d] text-white pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-[#5288c1] border border-transparent placeholder-[#7f91a4]"
            />
          </div>
        </div>

        {/* Modal Content */}
        {tab === 'group' && (
          <div className="p-3.5 bg-[#242f3d]/60 border-b border-[#242f3d]">
            <input
              type="text"
              placeholder="Nama Grup (misal: Komunitas Dev Indonesia)..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-[#242f3d] text-white px-3.5 py-2 rounded-xl text-sm border border-[#313d4f] focus:outline-none focus:border-[#5288c1] placeholder-slate-400"
            />
            {selectedParticipants.length > 0 && (
              <p className="text-[11px] text-[#5288c1] font-semibold mt-2">
                {selectedParticipants.length} anggota dipilih
              </p>
            )}
          </div>
        )}

        {/* User list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#7f91a4]">
              Tidak ada pengguna yang cocok.
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedParticipants.includes(user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => {
                    if (tab === 'direct') {
                      onStartDirectChat(user);
                      onClose();
                    } else {
                      toggleParticipant(user.id);
                    }
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#5288c1]/20 border border-[#5288c1]/40' : 'hover:bg-[#242f3d]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      onClick={(e) => {
                        if (onViewContactProfile) {
                          e.stopPropagation();
                          onViewContactProfile(user);
                        }
                      }}
                      title="Lihat Profil"
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                    >
                      <UserAvatar
                        name={user.name}
                        username={user.username}
                        avatar={user.avatar}
                        color={user.color || '#5288c1'}
                        size="md"
                        isOnline={user.isOnline}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                        <span>{user.name}</span>
                        <VerifiedBadge isVerified={user.isVerified} badgeColor={user.badgeColor} size="sm" />
                        {user.statusEmoji && <span className="text-xs">{user.statusEmoji}</span>}
                      </div>
                      <div className="text-xs flex items-center gap-1.5 truncate mt-0.5">
                        <span className="text-[#5288c1] font-semibold">@{user.username}</span>
                        <span className="text-[#7f91a4]">•</span>
                        <span className={user.isOnline ? 'text-[#4fae4e] font-medium' : 'text-[#7f91a4]'}>
                          {user.isOnline ? 'online' : (user.lastSeen || 'terakhir dilihat baru saja')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {tab === 'group' ? (
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isSelected ? 'bg-[#5288c1] border-[#5288c1] text-white' : 'border-[#313d4f] bg-[#242f3d]'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  ) : (
                    <span className="text-xs text-[#5288c1] font-semibold bg-[#242f3d] px-2.5 py-1 rounded-lg border border-[#313d4f]">
                      Kirim Pesan
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer for Group Creation */}
        {tab === 'group' && (
          <div className="p-3 bg-[#17212b] border-t border-[#242f3d]">
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim()}
              className="w-full py-2.5 bg-[#5288c1] hover:bg-[#4374a8] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Buat Grup ({selectedParticipants.length} Anggota)
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
