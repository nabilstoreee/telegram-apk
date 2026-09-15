import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, Search, MoreVertical, Sliders, HelpCircle,
  VolumeX, Archive, Trash2, X, Check, Pin, CheckCheck,
  FolderMinus, RotateCcw, Ban, EyeOff, PlayCircle,
  Inbox, ChevronRight
} from 'lucide-react';
import { Chat, User } from '../types';
import { UserAvatar } from './UserAvatar';
import { formatChatListTime } from '../utils/time';
import { VerifiedBadge } from './VerifiedBadge';

interface ArchivedChatsViewProps {
  chats: Chat[];
  onSelectChat: (chat: Chat) => void;
  onBack: () => void;
  currentUser: User;
  onUnarchiveChats?: (chatIds: string[]) => void;
  onMuteChats?: (chatIds: string[]) => void;
  onDeleteChats?: (chatIds: string[]) => void;
  onPinChats?: (chatIds: string[]) => void;
  onMarkChatsRead?: (chatIds: string[]) => void;
  onClearChatHistory?: (chatIds: string[]) => void;
}

export const ArchivedChatsView: React.FC<ArchivedChatsViewProps> = ({
  chats,
  onSelectChat,
  onBack,
  currentUser,
  onUnarchiveChats,
  onMuteChats,
  onDeleteChats,
  onPinChats,
  onMarkChatsRead,
  onClearChatHistory,
}) => {
  // Navigation mode: 'list' (Foto 2) or 'settings' (Foto 4)
  const [viewMode, setViewMode] = useState<'list' | 'settings'>('list');
  
  // 3-dots popup menu (Foto 3)
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  
  // "Berikut arsip Anda" Bottom Sheet / Modal (Foto 5)
  const [showHowItWorksModal, setShowHowItWorksModal] = useState<boolean>(false);

  // Search in archive
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selection mode (long press)
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Archive settings toggles (Foto 4)
  const [keepUnmutedArchived, setKeepUnmutedArchived] = useState<boolean>(() => {
    const saved = localStorage.getItem('tg_archive_unmuted');
    return saved !== null ? saved === 'true' : true;
  });
  const [keepFolderArchived, setKeepFolderArchived] = useState<boolean>(() => {
    const saved = localStorage.getItem('tg_archive_folder');
    return saved !== null ? saved === 'true' : true;
  });
  const [autoArchiveUnknown, setAutoArchiveUnknown] = useState<boolean>(() => {
    const saved = localStorage.getItem('tg_archive_unknown');
    return saved !== null ? saved === 'true' : false;
  });

  const saveArchiveSettings = (key: string, val: boolean) => {
    localStorage.setItem(key, String(val));
  };

  // Long press timer refs
  const longPressTimerRef = useRef<any>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  const pointerStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 2200);
  };

  // Keyboard Escape listener to go back or dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showHowItWorksModal) {
          setShowHowItWorksModal(false);
        } else if (showMoreMenu) {
          setShowMoreMenu(false);
        } else if (selectionMode) {
          setSelectionMode(false);
          setSelectedChatIds([]);
        } else if (isSearching) {
          setIsSearching(false);
          setSearchQuery('');
        } else if (viewMode === 'settings') {
          setViewMode('list');
        } else {
          onBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHowItWorksModal, showMoreMenu, selectionMode, isSearching, viewMode, onBack]);

  // Filter only archived chats
  const archivedChats = chats.filter((c) => c.isArchived);

  const cleanQuery = searchQuery.trim().toLowerCase();
  const displayedChats = cleanQuery
    ? archivedChats.filter(
        (c) =>
          c.name.toLowerCase().includes(cleanQuery) ||
          (c.username && c.username.toLowerCase().includes(cleanQuery)) ||
          (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(cleanQuery))
      )
    : archivedChats;

  // Pointer / touch handlers for long-press selection
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
  };

  const handleUnarchiveSelected = () => {
    if (onUnarchiveChats && selectedChatIds.length > 0) {
      onUnarchiveChats(selectedChatIds);
      showToast(`${selectedChatIds.length} obrolan dikeluarkan dari arsip`);
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

  const handleMuteSelected = () => {
    if (onMuteChats && selectedChatIds.length > 0) {
      onMuteChats(selectedChatIds);
      showToast(`${selectedChatIds.length} obrolan dibisukan / dibunyikan`);
    }
    exitSelectionMode();
  };

  // Format large unread counts (e.g. 27701, 360248)
  const formatUnreadBadge = (count: number) => {
    if (!count) return '';
    return count.toString();
  };

  // =========================================================================
  // VIEW 2: PENGATURAN ARSIP (FOTO 4)
  // =========================================================================
  if (viewMode === 'settings') {
    return (
      <div id="archive-settings-container" className="flex flex-col h-full bg-[#0e1621] text-slate-100 select-none">
        {/* Header (Foto 4) */}
        <div className="h-14 bg-[#17212b] border-b border-[#101921] flex items-center gap-3 px-4 shrink-0 shadow-md">
          <button
            id="btn-back-archive-settings"
            onClick={() => setViewMode('list')}
            className="p-1.5 -ml-1 text-[#7f91a4] hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-base font-bold text-white tracking-wide">Pengaturan Arsip</h2>
        </div>

        {/* Settings Body (Foto 4) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#101921]/60">
          
          {/* Section 1: Obrolan tidak senyap */}
          <div className="p-4 bg-[#17212b] space-y-2">
            <h4 className="text-xs font-bold text-[#5288c1]">Obrolan tidak senyap</h4>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-medium text-white">Selalu diarsipkan</span>
              <button
                id="toggle-unmuted-archived"
                onClick={() => {
                  const val = !keepUnmutedArchived;
                  setKeepUnmutedArchived(val);
                  saveArchiveSettings('tg_archive_unmuted', val);
                }}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  keepUnmutedArchived ? 'bg-[#5288c1]' : 'bg-[#242f3d]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    keepUnmutedArchived ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-[#7f91a4] leading-relaxed">
              Tetap simpan obrolan dalam Arsip meskipun tidak senyap dan mendapat pesan baru.
            </p>
          </div>

          {/* Section 2: Obrolan dari folder */}
          <div className="p-4 bg-[#17212b] space-y-2">
            <h4 className="text-xs font-bold text-[#5288c1]">Obrolan dari folder</h4>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-medium text-white">Selalu diarsipkan</span>
              <button
                id="toggle-folder-archived"
                onClick={() => {
                  const val = !keepFolderArchived;
                  setKeepFolderArchived(val);
                  saveArchiveSettings('tg_archive_folder', val);
                }}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  keepFolderArchived ? 'bg-[#5288c1]' : 'bg-[#242f3d]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    keepFolderArchived ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-[#7f91a4] leading-relaxed">
              Tetap simpan obrolan dari folder dalam Arsip meskipun tidak senyap dan mendapat pesan baru.
            </p>
          </div>

          {/* Section 3: Obrolan baru dari pengguna tak dikenal */}
          <div className="p-4 bg-[#17212b] space-y-2">
            <h4 className="text-xs font-bold text-[#5288c1]">Obrolan baru dari pengguna tak dikenal</h4>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-medium text-white">Arsipkan secara otomatis</span>
              <button
                id="toggle-unknown-archived"
                onClick={() => {
                  const val = !autoArchiveUnknown;
                  setAutoArchiveUnknown(val);
                  saveArchiveSettings('tg_archive_unknown', val);
                }}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  autoArchiveUnknown ? 'bg-[#5288c1]' : 'bg-[#242f3d]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    autoArchiveUnknown ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-[#7f91a4] leading-relaxed">
              Menyembunyikan obrolan, grup dan channel dari non kontak ke arsip dan senyapkan secara otomatis.
            </p>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: ARSIP OBROLAN LIST (FOTO 2 & FOTO 3)
  // =========================================================================
  return (
    <div
      id="archived-chats-container"
      className="flex flex-col h-full bg-[#17212b] text-slate-100 select-none relative overflow-hidden"
      onClick={() => {
        if (showMoreMenu) setShowMoreMenu(false);
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#17212b]/95 border border-[#5288c1]/40 text-white text-xs font-medium px-4 py-2 rounded-full shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      {selectionMode ? (
        /* Top Selection Bar inside Archive */
        <div className="h-14 bg-[#17212b] border-b border-[#101921] flex items-center justify-between px-3 md:px-4 z-30 shadow-md text-white">
          <div className="flex items-center gap-3">
            <button
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

          <div className="flex items-center gap-1">
            {/* Unarchive Button */}
            <button
              onClick={handleUnarchiveSelected}
              className="p-2 text-[#7f91a4] hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
              title="Keluarkan dari Arsip"
            >
              <Archive className="w-5 h-5 text-sky-400" />
            </button>

            {/* Mute/Unmute */}
            <button
              onClick={handleMuteSelected}
              className="p-2 text-[#7f91a4] hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
              title="Bisukan"
            >
              <VolumeX className="w-5 h-5" />
            </button>

            {/* Delete */}
            <button
              onClick={handleDeleteSelected}
              className="p-2 text-[#7f91a4] hover:text-red-400 rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
              title="Hapus"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* Standard Header (Foto 2 & Foto 3) */
        <div className="h-14 bg-[#17212b] border-b border-[#101921] flex items-center justify-between px-3 md:px-4 z-20 shrink-0 shadow-md relative">
          <div className="flex items-center gap-3">
            <button
              id="btn-back-from-archived"
              onClick={onBack}
              className="p-1.5 -ml-1 text-[#7f91a4] hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
              title="Kembali ke Obrolan"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h2 className="text-base font-bold text-white tracking-wide">Arsip Obrolan</h2>
          </div>

          {/* Action Icons Right: Search & 3 Dots (Foto 2) */}
          <div className="flex items-center gap-1">
            <button
              id="btn-search-archived"
              onClick={() => setIsSearching(!isSearching)}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isSearching ? 'text-white bg-[#242f3d]' : 'text-[#7f91a4] hover:text-white hover:bg-[#242f3d]'
              }`}
              title="Cari di Arsip"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              id="btn-archive-3dots-menu"
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreMenu(!showMoreMenu);
              }}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                showMoreMenu ? 'text-white bg-[#242f3d]' : 'text-[#7f91a4] hover:text-white hover:bg-[#242f3d]'
              }`}
              title="Menu Arsip"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* 3-DOTS DROPDOWN POPUP MENU (FOTO 3) */}
          {showMoreMenu && (
            <div
              id="archive-dropdown-menu"
              onClick={(e) => e.stopPropagation()}
              className="absolute right-3 top-12 w-60 bg-[#1e2632] border border-[#2d3a4b] shadow-2xl rounded-2xl p-1.5 backdrop-blur-md text-slate-100 z-50 animate-in zoom-in-95 duration-100 flex flex-col space-y-0.5"
            >
              {/* Option 1: Pengaturan Arsip (Foto 3) */}
              <button
                id="menu-item-archive-settings"
                onClick={() => {
                  setShowMoreMenu(false);
                  setViewMode('settings');
                }}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-[#273344] transition-colors text-sm font-medium text-left cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-[#7f91a4]" />
                <span className="text-white">Pengaturan Arsip</span>
              </button>

              {/* Option 2: Bagaimana cara kerjanya? (Foto 3) */}
              <button
                id="menu-item-archive-how-it-works"
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowHowItWorksModal(true);
                }}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-[#273344] transition-colors text-sm font-medium text-left cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-[#7f91a4]" />
                <span className="text-white">Bagaimana cara kerjanya?</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search Input Bar (if toggled) */}
      {isSearching && (
        <div className="p-2.5 bg-[#17212b] border-b border-[#101921] flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Cari di arsip obrolan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full bg-[#242f3d] border border-[#242f3d] focus:border-[#5288c1] rounded-xl py-2 pl-3.5 pr-8 text-sm focus:outline-none text-white placeholder-[#7f91a4]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7f91a4] hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setIsSearching(false);
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-[#5288c1] px-2 py-1 hover:text-white"
          >
            Batal
          </button>
        </div>
      )}

      {/* Archived Chats List (Foto 2) */}
      <div id="archived-chats-list" className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#101921]/60">
        {displayedChats.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-64 space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#242f3d] text-[#7f91a4] flex items-center justify-center shadow-inner">
              <Archive className="w-8 h-8" />
            </div>
            <div>
              <p className="font-semibold text-slate-200 text-sm">Tidak ada obrolan di arsip</p>
              <p className="text-xs text-[#7f91a4] mt-1">
                Tahan obrolan dari daftar utama lalu pilih Arsipkan untuk memindahkannya ke sini.
              </p>
            </div>
          </div>
        ) : (
          displayedChats.map((chat) => {
            const isSelectedInMode = selectedChatIds.includes(chat.id);
            const unreadStr = formatUnreadBadge(chat.unreadCount);

            return (
              <div
                key={chat.id}
                id={`archived-chat-item-${chat.id}`}
                onClick={(e) => handleChatClick(e, chat)}
                onPointerDown={(e) => handleChatPointerDown(e, chat)}
                onPointerMove={handleChatPointerMove}
                onPointerUp={handleChatPointerUpOrCancel}
                onPointerCancel={handleChatPointerUpOrCancel}
                onContextMenu={(e) => handleChatContextMenu(e, chat)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${
                  isSelectedInMode
                    ? 'bg-[#203042] text-white ring-1 ring-[#5288c1]/40'
                    : 'hover:bg-[#202b36]'
                }`}
              >
                {/* Avatar with Green checkmark badge if selected */}
                <div className="relative shrink-0">
                  <UserAvatar
                    name={chat.name}
                    username={chat.username}
                    avatar={chat.avatar}
                    color={chat.color || '#5288c1'}
                    size="lg"
                    isOnline={chat.isOnline}
                  />
                  {isSelectedInMode && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#4fae4e] text-white flex items-center justify-center ring-2 ring-[#17212b] shadow-md animate-in zoom-in-75 duration-100 z-10">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Content: Name, Muted icon, Last message, Timestamp, Unread Badge */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: Name, mute icon, timestamp */}
                  <div className="flex justify-between items-baseline mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <span className="font-semibold text-sm truncate text-white">
                        {chat.name}
                      </span>
                      <VerifiedBadge isVerified={chat.isVerified} badgeColor={(chat as any).badgeColor} size="sm" />
                      {chat.isMuted && (
                        <VolumeX className="w-3.5 h-3.5 text-[#7f91a4] shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-[#7f91a4] shrink-0">
                      {formatChatListTime(chat.lastMessage?.createdAt, chat.lastMessage?.timestamp) || ''}
                    </span>
                  </div>

                  {/* Row 2: Message preview, Unread badge */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-xs truncate font-normal min-w-0 text-[#7f91a4] flex items-center gap-1">
                      <span className="truncate">
                        {chat.lastMessage?.text || 'Tidak ada pesan terbaru'}
                      </span>
                    </div>

                    {chat.unreadCount > 0 && (
                      <div className="shrink-0 ml-1">
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#5288c1] text-white min-w-[20px] text-center inline-block shadow-xs">
                          {unreadStr}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ===================================================================== */}
      {/* BOTTOM SHEET / MODAL: "Berikut arsip Anda" (FOTO 5)                   */}
      {/* ===================================================================== */}
      {showHowItWorksModal && (
        <div
          id="how-it-works-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
          onClick={() => setShowHowItWorksModal(false)}
        >
          <div
            id="how-it-works-modal-content"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg mx-auto bg-[#1e2632] border-t border-[#2d3a4b] rounded-t-[28px] p-6 text-white shadow-2xl flex flex-col space-y-5 animate-in slide-in-from-bottom duration-250"
          >
            {/* Top Blue Archive Icon (Foto 5) */}
            <div className="w-16 h-16 rounded-full bg-[#5288c1] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#5288c1]/30">
              <Inbox className="w-8 h-8" />
            </div>

            {/* Title & Description */}
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white">Berikut arsip Anda</h3>
              <p className="text-xs text-[#7f91a4] leading-relaxed max-w-sm mx-auto">
                Obrolan yang diarsipkan akan tetap berada dalam Arsip saat Anda menerima pesan baru.{' '}
                <button
                  onClick={() => {
                    setShowHowItWorksModal(false);
                    setViewMode('settings');
                  }}
                  className="text-[#5288c1] font-semibold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Ketuk untuk ubah</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </p>
            </div>

            {/* 3 Feature Points (Foto 5) */}
            <div className="space-y-4 pt-1">
              
              {/* Point 1: Obrolan yang Diarsipkan */}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-[#242f3d] flex items-center justify-center shrink-0 text-[#7f91a4] mt-0.5">
                  <Inbox className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-white">Obrolan yang Diarsipkan</h4>
                  <p className="text-xs text-[#7f91a4] leading-relaxed">
                    Pindahkan obrolan ke Arsip Anda dan kembali dengan menggeser.
                  </p>
                </div>
              </div>

              {/* Point 2: Menyembunyikan Arsip */}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-[#242f3d] flex items-center justify-center shrink-0 text-[#7f91a4] mt-0.5">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-white">Menyembunyikan Arsip</h4>
                  <p className="text-xs text-[#7f91a4] leading-relaxed">
                    Sembunyikan Arsip dari layar utama Anda dengan menggeser.
                  </p>
                </div>
              </div>

              {/* Point 3: Cerita */}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-[#242f3d] flex items-center justify-center shrink-0 text-[#7f91a4] mt-0.5">
                  <PlayCircle className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-white">Cerita</h4>
                  <p className="text-xs text-[#7f91a4] leading-relaxed">
                    Arsipkan Cerita dari kontak Anda secara terpisah dari obrolan pribadi mereka.
                  </p>
                </div>
              </div>

            </div>

            {/* Bottom Button "Mengerti" (Foto 5) */}
            <div className="pt-2">
              <button
                id="btn-how-it-works-understand"
                onClick={() => setShowHowItWorksModal(false)}
                className="w-full py-3.5 bg-[#5288c1] hover:bg-[#4374a8] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#5288c1]/25 cursor-pointer text-center"
              >
                Mengerti
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
