import React, { useState } from 'react';
import { Search, X, Forward, CheckCircle2, MessageSquare, Shield, Users, Bookmark } from 'lucide-react';
import { Chat, Message, User } from '../types';
import { UserAvatar } from './UserAvatar';
import { getMaskedContact } from '../utils/privacy';
import { VerifiedBadge } from './VerifiedBadge';

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  messagesToForward: Message[];
  chats: Chat[];
  users: User[];
  currentUser: User;
  onForwardToChat: (targetChatId: string, messages: Message[]) => void;
  onForwardToUser: (targetUser: User, messages: Message[]) => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  isOpen,
  onClose,
  messagesToForward,
  chats,
  users,
  currentUser,
  onForwardToChat,
  onForwardToUser,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen || messagesToForward.length === 0) return null;

  const cleanQuery = search.trim().toLowerCase().replace(/^@/, '');

  // Mask other users
  const otherUsers = users
    .filter((u) => u.id !== currentUser.id)
    .map((u) => getMaskedContact(u, currentUser.id));

  const filteredChats = chats.filter((c) => {
    if (!cleanQuery) return true;
    return (
      c.name.toLowerCase().includes(cleanQuery) ||
      (c.username && c.username.toLowerCase().includes(cleanQuery))
    );
  });

  const filteredUsers = otherUsers.filter((u) => {
    if (!cleanQuery) return true;
    return (
      u.name.toLowerCase().includes(cleanQuery) ||
      u.username.toLowerCase().includes(cleanQuery) ||
      (u.phone && u.phone.includes(cleanQuery))
    );
  });

  const handleSelectChat = (chat: Chat) => {
    onForwardToChat(chat.id, messagesToForward);
    onClose();
  };

  const handleSelectUser = (user: User) => {
    // Check if chat already exists
    const existingChat = chats.find(
      (c) => c.type === 'direct' && c.participants.includes(user.id)
    );
    if (existingChat) {
      onForwardToChat(existingChat.id, messagesToForward);
    } else {
      onForwardToUser(user, messagesToForward);
    }
    onClose();
  };

  return (
    <div id="forward-modal-overlay" className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#17212b] border border-[#242f3d] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#242f3d] flex items-center justify-between bg-[#1f2936]">
          <div className="flex items-center gap-2">
            <Forward className="w-5 h-5 text-[#5288c1]" />
            <div>
              <h3 className="font-bold text-base text-white">Teruskan Pesan</h3>
              <p className="text-[11px] text-[#7f91a4]">
                {messagesToForward.length} pesan dipilih
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7f91a4] hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#242f3d] bg-[#17212b]">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari obrolan atau kontak..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#242f3d] border border-transparent focus:border-[#5288c1] rounded-xl py-2 pl-3.5 pr-9 text-sm focus:outline-none text-white placeholder-[#7f91a4] transition-all"
              autoFocus
            />
            {search ? (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7f91a4] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Search className="w-4 h-4 text-[#7f91a4] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>
        </div>

        {/* Destination List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {/* Active Chats Section */}
          {filteredChats.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-bold text-[#7f91a4] uppercase tracking-wider">
                Obrolan Terkini
              </div>
              {filteredChats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectChat(c)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#242f3d] transition-colors text-left cursor-pointer group"
                >
                  <UserAvatar
                    name={c.name}
                    username={c.username}
                    avatar={c.avatar}
                    color={c.color || '#5288c1'}
                    size="md"
                    isOnline={c.isOnline}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-white truncate group-hover:text-[#5288c1] transition-colors">
                        {c.name}
                      </span>
                      <VerifiedBadge isVerified={c.isVerified} badgeColor={(c as any).badgeColor} size="sm" />
                      {c.type === 'saved' && (
                        <span className="text-[10px] bg-[#5288c1]/20 text-[#5288c1] px-1.5 py-0.2 rounded font-medium">
                          Pribadi
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#7f91a4] truncate">
                      {c.type === 'saved' ? 'Pesan Tersimpan Anda' : c.username ? `@${c.username}` : c.type === 'group' ? 'Grup Obrolan' : 'Obrolan Langsung'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Contacts / Users Section */}
          {filteredUsers.length > 0 && (
            <div className="pt-2">
              <div className="px-3 py-1.5 text-[11px] font-bold text-[#7f91a4] uppercase tracking-wider">
                Semua Kontak
              </div>
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#242f3d] transition-colors text-left cursor-pointer group"
                >
                  <UserAvatar
                    name={u.name}
                    username={u.username}
                    avatar={u.avatar}
                    color={u.color || '#5288c1'}
                    size="md"
                    isOnline={u.isOnline}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-white truncate group-hover:text-[#5288c1] transition-colors">
                        {u.name}
                      </span>
                      <VerifiedBadge isVerified={u.isVerified} badgeColor={u.badgeColor} size="sm" />
                    </div>
                    <p className="text-xs text-[#7f91a4] truncate">
                      @{u.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {filteredChats.length === 0 && filteredUsers.length === 0 && (
            <div className="py-12 text-center text-[#7f91a4]">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Tidak ada tujuan ditemukan</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#1f2936] border-t border-[#242f3d] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-[#242f3d] rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
