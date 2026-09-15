import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Pin, VolumeX, Volume2, CheckCheck, Check, 
  Archive, Edit3, Camera, Mic, X, MessageSquare,
  Globe, AtSign, CheckCircle2, User as UserIcon,
  Trash2, MoreVertical, FolderMinus, RotateCcw,
  Ban, ShieldAlert, PinOff, Phone, Radio, UserPlus
} from 'lucide-react';
import { Chat, User, Story } from '../types';
import { formatChatListTime } from '../utils/time';
import { UserAvatar } from './UserAvatar';
import { getMaskedContact } from '../utils/privacy';
import { VerifiedBadge } from './VerifiedBadge';
import { CallsView } from './CallsView';
import { UpdatesView } from './UpdatesView';
import { StoryViewerModal } from './StoryViewerModal';

import { useSettings } from '../contexts/SettingsContext';

interface ChatListProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chat: Chat) => void;
  onOpenDrawer: () => void;
  onOpenNewChat: () => void;
  onOpenArchivedChats?: () => void;
  currentUser: User;
  allUsers?: User[];
  onStartDirectChat?: (targetUser: User) => void;
  onViewContactProfile?: (targetUser: User) => void;
  onMuteChats?: (chatIds: string[]) => void;
  onArchiveChats?: (chatIds: string[]) => void;
  onDeleteChats?: (chatIds: string[]) => void;
  onPinChats?: (chatIds: string[]) => void;
  onRemoveFromFolder?: (chatIds: string[]) => void;
  onMarkChatsRead?: (chatIds: string[]) => void;
  onClearChatHistory?: (chatIds: string[]) => void;
  onBlockUsers?: (chatIds: string[]) => void;
  onOpenCalls?: () => void;
  onOpenUpdates?: () => void;
  onStartCall?: (user: User, callType?: 'audio' | 'video') => void;
  onRefreshUsers?: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onOpenDrawer,
  onOpenNewChat,
  onOpenArchivedChats,
  currentUser,
  allUsers = [],
  onStartDirectChat,
  onViewContactProfile,
  onMuteChats,
  onArchiveChats,
  onDeleteChats,
  onPinChats,
  onRemoveFromFolder,
  onMarkChatsRead,
  onClearChatHistory,
  onBlockUsers,
  onOpenCalls,
  onOpenUpdates,
  onStartCall,
  onRefreshUsers,
}) => {
  const { settings } = useSettings();
  const [mainBottomTab, setMainBottomTab] = useState<'chat' | 'calls' | 'updates'>('chat');
  const [activeTab, setActiveTab] = useState<'all' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Stories & Status Ring State
  const [stories, setStories] = useState<Story[]>([]);
  const [viewingStoryId, setViewingStoryId] = useState<string | null>(null);
  const [viewingStoryList, setViewingStoryList] = useState<Story[]>([]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchStories = async () => {
      try {
        const res = await fetch(`/api/stories?userId=${encodeURIComponent(currentUser.id)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.stories)) {
            setStories(data.stories);
          }
        }
      } catch (e) {
        console.warn('Gagal memuat status di ChatList:', e);
      }
    };
    fetchStories();

    const eventSource = new EventSource(`/api/events?userId=${encodeURIComponent(currentUser.id)}`);
    eventSource.addEventListener('story_created', () => fetchStories());
    eventSource.addEventListener('story_deleted', () => fetchStories());
    eventSource.addEventListener('story_viewed', () => fetchStories());
    eventSource.addEventListener('story_reacted', () => fetchStories());
    eventSource.addEventListener('user_updated', () => fetchStories());
    eventSource.addEventListener('users_updated', () => fetchStories());
    return () => {
      eventSource.close();
    };
  }, [currentUser?.id]);

  // Selection Mode State (Foto 1 & Foto 2)
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Long-press detection refs
  const longPressTimerRef = useRef<any>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  const pointerStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const cleanQuery = searchQuery.trim().toLowerCase().replace(/^@/, '');
  const nonArchivedChats = chats.filter((c) => !c.isArchived);

  // Filter existing chats according to tab and search
  const filteredChats = chats.filter((c) => {
    if (cleanQuery) {
      return (
        c.name.toLowerCase().includes(cleanQuery) ||
        (c.username && c.username.toLowerCase().includes(cleanQuery)) ||
        (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(cleanQuery))
      );
    }

    // Tab filter
    if (activeTab === 'all') return true;
    if (activeTab === 'personal') return c.type === 'direct' || c.type === 'saved';
    if (activeTab === 'groups') return c.type === 'group';
    if (activeTab === 'channels') return c.type === 'channel';
    if (activeTab === 'bots') return c.type === 'bot';
    return true;
  });

  // Global search across all registered Telegram users (excluding self)
  const globalUsers = cleanQuery
    ? allUsers.filter((u) => {
        if (u.id === currentUser.id) return false;
        return (
          u.username.toLowerCase().includes(cleanQuery) ||
          u.name.toLowerCase().includes(cleanQuery) ||
          (u.phone && u.phone.includes(cleanQuery)) ||
          (u.bio && u.bio.toLowerCase().includes(cleanQuery))
        );
      }).map((u) => getMaskedContact(u, currentUser.id))
    : [];

  // Calculate unread totals for tabs (only counting non-archived chats)
  const allUnread = nonArchivedChats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const personalUnread = nonArchivedChats.filter(c => c.type === 'direct' || c.type === 'saved').reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const groupsUnread = nonArchivedChats.filter(c => c.type === 'group').reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const channelsUnread = nonArchivedChats.filter(c => c.type === 'channel').reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const botsUnread = nonArchivedChats.filter(c => c.type === 'bot').reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const hasGroups = nonArchivedChats.some(c => c.type === 'group');
  const hasChannels = nonArchivedChats.some(c => c.type === 'channel');
  const hasBots = nonArchivedChats.some(c => c.type === 'bot');

  const handleSelectGlobalUser = (user: User) => {
    const existingChat = chats.find(
      (c) => c.type === 'direct' && c.participants.includes(user.id)
    );
    if (existingChat) {
      onSelectChat(existingChat);
    } else if (onStartDirectChat) {
      onStartDirectChat(user);
    }
    setSearchQuery('');
  };

  // -------------------------------------------------------------
  // POINTER & TOUCH HANDLERS (LONG PRESS TO SELECT CHATS)
  // -------------------------------------------------------------
  const handleChatPointerDown = (e: React.PointerEvent, chat: Chat) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isLongPressTriggeredRef.current = false;
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (navigator.vibrate) {
        try { navigator.vibrate(40); } catch (err) {}
      }
      setSelectionMode(true);
      setSelectedChatIds((prev) => {
        if (prev.includes(chat.id)) return prev;
        return [...prev, chat.id];
      });
    }, 450);
  };

  const handleChatPointerMove = (e: React.PointerEvent) => {
    const dx = Math.abs(e.clientX - pointerStartPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartPosRef.current.y);
    if (dx > 8 || dy > 8) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleChatPointerUpOrCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleChatClick = (e: React.MouseEvent, chat: Chat) => {
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }

    if (selectionMode) {
      e.stopPropagation();
      setSelectedChatIds((prev) => {
        const next = prev.includes(chat.id)
          ? prev.filter((id) => id !== chat.id)
          : [...prev, chat.id];
        if (next.length === 0) {
          setSelectionMode(false);
          setShowMoreMenu(false);
        }
        return next;
      });
      return;
    }

    onSelectChat(chat);
  };

  const handleChatContextMenu = (e: React.MouseEvent, chat: Chat) => {
    e.preventDefault();
    setSelectionMode(true);
    setSelectedChatIds((prev) => {
      if (prev.includes(chat.id)) return prev;
      return [...prev, chat.id];
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedChatIds([]);
    setShowMoreMenu(false);
  };

  // -------------------------------------------------------------
  // SELECTION ACTIONS (HEADER ICONS & 3-DOT MENU ITEMS)
  // -------------------------------------------------------------
  const handleMuteSelected = () => {
    if (onMuteChats && selectedChatIds.length > 0) {
      onMuteChats(selectedChatIds);
      showToast(`${selectedChatIds.length} obrolan dibisukan / dibunyikan`);
    }
    exitSelectionMode();
  };

  const handleArchiveSelected = () => {
    if (onArchiveChats && selectedChatIds.length > 0) {
      onArchiveChats(selectedChatIds);
      showToast(`${selectedChatIds.length} obrolan diarsipkan`);
    }
    exitSelectionMode();
  };

  const handleDeleteSelected = () => {
    if (onDeleteChats && selectedChatIds.length > 0) {
      onDeleteChats(selectedChatIds);
      showToast(`${selectedChatIds.length} obrolan dihapus`);
    }
    exitSelectionMode();
  };

  const handlePinSelected = () => {
    if (onPinChats && selectedChatIds.length > 0) {
      onPinChats(selectedChatIds);
      showToast(`${selectedChatIds.length} obrolan disematkan`);
    }
    exitSelectionMode();
  };

  const handleRemoveFromFolderSelected = () => {
    if (onRemoveFromFolder && selectedChatIds.length > 0) {
      onRemoveFromFolder(selectedChatIds);
      showToast(`${selectedChatIds.length} obrolan dikeluarkan dari folder`);
    }
    exitSelectionMode();
  };

  const handleMarkReadSelected = () => {
    if (onMarkChatsRead && selectedChatIds.length > 0) {
      onMarkChatsRead(selectedChatIds);
      showToast(`${selectedChatIds.length} obrolan ditandai telah dibaca`);
    }
    exitSelectionMode();
  };

  const handleClearHistorySelected = () => {
    if (onClearChatHistory && selectedChatIds.length > 0) {
      onClearChatHistory(selectedChatIds);
      showToast(`Riwayat pesan dibersihkan`);
    }
    exitSelectionMode();
  };

  const handleBlockSelected = () => {
    if (onBlockUsers && selectedChatIds.length > 0) {
      onBlockUsers(selectedChatIds);
      showToast(`Pengguna telah diblokir`);
    }
    exitSelectionMode();
  };

  return (
    <div 
      id="chatlist-container" 
      className="flex flex-col h-full bg-[#17212b] text-slate-100 select-none relative overflow-hidden border-r border-[#101921]"
      onClick={() => {
        if (showMoreMenu) setShowMoreMenu(false);
      }}
    >
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#17212b]/95 border border-[#5288c1]/40 text-white text-xs font-medium px-4 py-2 rounded-full shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          {toastMessage}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN VIEW SWITCHER: CHAT LIST vs PANGGILAN vs PEMBARUAN                   */}
      {/* ========================================================================= */}
      {mainBottomTab === 'calls' ? (
        <div className="flex-1 min-h-0">
          <CallsView
            currentUser={currentUser}
            users={allUsers}
            onStartCall={onStartCall || (() => {})}
            onOpenDrawer={onOpenDrawer}
            onBack={() => setMainBottomTab('chat')}
            onRefreshUsers={onRefreshUsers}
          />
        </div>
      ) : mainBottomTab === 'updates' ? (
        <div className="flex-1 min-h-0">
          <UpdatesView
            currentUser={currentUser}
            onOpenDrawer={onOpenDrawer}
            onBack={() => setMainBottomTab('chat')}
          />
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* TOP HEADER: STANDARD vs SELECTION BAR (FOTO 1 & FOTO 2)                   */}
          {/* ========================================================================= */}
          {selectionMode ? (
        /* Top Selection Bar for Chat List (Foto 1 & Foto 2) */
        <div id="chatlist-selection-bar" className="h-14 bg-[#17212b] border-b border-[#101921] flex items-center justify-between px-3 md:px-4 z-30 shadow-md text-white animate-in fade-in duration-100 relative">
          <div className="flex items-center gap-3">
            <button
              id="btn-close-chat-selection"
              onClick={exitSelectionMode}
              className="p-2 text-[#7f91a4] hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
              title="Batal Memilih"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="font-bold text-lg text-white">
              {selectedChatIds.length}
            </span>
          </div>

          {/* Action Icons Right: Direct Actions & Titik Tiga */}
          <div className="flex items-center gap-1">
            {/* Direct Archive Button */}
            <button
              id="btn-direct-archive-selected"
              onClick={handleArchiveSelected}
              className="p-2 rounded-full text-[#7f91a4] hover:text-white hover:bg-[#242f3d] transition-colors cursor-pointer"
              title="Arsipkan Obrolan"
            >
              <Archive className="w-5 h-5" />
            </button>

            {/* Direct Pin Button */}
            <button
              id="btn-direct-pin-selected"
              onClick={handlePinSelected}
              className="p-2 rounded-full text-[#7f91a4] hover:text-white hover:bg-[#242f3d] transition-colors cursor-pointer"
              title="Sematkan Obrolan"
            >
              <Pin className="w-5 h-5" />
            </button>

            {/* Direct Delete Button */}
            <button
              id="btn-direct-delete-selected"
              onClick={handleDeleteSelected}
              className="p-2 rounded-full text-[#7f91a4] hover:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
              title="Hapus Obrolan"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            {/* 4. More Options (3 Dots) */}
            <button
              id="btn-more-chats-menu"
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreMenu(!showMoreMenu);
              }}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                showMoreMenu ? 'text-white bg-[#242f3d]' : 'text-[#7f91a4] hover:text-white hover:bg-[#242f3d]'
              }`}
              title="Menu Lainnya"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* ===================================================================== */}
          {/* 3-DOTS DROPDOWN POPUP MENU                                            */}
          {/* ===================================================================== */}
          {showMoreMenu && (
            <div 
              id="chat-selection-dropdown-menu"
              onClick={(e) => e.stopPropagation()}
              className="absolute right-3 top-13 w-56 bg-[#1e2632] border border-[#2d3a4b] shadow-2xl rounded-2xl p-1.5 backdrop-blur-md text-slate-100 z-50 animate-in zoom-in-95 duration-100 flex flex-col space-y-0.5"
            >
              {/* Arsipkan */}
              <button
                id="menu-item-archive-chat"
                onClick={handleArchiveSelected}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-[#273344] transition-colors text-sm font-medium text-left cursor-pointer"
              >
                <Archive className="w-4 h-4 text-[#7f91a4]" />
                <span>Arsipkan</span>
              </button>

              {/* Semat */}
              <button
                id="menu-item-pin-chat"
                onClick={handlePinSelected}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-[#273344] transition-colors text-sm font-medium text-left cursor-pointer"
              >
                <Pin className="w-4 h-4 text-[#7f91a4]" />
                <span>Semat</span>
              </button>

              {/* Buang dari Folder */}
              <button
                id="menu-item-remove-folder"
                onClick={handleRemoveFromFolderSelected}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-[#273344] transition-colors text-sm font-medium text-left cursor-pointer"
              >
                <FolderMinus className="w-4 h-4 text-[#7f91a4]" />
                <span>Buang dari Folder</span>
              </button>

              {/* Tandai dibaca */}
              <button
                id="menu-item-mark-read"
                onClick={handleMarkReadSelected}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-[#273344] transition-colors text-sm font-medium text-left cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 text-[#7f91a4]" />
                <span>Tandai dibaca</span>
              </button>

              {/* Bersihkan Riwayat */}
              <button
                id="menu-item-clear-history"
                onClick={handleClearHistorySelected}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-[#273344] transition-colors text-sm font-medium text-left cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-[#7f91a4]" />
                <span>Bersihkan Riwayat</span>
              </button>

              {/* Hapus Obrolan */}
              <button
                id="menu-item-delete-chat"
                onClick={handleDeleteSelected}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-red-950/40 text-red-400 transition-colors text-sm font-medium text-left cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Hapus Obrolan</span>
              </button>

              {/* Blokir pengguna */}
              <button
                id="menu-item-block-user"
                onClick={handleBlockSelected}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-red-950/40 text-red-400 transition-colors text-sm font-medium text-left cursor-pointer"
              >
                <Ban className="w-4 h-4 text-red-400" />
                <span>Blokir pengguna</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Standard Header with Hamburger & Search */
        <div className="p-3.5 border-b border-[#101921] flex items-center gap-3 bg-[#17212b]">
          <button
            id="header-hamburger-btn"
            onClick={onOpenDrawer}
            className="w-9 h-9 rounded-xl bg-[#5288c1] flex items-center justify-center text-white hover:bg-[#4374a8] transition-all cursor-pointer shrink-0 shadow-md shadow-[#5288c1]/20 active:scale-95"
            title="Buka Menu"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <div className="flex-1 relative">
            <input
              id="search-chat-input"
              type="text"
              placeholder="Cari obrolan, pesan, atau @username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#242f3d] border border-[#242f3d] focus:border-[#5288c1] rounded-xl py-2 pl-3.5 pr-9 text-sm focus:outline-none text-white placeholder-[#7f91a4] transition-all shadow-inner"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7f91a4] hover:text-white cursor-pointer bg-[#1e2936] p-1 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Search className="w-4 h-4 text-[#7f91a4] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>
        </div>
      )}

      {/* Folder Tabs (Semua Obrolan, Pribadi, Grup, Saluran, Bot) - Hidden while searching */}
      {!cleanQuery && (hasGroups || hasChannels || hasBots) && (
        <div id="chat-tabs-bar" className="flex items-center px-2 bg-[#17212b] border-b border-[#101921] overflow-x-auto custom-scrollbar whitespace-nowrap gap-1 py-0.5">
          {/* Tab 1: Semua Obrolan */}
          <button
            id="tab-all-chats"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all relative cursor-pointer rounded-t-lg ${
              activeTab === 'all' ? 'text-[#5288c1] bg-[#1e2936]/50' : 'text-[#7f91a4] hover:text-slate-200 hover:bg-[#1e2936]/20'
            }`}
          >
            <span>Semua</span>
            {allUnread > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                activeTab === 'all' ? 'bg-[#5288c1] text-white shadow-xs' : 'bg-[#242f3d] text-slate-300'
              }`}>
                {allUnread > 999 ? '999+' : allUnread}
              </span>
            )}
            {activeTab === 'all' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#5288c1] rounded-full shadow-sm shadow-[#5288c1]/50" />
            )}
          </button>

          {/* Tab 2: Pribadi */}
          <button
            id="tab-personal-chats"
            onClick={() => setActiveTab('personal')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold transition-all relative cursor-pointer rounded-t-lg ${
              activeTab === 'personal' ? 'text-[#5288c1] bg-[#1e2936]/50' : 'text-[#7f91a4] hover:text-slate-200 hover:bg-[#1e2936]/20'
            }`}
          >
            <span>Pribadi</span>
            {personalUnread > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                activeTab === 'personal' ? 'bg-[#5288c1] text-white' : 'bg-[#242f3d] text-slate-300'
              }`}>
                {personalUnread}
              </span>
            )}
            {activeTab === 'personal' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#5288c1] rounded-full shadow-sm shadow-[#5288c1]/50" />
            )}
          </button>

          {/* Tab 3: Grup (if exists) */}
          {hasGroups && (
            <button
              id="tab-groups-chats"
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold transition-all relative cursor-pointer rounded-t-lg ${
                activeTab === 'groups' ? 'text-[#5288c1] bg-[#1e2936]/50' : 'text-[#7f91a4] hover:text-slate-200 hover:bg-[#1e2936]/20'
              }`}
            >
              <span>Grup</span>
              {groupsUnread > 0 && (
                <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                  activeTab === 'groups' ? 'bg-[#5288c1] text-white' : 'bg-[#242f3d] text-slate-300'
                }`}>
                  {groupsUnread}
                </span>
              )}
              {activeTab === 'groups' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#5288c1] rounded-full shadow-sm shadow-[#5288c1]/50" />
              )}
            </button>
          )}

          {/* Tab 4: Saluran (if exists) */}
          {hasChannels && (
            <button
              id="tab-channels-chats"
              onClick={() => setActiveTab('channels')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold transition-all relative cursor-pointer rounded-t-lg ${
                activeTab === 'channels' ? 'text-[#5288c1] bg-[#1e2936]/50' : 'text-[#7f91a4] hover:text-slate-200 hover:bg-[#1e2936]/20'
              }`}
            >
              <span>Saluran</span>
              {channelsUnread > 0 && (
                <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                  activeTab === 'channels' ? 'bg-[#5288c1] text-white' : 'bg-[#242f3d] text-slate-300'
                }`}>
                  {channelsUnread}
                </span>
              )}
              {activeTab === 'channels' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#5288c1] rounded-full shadow-sm shadow-[#5288c1]/50" />
              )}
            </button>
          )}

          {/* Tab 5: Bot (if exists) */}
          {hasBots && (
            <button
              id="tab-bots-chats"
              onClick={() => setActiveTab('bots')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold transition-all relative cursor-pointer rounded-t-lg ${
                activeTab === 'bots' ? 'text-[#5288c1] bg-[#1e2936]/50' : 'text-[#7f91a4] hover:text-slate-200 hover:bg-[#1e2936]/20'
              }`}
            >
              <span>Bot</span>
              {botsUnread > 0 && (
                <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                  activeTab === 'bots' ? 'bg-[#5288c1] text-white' : 'bg-[#242f3d] text-slate-300'
                }`}>
                  {botsUnread}
                </span>
              )}
              {activeTab === 'bots' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#5288c1] rounded-full shadow-sm shadow-[#5288c1]/50" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Chat List & Global Search Scrollable Items */}
      <div id="chats-scroll-list" className="flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Search Mode Layout */}
        {cleanQuery ? (
          <div>
            {/* 1. Global Search Results (Pengguna / Kontak Telegram) */}
            <div className="bg-[#17212b]">
              <div className="px-4 py-2 bg-[#0e1621] border-b border-[#101921] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#5288c1]">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Pencarian Global Pengguna</span>
                </div>
                <span className="text-[11px] text-[#7f91a4]">
                  {globalUsers.length} ditemukan
                </span>
              </div>

              {globalUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#7f91a4]">
                  Tidak ada pengguna dengan username "@{cleanQuery}"
                </div>
              ) : (
                <div className="divide-y divide-[#101921]/60">
                  {globalUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSelectGlobalUser(user)}
                      className="flex items-center gap-3 p-3 hover:bg-[#202b36] cursor-pointer transition-colors"
                    >
                      <div
                        onClick={(e) => {
                          if (onViewContactProfile) {
                            e.stopPropagation();
                            onViewContactProfile(user);
                          }
                        }}
                        title="Lihat Profil"
                        className="hover:opacity-80 transition-opacity"
                      >
                        <UserAvatar
                          name={user.name}
                          username={user.username}
                          avatar={user.avatar}
                          color={user.color || '#5288c1'}
                          size="md"
                          isOnline={user.isOnline}
                          statusEmoji={user.statusEmoji}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-white truncate">
                            {user.name}
                          </span>
                          <VerifiedBadge isVerified={user.isVerified} badgeColor={user.badgeColor} size="sm" />
                          {user.statusEmoji && (
                            <span className="text-xs">{user.statusEmoji}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold text-[#5288c1]">
                            @{user.username}
                          </span>
                          <span className="text-[#7f91a4] text-xs">•</span>
                          <span className={`text-[11px] truncate ${user.isOnline ? 'text-[#4fae4e] font-medium' : 'text-[#7f91a4]'}`}>
                            {user.isOnline ? 'online' : (user.lastSeen || 'terakhir dilihat baru saja')}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-[#5288c1] bg-[#242f3d] px-2.5 py-1 rounded-lg border border-[#313d4f] shrink-0">
                        Kirim Pesan
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Matching Chats / Messages */}
            <div className="mt-2 bg-[#17212b]">
              <div className="px-4 py-2 bg-[#0e1621] border-y border-[#101921] flex items-center justify-between">
                <span className="text-xs font-bold text-[#7f91a4]">
                  Obrolan & Pesan
                </span>
                <span className="text-[11px] text-[#7f91a4]">
                  {filteredChats.length} hasil
                </span>
              </div>

              <div className="divide-y divide-[#101921]/60">
                {filteredChats.map((chat) => {
                  const isSelected = activeChatId === chat.id;
                  const otherUserId = chat.type === 'direct' ? chat.participants.find((p) => p !== currentUser.id) : null;
                  const targetUser = otherUserId ? allUsers.find((u) => u.id === otherUserId) : null;
                  const isVerified = Boolean(chat.isVerified || targetUser?.isVerified);
                  const badgeColor = (chat as any).badgeColor || targetUser?.badgeColor;
                  const customBadge = (chat as any).customBadge || targetUser?.customBadge;

                  return (
                    <div
                      key={chat.id}
                      onClick={() => onSelectChat(chat)}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${
                        isSelected ? 'bg-[#2b5278] text-white shadow-sm' : 'hover:bg-[#202b36]'
                      }`}
                    >
                      <UserAvatar
                        name={chat.name}
                        username={chat.username}
                        avatar={chat.avatar}
                        color={isSelected ? '#5288c1' : (chat.color || '#5288c1')}
                        size="md"
                        isOnline={chat.isOnline}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            <span className="font-semibold text-sm truncate text-white">
                              {chat.name}
                            </span>
                            <VerifiedBadge isVerified={isVerified} badgeColor={badgeColor} size="sm" />
                            {customBadge && (
                              <span className="text-[10px] uppercase font-bold bg-[#242f3d] text-[#5288c1] px-1.5 py-0.2 rounded border border-[#313d4f]">
                                {customBadge}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[#7f91a4]">
                            {chat.lastMessage?.timestamp || ''}
                          </span>
                        </div>
                        <p className="text-xs text-[#7f91a4] truncate mt-0.5">
                          {chat.lastMessage?.text || 'Tidak ada pesan'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : (
          /* Normal Chat List Mode */
          <div className="divide-y divide-[#101921]/60">
            {/* Foto 1: Dedicated Arsip Obrolan Row at the top if archived chats exist */}
            {activeTab === 'all' && !cleanQuery && chats.some((c) => c.isArchived) && (
              (() => {
                const archivedList = chats.filter((c) => c.isArchived);
                const totalArchivedUnread = archivedList.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
                const previewList = archivedList.map((c) => c.name).join(', ');

                return (
                  <div
                    id="chat-item-archived-folder"
                    onClick={() => {
                      if (!selectionMode && onOpenArchivedChats) {
                        onOpenArchivedChats();
                      }
                    }}
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#202b36] transition-all bg-[#17212b]/60"
                  >
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[#242f3d] flex items-center justify-center text-white shrink-0 shadow-inner">
                        <Archive className="w-5 h-5 text-[#7f91a4]" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-semibold text-white truncate">
                          Arsip Obrolan
                        </span>
                        {totalArchivedUnread > 0 && (
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#242f3d] text-[#7f91a4]">
                            {totalArchivedUnread}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#7f91a4] truncate">
                        {previewList || 'Arsip pesan dan obrolan tersimpan'}
                      </p>
                    </div>
                  </div>
                );
              })()
            )}

            {filteredChats.filter((c) => !c.isArchived).length === 0 && !chats.some((c) => c.isArchived) ? (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-48 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#242f3d] text-[#7f91a4] flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200">Belum ada obrolan</p>
                  <p className="text-[11px] text-[#7f91a4] mt-0.5">Mulai obrolan baru atau cari username pengguna lain.</p>
                </div>
                <button
                  onClick={onOpenNewChat}
                  className="px-3.5 py-1.5 bg-[#5288c1] hover:bg-[#4374a8] text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Mulai Obrolan
                </button>
              </div>
            ) : (
              filteredChats
                .filter((c) => !c.isArchived)
                .map((chat) => {
                  const isActive = activeChatId === chat.id;
                  const isSelectedInMode = selectedChatIds.includes(chat.id);
                  const otherUserId = chat.type === 'direct' ? chat.participants.find((p) => p !== currentUser.id) : null;
                  const targetUser = otherUserId ? allUsers.find((u) => u.id === otherUserId) : null;
                  const isVerified = Boolean(chat.isVerified || targetUser?.isVerified);
                  const badgeColor = (chat as any).badgeColor || targetUser?.badgeColor;
                  const customBadge = (chat as any).customBadge || targetUser?.customBadge;

                return (
                  <div
                    key={chat.id}
                    id={`chat-item-${chat.id}`}
                    onClick={(e) => handleChatClick(e, chat)}
                    onPointerDown={(e) => handleChatPointerDown(e, chat)}
                    onPointerMove={handleChatPointerMove}
                    onPointerUp={handleChatPointerUpOrCancel}
                    onPointerCancel={handleChatPointerUpOrCancel}
                    onContextMenu={(e) => handleChatContextMenu(e, chat)}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${
                      isSelectedInMode
                        ? 'bg-[#203042] text-white ring-1 ring-[#5288c1]/40'
                        : isActive
                        ? 'bg-[#2b5278] text-white shadow-sm'
                        : 'hover:bg-[#202b36]'
                    }`}
                  >
                    {/* Avatar with Status Ring (Cincin Gradien Biru/Cyan or Read Gray Ring) */}
                    {(() => {
                      const userStories = otherUserId ? stories.filter(s => s.userId === otherUserId && s.expiresAt > Date.now()) : [];
                      const hasActiveStory = userStories.length > 0;
                      const allViewed = hasActiveStory && userStories.every(s => s.viewers?.some(v => v.userId === currentUser.id));

                      const ringStyle = hasActiveStory
                        ? !allViewed
                          ? 'p-0.5 rounded-full bg-gradient-to-tr from-[#3390ec] via-[#5288c1] to-[#2ecc71] shadow-sm cursor-pointer hover:scale-105 transition-transform'
                          : 'p-0.5 rounded-full bg-slate-600/80 shadow-sm cursor-pointer hover:scale-105 transition-transform'
                        : '';

                      return (
                        <div 
                          className={`relative shrink-0 ${ringStyle}`}
                          onClick={(e) => {
                            if (hasActiveStory && !selectionMode) {
                              e.stopPropagation();
                              setViewingStoryList(userStories);
                              setViewingStoryId(userStories[0].id);
                            }
                          }}
                          title={hasActiveStory ? (allViewed ? 'Status (Sudah Dilihat)' : 'Status Baru') : undefined}
                        >
                          <UserAvatar
                            name={chat.name}
                            username={chat.username}
                            avatar={chat.avatar}
                            color={isActive ? '#5288c1' : (chat.color || '#5288c1')}
                            size="lg"
                            isOnline={chat.isOnline}
                          />
                          {isSelectedInMode && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#4fae4e] text-white flex items-center justify-center ring-2 ring-[#17212b] shadow-md animate-in zoom-in-75 duration-100 z-10">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Info & Content */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: Name, Verified badge, Status checkmark, timestamp */}
                      <div className="flex justify-between items-baseline mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <span className={`font-semibold text-sm truncate ${
                            isActive || isSelectedInMode ? 'text-white' : 'text-slate-100'
                          }`}>
                            {chat.name}
                          </span>
                          <VerifiedBadge isVerified={isVerified} badgeColor={badgeColor} size="sm" />
                          {customBadge && (
                            <span className="text-[10px] uppercase font-bold bg-[#242f3d] text-[#5288c1] px-1.5 py-0.2 rounded border border-[#313d4f]">
                              {customBadge}
                            </span>
                          )}
                          {chat.isMuted && (
                            <VolumeX className={`w-3.5 h-3.5 shrink-0 ${
                              isActive || isSelectedInMode ? 'text-white/70' : 'text-[#7f91a4]'
                            }`} />
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {chat.lastMessage?.isOutgoing && (
                            chat.lastMessage.isRead ? (
                              <CheckCheck className={`w-4 h-4 ${isActive || isSelectedInMode ? 'text-white' : 'text-[#5288c1]'}`} />
                            ) : (
                              <Check className={`w-3.5 h-3.5 ${isActive || isSelectedInMode ? 'text-white/70' : 'text-[#7f91a4]'}`} />
                            )
                          )}
                          <span className={`text-xs ${isActive || isSelectedInMode ? 'text-white/80' : 'text-[#7f91a4]'}`}>
                            {formatChatListTime(chat.lastMessage?.createdAt, chat.lastMessage?.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Message preview, voice icon, badge, pin */}
                      <div className={`flex gap-1 ${settings.chatListLayout === 'tiga' ? 'items-start justify-between' : 'items-center justify-between'}`}>
                        <div className={`text-xs font-normal min-w-0 ${
                          settings.chatListLayout === 'tiga' ? 'line-clamp-2 mt-0.5' : 'truncate flex items-center gap-1'
                        } ${
                          isActive || isSelectedInMode ? 'text-white/90 italic' : 'text-[#7f91a4]'
                        }`}>
                          {chat.lastMessage?.hasVoice && (
                            <Mic className={`w-3.5 h-3.5 shrink-0 inline-block align-middle mr-1 ${isActive || isSelectedInMode ? 'text-white' : 'text-[#5288c1]'}`} />
                          )}
                          {chat.lastMessage?.hasImage && !chat.lastMessage?.hasVoice && (
                            <Camera className={`w-3.5 h-3.5 shrink-0 inline-block align-middle mr-1 ${isActive || isSelectedInMode ? 'text-white' : 'text-[#5288c1]'}`} />
                          )}
                          <span className={settings.chatListLayout === 'tiga' ? '' : 'truncate'}>
                            {chat.type === 'group' && chat.lastMessage && !chat.lastMessage.isOutgoing && chat.lastMessage.senderName && (
                              <span className={`font-medium ${isActive || isSelectedInMode ? 'text-white' : 'text-slate-200'}`}>
                                {chat.lastMessage.senderName}:{' '}
                              </span>
                            )}
                            {chat.lastMessage?.text || (chat.lastMessage?.hasImage ? 'Foto' : (chat.lastMessage?.hasVoice ? 'Pesan suara' : 'Tidak ada pesan'))}
                          </span>
                        </div>

                        <div className={`flex items-center gap-1.5 shrink-0 ml-1 ${settings.chatListLayout === 'tiga' ? 'mt-1' : ''}`}>
                          {chat.isPinned && (
                            <Pin className={`w-3.5 h-3.5 transform rotate-45 ${
                              isActive || isSelectedInMode ? 'text-white/80' : 'text-[#7f91a4]'
                            }`} />
                          )}
                          {chat.unreadCount > 0 && (
                            <span
                              className={`px-1.5 py-0.2 text-[11px] font-semibold rounded-full min-w-[20px] text-center ${
                                isActive || isSelectedInMode
                                  ? 'bg-white text-[#2b5278]'
                                  : chat.badgeType === 'grey' || chat.isMuted
                                  ? 'bg-[#242f3d] text-[#7f91a4]'
                                  : 'bg-[#5288c1] text-white'
                              }`}
                            >
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
      </>
      )}

      {/* Floating Action Buttons (Positioned right above the bottom navigation bar) */}
      {!selectionMode && (
        <div className="absolute bottom-[72px] right-4 sm:right-5 flex flex-col items-center gap-2.5 z-20">
          {mainBottomTab === 'chat' && (
            <button
              id="fab-compose-btn"
              onClick={onOpenNewChat}
              className="w-13 h-13 rounded-full bg-[#5288c1] hover:bg-[#4374a8] text-white flex items-center justify-center shadow-xl shadow-[#5288c1]/35 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Tulis Pesan Baru / Cari Kontak"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          )}

          {mainBottomTab === 'calls' && (
            <button
              id="fab-call-btn"
              onClick={onOpenNewChat}
              className="w-13 h-13 rounded-full bg-[#4fae5e] hover:bg-[#439651] text-white flex items-center justify-center shadow-xl shadow-[#4fae5e]/35 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Panggil Kontak Baru"
            >
              <Phone className="w-5 h-5" />
            </button>
          )}


        </div>
      )}

      {/* Bottom Navigation Bar (Chat, Panggilan, Pembaruan) */}
      <div 
        id="bottom-nav-bar"
        className="h-[64px] bg-[#17212b] border-t border-[#101921] flex items-center justify-around px-3 py-1 shrink-0 z-20 select-none shadow-lg"
      >
        {/* Tab 1: Chat */}
        <button
          id="btn-nav-chat"
          onClick={() => {
            setMainBottomTab('chat');
            setSearchQuery('');
          }}
          className="flex-1 flex flex-col items-center justify-center py-1 group cursor-pointer transition-transform active:scale-95"
        >
          <div className={`w-14 h-7 rounded-full flex items-center justify-center transition-colors ${
            mainBottomTab === 'chat' 
              ? 'bg-[#242f3d] text-white' 
              : 'text-[#7f91a4] group-hover:text-white group-hover:bg-[#202b36]'
          }`}>
            <MessageSquare className={`w-4 h-4 ${mainBottomTab === 'chat' ? 'fill-white text-white' : ''}`} />
          </div>
          <span className={`text-[11px] mt-1 leading-tight tracking-wide transition-colors ${
            mainBottomTab === 'chat' ? 'font-semibold text-white' : 'font-medium text-[#7f91a4] group-hover:text-white'
          }`}>
            Chat
          </span>
        </button>

        {/* Tab 2: Panggilan */}
        <button
          id="btn-nav-calls"
          onClick={() => {
            setMainBottomTab('calls');
          }}
          className="flex-1 flex flex-col items-center justify-center py-1 group cursor-pointer transition-transform active:scale-95"
        >
          <div className={`w-14 h-7 rounded-full flex items-center justify-center transition-colors ${
            mainBottomTab === 'calls' 
              ? 'bg-[#242f3d] text-white' 
              : 'text-[#7f91a4] group-hover:text-white group-hover:bg-[#202b36]'
          }`}>
            <Phone className="w-4 h-4" />
          </div>
          <span className={`text-[11px] mt-1 leading-tight tracking-wide transition-colors ${
            mainBottomTab === 'calls' ? 'font-semibold text-white' : 'font-medium text-[#7f91a4] group-hover:text-white'
          }`}>
            Panggilan
          </span>
        </button>

        {/* Tab 3: Pembaruan (with green badge dot) */}
        <button
          id="btn-nav-updates"
          onClick={() => {
            setMainBottomTab('updates');
          }}
          className="flex-1 flex flex-col items-center justify-center py-1 group cursor-pointer transition-transform active:scale-95"
        >
          <div className={`w-14 h-7 rounded-full flex items-center justify-center transition-colors ${
            mainBottomTab === 'updates' 
              ? 'bg-[#242f3d] text-white' 
              : 'text-[#7f91a4] group-hover:text-white group-hover:bg-[#202b36]'
          }`}>
            <div className="relative flex items-center justify-center">
              <Radio className="w-4 h-4" />
              {/* Vibrant green badge dot as shown in uploaded image */}
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#4fae5e] rounded-full ring-2 ring-[#17212b]" />
            </div>
          </div>
          <span className={`text-[11px] mt-1 leading-tight tracking-wide transition-colors ${
            mainBottomTab === 'updates' ? 'font-semibold text-white' : 'font-medium text-[#7f91a4] group-hover:text-white'
          }`}>
            Pembaruan
          </span>
        </button>
      </div>

      {viewingStoryId && (
        <StoryViewerModal
          isOpen={!!viewingStoryId}
          initialStoryId={viewingStoryId}
          stories={viewingStoryList}
          currentUser={currentUser}
          onClose={() => {
            setViewingStoryId(null);
            setViewingStoryList([]);
          }}
          onReactStory={async (storyId, emoji) => {
            try {
              await fetch(`/api/stories/${storyId}/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, emoji }),
              });
            } catch (err) {
              console.error(err);
            }
          }}
        />
      )}

    </div>
  );
};
