import React, { useState } from 'react';
import { 
  ArrowLeft, Edit3, MoreVertical, MessageSquare, 
  Bell, BellOff, Video, LogOut, UserPlus, Link as LinkIcon,
  Trash2, Search, Clock, Plus, CheckCircle2, Shield, X,
  Share2, Copy
} from 'lucide-react';
import { Chat, User } from '../types';
import { UserAvatar, getAvatarLetter } from './UserAvatar';
import { GroupEditModal } from './GroupEditModal';
import { VerifiedBadge } from './VerifiedBadge';

interface GroupProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
  currentUser: User;
  allUsers: User[];
  onUpdateGroup: (chatId: string, updates: Partial<Chat>) => Promise<void>;
  onDeleteGroup: (chatId: string) => Promise<void>;
  onAddMembers: (chatId: string, participantIds: string[]) => Promise<void>;
  onLeaveGroup?: (chatId: string) => Promise<void>;
}

export const GroupProfileModal: React.FC<GroupProfileModalProps> = ({
  isOpen,
  onClose,
  chat,
  currentUser,
  allUsers,
  onUpdateGroup,
  onDeleteGroup,
  onAddMembers,
  onLeaveGroup,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [selectedAddUserIds, setSelectedAddUserIds] = useState<string[]>([]);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  
  const isGroup = chat.type === 'group';
  const isAdminOrOwner = isGroup && (chat.ownerId === currentUser.id || chat.adminIds?.includes(currentUser.id));
  const canChangeChatInfo = !isGroup || isAdminOrOwner || chat.permissions?.changeChatInfo !== false;
  const canAddMembers = !isGroup || isAdminOrOwner || chat.permissions?.addMembers !== false;

  const isOwner = currentUser.id === chat.ownerId || !chat.ownerId;
  const isMuted = Boolean(chat.isMuted);

  const toggleMute = async () => {
    await onUpdateGroup(chat.id, { isMuted: !isMuted });
    showToast(isMuted ? 'Grup dibunyikan' : 'Grup disenyapkan');
  };

  const handleCopyLink = () => {
    const link = chat.inviteLink || `https://t.me/+${chat.id}`;
    navigator.clipboard.writeText(link);
    showToast('Tautan undangan disalin ke papan klip!');
  };

  const handleLeaveOrDelete = async () => {
    if (window.confirm(isOwner ? 'Hapus grup untuk semua anggota?' : 'Keluar dari grup ini?')) {
      if (onLeaveGroup) {
        await onLeaveGroup(chat.id);
      } else {
        await onDeleteGroup(chat.id);
      }
      onClose();
    }
  };

  const participantsList = (chat.participants || [])
    .map((id) => allUsers.find((u) => u.id === id) || (id === currentUser.id ? currentUser : null))
    .filter(Boolean) as User[];

  const nonMemberUsers = allUsers.filter(
    (u) => !(chat.participants || []).includes(u.id) && u.id !== currentUser.id
  ).filter((u) => {
    const q = searchMemberQuery.toLowerCase().trim();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || (u.username && u.username.toLowerCase().includes(q));
  });

  const handleConfirmAddMembers = async () => {
    if (selectedAddUserIds.length === 0) return;
    await onAddMembers(chat.id, selectedAddUserIds);
    setSelectedAddUserIds([]);
    setShowAddMembersModal(false);
    showToast('Anggota berhasil ditambahkan');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-2 animate-in fade-in duration-200">
        <div className="bg-[#0e1621] w-full max-w-full sm:max-w-xl h-full sm:h-[720px] rounded-none sm:rounded-2xl border-0 sm:border border-[#242f3d] flex flex-col shadow-2xl overflow-hidden relative text-white">
          
          {/* TOAST */}
          {toastMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 bg-[#242f3d] text-white px-4 py-2 rounded-full text-xs font-medium border border-[#313d4f] shadow-lg">
              {toastMessage}
            </div>
          )}

          {/* Header Area with Gradient/Solid Background */}
          <div 
            className="relative pb-4" 
            style={{ 
              background: chat.avatar ? 'transparent' : `linear-gradient(180deg, ${chat.color || '#5288c1'}99 0%, #17212b 100%)`,
              backgroundColor: '#17212b'
            }}
          >
            {/* Top Navigation */}
            <div className="px-4 py-3 flex items-center justify-between z-10 relative">
              <button
                id="btn-close-group-profile"
                onClick={onClose}
                className="p-2 text-white hover:bg-black/20 rounded-full transition-colors cursor-pointer backdrop-blur-sm"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-1">
                {canChangeChatInfo && (
                  <button
                    id="btn-edit-group"
                    onClick={() => setShowEditModal(true)}
                    className="p-2 text-white hover:bg-black/20 rounded-full transition-colors cursor-pointer backdrop-blur-sm"
                    title="Edit Grup"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                )}

                <div className="relative">
                  <button
                    id="btn-group-profile-more"
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="p-2 text-white hover:bg-black/20 rounded-full transition-colors cursor-pointer backdrop-blur-sm"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {/* 3-dots Dropdown Menu */}
                  {showMoreMenu && (
                    <div className="absolute right-0 top-12 bg-[#1c2733] border border-[#2e3c4e] rounded-xl shadow-2xl py-1.5 w-48 z-50 animate-in fade-in zoom-in-95">
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowAddMembersModal(true);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#242f3d] flex items-center gap-3 text-slate-200 cursor-pointer"
                      >
                        <Search className="w-5 h-5 text-[#5288c1]" />
                        <span>Cari Anggota</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          showToast('Ditambahkan ke Beranda');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#242f3d] flex items-center gap-3 text-slate-200 cursor-pointer"
                      >
                        <Plus className="w-5 h-5 text-[#5288c1]" />
                        <span>Tambah ke Layar</span>
                      </button>
                      <div className="h-px bg-[#2e3c4e] my-1" />
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          handleLeaveOrDelete();
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-500/10 flex items-center gap-3 text-red-400 cursor-pointer"
                      >
                        {isOwner ? <Trash2 className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                        <span>{isOwner ? 'Hapus Grup' : 'Keluar Grup'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Avatar & Title */}
            <div className="flex flex-col items-center mt-2 relative z-10">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shadow-xl overflow-hidden border border-[#17212b]"
                style={{ backgroundColor: chat.color || '#4fae4e' }}
              >
                {chat.avatar ? (
                  <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span>{getAvatarLetter(chat.name)}</span>
                )}
              </div>
              
              <h1 className="text-lg font-semibold text-white mt-2 flex items-center justify-center gap-1.5">
                <span>{chat.name}</span>
                <VerifiedBadge isVerified={chat.isVerified} badgeColor={(chat as any).badgeColor} size="sm" />
              </h1>
              <span className="text-xs text-[#7f91a4] mt-0.5 font-medium">
                {participantsList.length} anggota
              </span>
            </div>

            {/* Telegram-style Circular Action Buttons */}
            <div className="flex justify-center gap-5 mt-4 px-4">
              <button onClick={() => setShowAddMembersModal(true)} className="flex flex-col items-center gap-1.5 group">
                <div className="w-10 h-10 rounded-full bg-[#2b5278] flex items-center justify-center group-hover:bg-[#346290] transition-colors cursor-pointer">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-medium text-[#5288c1]">Tambah</span>
              </button>

              <button onClick={toggleMute} className="flex flex-col items-center gap-1.5 group">
                <div className="w-10 h-10 rounded-full bg-[#202b36] flex items-center justify-center group-hover:bg-[#2a3947] transition-colors cursor-pointer">
                  {isMuted ? <BellOff className="w-4 h-4 text-[#7f91a4]" /> : <Bell className="w-4 h-4 text-white" />}
                </div>
                <span className="text-[10px] font-medium text-[#7f91a4]">{isMuted ? 'Suarakan' : 'Senyapkan'}</span>
              </button>

              <button className="flex flex-col items-center gap-1.5 group">
                <div className="w-10 h-10 rounded-full bg-[#202b36] flex items-center justify-center group-hover:bg-[#2a3947] transition-colors cursor-pointer">
                  <Video className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-medium text-[#7f91a4]">Video</span>
              </button>
              
              <button className="flex flex-col items-center gap-1.5 group">
                <div className="w-10 h-10 rounded-full bg-[#202b36] flex items-center justify-center group-hover:bg-[#2a3947] transition-colors cursor-pointer">
                  <Search className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-medium text-[#7f91a4]">Cari</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-6">
            {/* Description Block */}
            {chat.description && (
              <div className="bg-[#17212b] mt-2 px-4 py-3 flex flex-col gap-0.5">
                <span className="text-[13px] font-medium text-[#5288c1]">Info</span>
                <span className="text-sm text-white leading-relaxed">{chat.description}</span>
              </div>
            )}

            {/* Invite Link Block */}
            <div className="bg-[#17212b] mt-2 py-1">
              <div
                onClick={handleCopyLink}
                className="flex items-center gap-4 px-4 py-2 hover:bg-[#202b36] cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#202b36] text-[#5288c1] flex items-center justify-center flex-shrink-0">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm text-white truncate">
                    {chat.inviteLink || `https://t.me/+${chat.id}`}
                  </span>
                  <span className="text-[11px] font-medium text-[#7f91a4]">Tautan Undangan</span>
                </div>
              </div>
            </div>

            {/* Members Block */}
            <div className="bg-[#17212b] mt-2 py-2 mb-4">
              <div className="px-4 py-1.5 font-medium text-[#5288c1] text-xs">
                {participantsList.length} Anggota
              </div>

              {/* Tambah Anggota List Item */}
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
              )}

              {/* Members List */}
              <div className="mt-1">
                {participantsList.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-4 py-1.5 hover:bg-[#202b36] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        name={member.name}
                        username={member.username}
                        avatar={member.avatar}
                        color={member.color}
                        size="sm"
                        isOnline={member.isOnline}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-white truncate">
                          {member.name} {member.id === currentUser.id ? '(Anda)' : ''}
                        </span>
                        <span className="text-[11px] text-[#7f91a4] truncate">
                          {member.id === chat.ownerId ? (
                            <span className="text-[#7f91a4]">pemilik</span>
                          ) : member.isOnline ? (
                            <span className="text-[#5288c1]">online</span>
                          ) : (
                            member.lastSeen || 'terlihat belakangan ini'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Group Edit Full Modal */}
      {showEditModal && (
        <GroupEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          chat={chat}
          currentUser={currentUser}
          allUsers={allUsers}
          onUpdateGroup={onUpdateGroup}
          onDeleteGroup={onDeleteGroup}
          onAddMembers={onAddMembers}
        />
      )}

      {/* Add Members Direct Modal */}
      {showAddMembersModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#17212b] border border-[#2e3c4e] rounded-2xl w-full max-w-md h-[500px] flex flex-col text-white shadow-2xl">
            <div className="px-4 py-3 border-b border-[#2e3c4e] flex items-center justify-between">
              <h3 className="font-semibold text-base">Tambah Anggota ke Grup</h3>
              <button
                onClick={() => setShowAddMembersModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-[#2e3c4e]">
              <input
                type="text"
                placeholder="Cari kontak..."
                value={searchMemberQuery}
                onChange={(e) => setSearchMemberQuery(e.target.value)}
                className="w-full bg-[#242f3d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#2e3c4e]/50">
              {nonMemberUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#7f91a4]">
                  Tidak ada kontak lain untuk ditambahkan.
                </div>
              ) : (
                nonMemberUsers.map((u) => {
                  const isSelected = selectedAddUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedAddUserIds((prev) =>
                          prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                        );
                      }}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-[#202b36] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar name={u.name} avatar={u.avatar} color={u.color} size="sm" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-white truncate">{u.name}</span>
                          <span className="text-[11px] text-[#7f91a4] truncate">
                            {u.isOnline ? 'online' : (u.lastSeen || 'terlihat belakangan ini')}
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 accent-[#5288c1] pointer-events-none"
                      />
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-[#2e3c4e] flex justify-end gap-2">
              <button
                onClick={() => setShowAddMembersModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmAddMembers}
                disabled={selectedAddUserIds.length === 0}
                className={`px-4 py-2 text-xs font-semibold rounded-lg ${
                  selectedAddUserIds.length > 0
                    ? 'bg-[#5288c1] text-white hover:bg-[#4374a8]'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                Tambahkan ({selectedAddUserIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
