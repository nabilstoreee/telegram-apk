import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Plus, Image as ImageIcon, Type,
  ChevronRight, ChevronDown, X, Search, RefreshCw,
  MoreVertical, Shield, Archive, ArrowLeft,
  EyeOff, Eye, VolumeX, CheckCircle, AlertTriangle, Trash2
} from 'lucide-react';
import { User, Story, StoryPrivacySetting } from '../types';
import { UserAvatar } from './UserAvatar';
import { VerifiedBadge } from './VerifiedBadge';
import { StoryComposerModal } from './StoryComposerModal';
import { StoryViewerModal } from './StoryViewerModal';
import { StoryPrivacyModal } from './StoryPrivacyModal';
import { StoryArchiveModal } from './StoryArchiveModal';

interface UpdatesViewProps {
  currentUser: User;
  onOpenDrawer: () => void;
  onBack?: () => void;
}

export const UpdatesView: React.FC<UpdatesViewProps> = ({
  currentUser,
  onOpenDrawer,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [viewingStoryId, setViewingStoryId] = useState<string | null>(null);
  const [viewingStoryList, setViewingStoryList] = useState<Story[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // Blocked / Archived story contacts state
  const [blockedStoryUserIds, setBlockedStoryUserIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tg_blocked_story_user_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isBlockedSectionOpen, setIsBlockedSectionOpen] = useState(false);
  const [contextMenuTarget, setContextMenuTarget] = useState<{
    userId: string;
    userName: string;
    isBlocked: boolean;
    stories: Story[];
  } | null>(null);
  const [confirmBlockTarget, setConfirmBlockTarget] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Long press timer refs
  const pressTimerRef = useRef<any>(null);
  const isLongPressRef = useRef(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 3000);
  };

  const saveBlockedStoryUserIds = (newIds: string[]) => {
    setBlockedStoryUserIds(newIds);
    try {
      localStorage.setItem('tg_blocked_story_user_ids', JSON.stringify(newIds));
    } catch (e) {
      console.error(e);
    }
  };

  const handleBlockStoryUser = (userId: string, userName: string) => {
    if (!blockedStoryUserIds.includes(userId)) {
      const updated = [...blockedStoryUserIds, userId];
      saveBlockedStoryUserIds(updated);
      showToast(`Status dari ${userName} berhasil diblokir & diarsipkan.`);
    }
  };

  const handleUnblockStoryUser = (userId: string, userName: string) => {
    const updated = blockedStoryUserIds.filter(id => id !== userId);
    saveBlockedStoryUserIds(updated);
    showToast(`Blokir status ${userName} berhasil dibuka.`);
  };

  const startPressTimer = (group: any) => {
    isLongPressRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
      setContextMenuTarget({
        userId: group.userId,
        userName: group.userName,
        isBlocked: blockedStoryUserIds.includes(group.userId),
        stories: group.stories
      });
    }, 500);
  };

  const cancelPressTimer = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  // Fetch real stories from server
  const fetchStories = async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/stories?userId=${encodeURIComponent(currentUser.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.stories)) {
          setStories(data.stories);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat status sementara:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchStories();

    // Listen for SSE updates
    const eventSource = new EventSource(`/api/events?userId=${encodeURIComponent(currentUser.id)}`);

    eventSource.addEventListener('story_created', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.story) {
          setStories(prev => [data.story, ...prev.filter(s => s.id !== data.story.id)]);
        }
      } catch (err) {
        console.error(err);
      }
    });

    eventSource.addEventListener('story_deleted', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.storyId) {
          setStories(prev => prev.filter(s => s.id !== data.storyId));
        }
      } catch (err) {
        console.error(err);
      }
    });

    eventSource.addEventListener('story_viewed', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.storyId && data.viewer) {
          setStories(prev => prev.map(s => {
            if (s.id === data.storyId) {
              const viewers = s.viewers || [];
              if (!viewers.some(v => v.userId === data.viewer.userId)) {
                return { ...s, viewers: [...viewers, data.viewer] };
              }
            }
            return s;
          }));
        }
      } catch (err) {
        console.error(err);
      }
    });

    eventSource.addEventListener('story_reacted', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.storyId && data.reactions) {
          setStories(prev => prev.map(s => {
            if (s.id === data.storyId) {
              return { ...s, reactions: data.reactions };
            }
            return s;
          }));
        }
      } catch (err) {
        console.error(err);
      }
    });

    eventSource.addEventListener('user_updated', () => fetchStories());
    eventSource.addEventListener('users_updated', () => fetchStories());

    return () => {
      eventSource.close();
    };
  }, [currentUser.id]);

  const handleDeleteStory = async (storyId: string) => {
    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (res.ok) {
        setStories(prev => prev.filter(s => s.id !== storyId));
        if (viewingStoryId === storyId) {
          setViewingStoryId(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete story:', err);
    }
  };

  const handleReactStory = async (storyId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/stories/${storyId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        setStories(prev => prev.map(s => s.id === storyId ? { ...s, reactions: data.reactions } : s));
      }
    } catch (err) {
      console.error('Failed to react to story:', err);
    }
  };

  const myStories = stories.filter(s => s.userId === currentUser.id);
  const contactsStories = stories.filter(s => s.userId !== currentUser.id);

  const formatRelativeTime = (time: number) => {
    const diff = Date.now() - time;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} mnt lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    return '1 hari lalu';
  };

  // Group contacts' stories by userId so multiple statuses from the same user are combined into 1 contact item
  const groupedContactsMap = new Map<string, Story[]>();
  const sortedContactsStories = [...contactsStories].sort((a, b) => a.createdAt - b.createdAt);
  for (const story of sortedContactsStories) {
    const list = groupedContactsMap.get(story.userId) || [];
    list.push(story);
    groupedContactsMap.set(story.userId, list);
  }

  const groupedContactsList = Array.from(groupedContactsMap.entries()).map(([userId, userStories]) => {
    const latestStory = userStories[userStories.length - 1];
    const hasUnviewed = userStories.some(s => !s.viewers?.some(v => v.userId === currentUser.id));
    const unviewedCount = userStories.filter(s => !s.viewers?.some(v => v.userId === currentUser.id)).length;
    const isBlocked = blockedStoryUserIds.includes(userId);
    return {
      userId,
      userName: latestStory.userName,
      userAvatar: latestStory.userAvatar,
      userColor: latestStory.userColor,
      isVerified: latestStory.isVerified !== undefined ? latestStory.isVerified : true,
      badgeColor: latestStory.badgeColor || 'blue',
      stories: userStories,
      latestStory,
      hasUnviewed,
      unviewedCount,
      isBlocked,
    };
  }).sort((a, b) => {
    if (a.hasUnviewed && !b.hasUnviewed) return -1;
    if (!a.hasUnviewed && b.hasUnviewed) return 1;
    return b.latestStory.createdAt - a.latestStory.createdAt;
  });

  // Split active and blocked contacts
  const activeContactsList = groupedContactsList.filter(g => !g.isBlocked);
  const blockedContactsList = groupedContactsList.filter(g => g.isBlocked);

  const filteredActiveContacts = activeContactsList.filter(group => 
    group.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    group.stories.some(s => s.text && s.text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredBlockedContacts = blockedContactsList.filter(group => 
    group.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    group.stories.some(s => s.text && s.text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full h-full flex flex-col bg-[#17212b] text-white select-none relative">
      {/* Top Header matching ChatList */}
      <div className="p-3.5 border-b border-[#101921] flex items-center gap-2.5 bg-[#17212b] shrink-0">
        <button
          id="header-hamburger-updates-btn"
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
            id="search-updates-input"
            type="text"
            placeholder="Cari pembaruan status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#242f3d] border border-[#242f3d] focus:border-[#5288c1] rounded-xl py-2 pl-3.5 pr-9 text-sm focus:outline-hidden text-white placeholder-[#7f91a4] transition-all shadow-inner"
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

        <button
          onClick={fetchStories}
          className={`p-2 rounded-xl text-[#7f91a4] hover:text-white hover:bg-[#242f3d] transition-colors cursor-pointer shrink-0 ${
            isLoading ? 'animate-spin text-[#5288c1]' : ''
          }`}
          title="Segarkan"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Three dots menu button next to search updates */}
        <div className="relative shrink-0">
          <button
            id="btn-updates-more-menu"
            type="button"
            onClick={() => setIsMenuOpen(prev => !prev)}
            className={`p-2 rounded-xl text-[#7f91a4] hover:text-white hover:bg-[#242f3d] transition-colors cursor-pointer ${
              isMenuOpen ? 'text-white bg-[#242f3d]' : ''
            }`}
            title="Opsi Pembaruan"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Telegram Dropdown Popover */}
          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setIsMenuOpen(false)}
              />
              <div 
                id="updates-dropdown-menu"
                className="absolute right-0 top-full mt-1.5 w-52 bg-[#242f3d] border border-[#2b394a] rounded-xl shadow-2xl z-50 py-1 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
              >
                {/* 1. Privasi Status */}
                <button
                  type="button"
                  id="menu-item-privacy"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsPrivacyModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center gap-3 text-xs text-white hover:bg-[#17212b] transition-colors cursor-pointer text-left"
                >
                  <Shield className="w-4 h-4 text-[#5288c1] shrink-0" />
                  <span className="font-medium">Privasi status</span>
                </button>

                {/* 2. Hapus Semua Status */}
                <button
                  type="button"
                  id="menu-item-clear-stories"
                  onClick={async () => {
                    setIsMenuOpen(false);
                    if (window.confirm("Apakah Anda yakin ingin menghapus semua status?")) {
                      try {
                        const res = await fetch('/api/stories/clear-all', { method: 'POST' });
                        if (res.ok) {
                          fetchStories();
                          showToast("Semua status berhasil dihapus.");
                        } else {
                          showToast("Gagal menghapus status.");
                        }
                      } catch (e) {
                        console.error(e);
                        showToast("Terjadi kesalahan.");
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center gap-3 text-xs text-rose-400 hover:bg-[#17212b] transition-colors cursor-pointer text-left border-t border-[#2b394a]"
                >
                  <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-medium">Hapus semua status</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        
        {/* My Status Card */}
        <div className="bg-[#202b36] rounded-2xl p-4 border border-[#2b394a]">
          <div className="flex items-center justify-between">
            <div 
              onClick={() => {
                if (myStories.length > 0) {
                  setViewingStoryList(myStories);
                  setViewingStoryId(myStories[0].id);
                } else {
                  setIsComposerOpen(true);
                }
              }}
              className="flex items-center gap-3.5 cursor-pointer flex-1 group"
            >
              <div className="relative">
                <div className={`p-0.5 rounded-full ${myStories.length > 0 ? 'bg-linear-to-tr from-[#5288c1] via-[#4fae5e] to-[#f4a261] shadow-md shadow-[#5288c1]/25' : ''}`}>
                  <UserAvatar
                    name={currentUser?.name || 'Saya'}
                    username={currentUser?.username}
                    avatar={currentUser?.avatar}
                    color={currentUser?.color || '#5288c1'}
                    size="lg"
                  />
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsComposerOpen(true);
                  }}
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#5288c1] hover:bg-[#4374a8] text-white rounded-full flex items-center justify-center border-2 border-[#202b36] shadow cursor-pointer transition-transform hover:scale-110"
                  title="Buat Status Baru"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-[#5288c1] transition-colors">
                  Status Saya
                </div>
                <div className="text-xs text-[#7f91a4] mt-0.5">
                  {myStories.length > 0 
                    ? `${myStories.length} status aktif (${formatRelativeTime(myStories[0].createdAt)})` 
                    : 'Ketuk untuk membagikan foto, teks, atau suara'}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsComposerOpen(true)}
              className="px-3.5 py-2 bg-[#5288c1] hover:bg-[#4374a8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-[#5288c1]/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat</span>
            </button>
          </div>


        </div>

        {/* Contacts Stories List */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7f91a4] mb-2 px-1 flex items-center justify-between">
            <span>Pembaruan Terbaru ({filteredActiveContacts.length})</span>
            <span className="text-[10px] text-[#5288c1] lowercase">24 jam</span>
          </div>

          <div className="space-y-1.5">
            {filteredActiveContacts.length === 0 ? (
              <div className="p-8 text-center bg-[#202b36]/30 border border-[#242f3d] rounded-2xl flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#17212b] border border-[#2b394a] flex items-center justify-center text-[#7f91a4] mb-3">
                  <Sparkles className="w-5 h-5 text-[#5288c1]" />
                </div>
                <p className="text-sm font-medium text-slate-300">Belum ada pembaruan status</p>
                <p className="text-xs text-[#7f91a4] mt-1 max-w-xs leading-relaxed">
                  Status foto atau teks berwarna dari kontak akan muncul di sini secara langsung.
                </p>
              </div>
            ) : (
              filteredActiveContacts.map((group) => {
                const firstUnviewed = group.stories.find(s => !s.viewers?.some(v => v.userId === currentUser.id)) || group.stories[0];

                return (
                  <div
                    key={group.userId}
                    onTouchStart={() => startPressTimer(group)}
                    onTouchEnd={cancelPressTimer}
                    onTouchMove={cancelPressTimer}
                    onMouseDown={() => startPressTimer(group)}
                    onMouseUp={cancelPressTimer}
                    onMouseLeave={cancelPressTimer}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuTarget({
                        userId: group.userId,
                        userName: group.userName,
                        isBlocked: false,
                        stories: group.stories
                      });
                    }}
                    onClick={() => {
                      if (isLongPressRef.current) {
                        isLongPressRef.current = false;
                        return;
                      }
                      setViewingStoryList(group.stories);
                      setViewingStoryId(firstUnviewed.id);
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#202b36]/60 hover:bg-[#202b36] active:bg-[#283644] border border-[#242f3d] transition-all cursor-pointer group select-none relative"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`p-0.5 rounded-full shrink-0 ${
                        group.hasUnviewed 
                          ? 'bg-linear-to-tr from-[#5288c1] via-[#4fae5e] to-[#f4a261] shadow-md shadow-[#5288c1]/20' 
                          : 'bg-[#313e4f]'
                      }`}>
                        <UserAvatar
                          name={group.userName}
                          avatar={group.userAvatar}
                          color={group.userColor || '#5288c1'}
                          size="md"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white truncate group-hover:text-[#5288c1] transition-colors flex items-center gap-1.5">
                          <span className="truncate">{group.userName}</span>
                          <VerifiedBadge isVerified={group.isVerified} badgeColor={group.badgeColor} size="sm" />
                        </div>
                        <div className="text-[11px] text-[#7f91a4] truncate mt-0.5">
                          {formatRelativeTime(group.latestStory.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenuTarget({
                            userId: group.userId,
                            userName: group.userName,
                            isBlocked: false,
                            stories: group.stories
                          });
                        }}
                        className="p-1.5 rounded-lg text-[#7f91a4] hover:text-white hover:bg-[#2e3b4d] transition-colors cursor-pointer"
                        title="Opsi status (Blokir / Arsip)"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-[#7f91a4] group-hover:text-white transition-colors" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Blocked / Muted Story Archive Section */}
          {filteredBlockedContacts.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[#1e2936] space-y-2">
              <button
                type="button"
                onClick={() => setIsBlockedSectionOpen(prev => !prev)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#202b36]/40 hover:bg-[#202b36] text-[#7f91a4] hover:text-white transition-all cursor-pointer border border-[#242f3d]/60"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center">
                    <EyeOff className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Pembaruan yang Diblokir / Diarsipkan ({filteredBlockedContacts.length})
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isBlockedSectionOpen ? 'rotate-180 text-white' : 'text-[#7f91a4]'}`} />
              </button>

              {isBlockedSectionOpen && (
                <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                  {filteredBlockedContacts.map((group) => {
                    const firstUnviewed = group.stories.find(s => !s.viewers?.some(v => v.userId === currentUser.id)) || group.stories[0];

                    return (
                      <div
                        key={group.userId}
                        onTouchStart={() => startPressTimer(group)}
                        onTouchEnd={cancelPressTimer}
                        onTouchMove={cancelPressTimer}
                        onMouseDown={() => startPressTimer(group)}
                        onMouseUp={cancelPressTimer}
                        onMouseLeave={cancelPressTimer}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenuTarget({
                            userId: group.userId,
                            userName: group.userName,
                            isBlocked: true,
                            stories: group.stories
                          });
                        }}
                        onClick={() => {
                          if (isLongPressRef.current) {
                            isLongPressRef.current = false;
                            return;
                          }
                          setViewingStoryList(group.stories);
                          setViewingStoryId(firstUnviewed.id);
                        }}
                        className="flex items-center justify-between p-3 rounded-2xl bg-[#1a232e]/80 hover:bg-[#202b36] border border-[#2b394a]/50 transition-all cursor-pointer group select-none opacity-85 hover:opacity-100"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="p-0.5 rounded-full shrink-0 bg-[#283442]">
                            <UserAvatar
                              name={group.userName}
                              avatar={group.userAvatar}
                              color={group.userColor || '#5288c1'}
                              size="md"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-300 truncate flex items-center gap-1.5">
                              <span className="truncate">{group.userName}</span>
                              <VerifiedBadge isVerified={group.isVerified} badgeColor={group.badgeColor} size="sm" />
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-400 font-normal border border-red-500/25">
                                Diblokir
                              </span>
                            </div>
                            <div className="text-[11px] text-[#7f91a4] truncate mt-0.5">
                              {formatRelativeTime(group.latestStory.createdAt)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnblockStoryUser(group.userId, group.userName);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-[#242f3d] hover:bg-[#5288c1] text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                          >
                            Buka Blokir
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setContextMenuTarget({
                                userId: group.userId,
                                userName: group.userName,
                                isBlocked: true,
                                stories: group.stories
                              });
                            }}
                            className="p-1.5 rounded-lg text-[#7f91a4] hover:text-white hover:bg-[#2e3b4d] transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#202b36] border border-[#5288c1]/40 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs animate-in slide-in-from-top-2 duration-150">
          <CheckCircle className="w-4 h-4 text-[#5288c1] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Context Menu / Bottom Sheet for Status (Triggered on Long Press or 3 Dots) */}
      {contextMenuTarget && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setContextMenuTarget(null)}
        >
          <div 
            className="w-full sm:max-w-sm bg-[#17212b] border-t sm:border border-[#2b394a] rounded-t-2xl sm:rounded-2xl p-4 shadow-2xl text-white space-y-3 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#242f3d]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#5288c1]/20 flex items-center justify-center text-[#5288c1]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Status {contextMenuTarget.userName}</h4>
                  <p className="text-[11px] text-[#7f91a4]">Pilihan tindakan pembaruan status</p>
                </div>
              </div>
              <button 
                onClick={() => setContextMenuTarget(null)}
                className="p-1 rounded-full text-[#7f91a4] hover:text-white hover:bg-[#202b36]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 pt-1">
              <button
                onClick={() => {
                  const target = contextMenuTarget;
                  setContextMenuTarget(null);
                  if (target.stories.length > 0) {
                    setViewingStoryList(target.stories);
                    setViewingStoryId(target.stories[0].id);
                  }
                }}
                className="w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-xs font-medium text-white hover:bg-[#202b36] transition-colors cursor-pointer text-left"
              >
                <Eye className="w-4 h-4 text-[#5288c1] shrink-0" />
                <span>Lihat Status</span>
              </button>

              {!contextMenuTarget.isBlocked ? (
                <button
                  onClick={() => {
                    const target = contextMenuTarget;
                    setContextMenuTarget(null);
                    setConfirmBlockTarget({ userId: target.userId, userName: target.userName });
                  }}
                  className="w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                >
                  <EyeOff className="w-4 h-4 text-red-400 shrink-0" />
                  <div>
                    <div className="font-semibold">Blokir & Arsipkan Status</div>
                    <div className="text-[10px] text-red-300/70 font-normal">Sembunyikan dari daftar pembaruan status utama</div>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => {
                    const target = contextMenuTarget;
                    setContextMenuTarget(null);
                    handleUnblockStoryUser(target.userId, target.userName);
                  }}
                  className="w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-xs font-medium text-[#4fae5e] hover:bg-[#4fae5e]/10 transition-colors cursor-pointer text-left"
                >
                  <CheckCircle className="w-4 h-4 text-[#4fae5e] shrink-0" />
                  <div>
                    <div className="font-semibold">Buka Blokir Status</div>
                    <div className="text-[10px] text-slate-400 font-normal">Kembalikan ke daftar pembaruan status utama</div>
                  </div>
                </button>
              )}
            </div>

            <button
              onClick={() => setContextMenuTarget(null)}
              className="w-full py-2.5 bg-[#202b36] hover:bg-[#2b394a] rounded-xl text-xs font-semibold text-[#7f91a4] hover:text-white transition-colors cursor-pointer text-center"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Blocking Status */}
      {confirmBlockTarget && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setConfirmBlockTarget(null)}
        >
          <div 
            className="bg-[#17212b] border border-[#2b394a] rounded-2xl p-5 max-w-sm w-full shadow-2xl text-white space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <EyeOff className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-white">Blokir Pembaruan Status?</h4>
              <p className="text-xs text-[#7f91a4] mt-1.5 leading-relaxed">
                Pembaruan status baru dari <span className="text-white font-semibold">{confirmBlockTarget.userName}</span> akan dipindahkan ke arsip status yang diblokir dan tidak akan muncul di daftar pembaruan status utama.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmBlockTarget(null)}
                className="flex-1 py-2.5 bg-[#202b36] hover:bg-[#2b394a] rounded-xl text-xs font-semibold text-[#7f91a4] hover:text-white transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  handleBlockStoryUser(confirmBlockTarget.userId, confirmBlockTarget.userName);
                  setConfirmBlockTarget(null);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white shadow-md shadow-red-600/30 transition-colors cursor-pointer"
              >
                Blokir Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story Creation Modal */}
      {isComposerOpen && (
        <StoryComposerModal
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          currentUser={currentUser}
          onStoryCreated={(newStory) => {
            setStories(prev => [newStory, ...prev.filter(s => s.id !== newStory.id)]);
          }}
          onOpenPrivacyModal={() => {
            setIsPrivacyModalOpen(true);
          }}
        />
      )}

      {/* Story Privacy Settings Modal */}
      {isPrivacyModalOpen && (
        <StoryPrivacyModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
          currentUser={currentUser}
          onSave={(newSetting) => {
            currentUser.storyPrivacy = newSetting;
          }}
        />
      )}

      {/* Story Personal Archive Modal */}
      {isArchiveModalOpen && (
        <StoryArchiveModal
          isOpen={isArchiveModalOpen}
          onClose={() => setIsArchiveModalOpen(false)}
          currentUser={currentUser}
          onSelectStoryToView={(story, allArchived) => {
            setViewingStoryList(allArchived);
            setViewingStoryId(story.id);
          }}
          onStoryReposted={(repostedStory) => {
            setStories(prev => [repostedStory, ...prev]);
          }}
        />
      )}

      {/* Story Full Screen Viewer */}
      {viewingStoryId && (
        <StoryViewerModal
          isOpen={!!viewingStoryId}
          initialStoryId={viewingStoryId}
          stories={viewingStoryList.length > 0 ? viewingStoryList : stories}
          currentUser={currentUser}
          onClose={() => {
            setViewingStoryId(null);
            setViewingStoryList([]);
          }}
          onDeleteStory={handleDeleteStory}
          onReactStory={handleReactStory}
        />
      )}
    </div>
  );
};
