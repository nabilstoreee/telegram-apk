import React, { useState, useEffect, useMemo } from 'react';
import { 
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, 
  Trash2, UserPlus, Search, CheckSquare, Check, X, ArrowLeft,
  MoreVertical, Square
} from 'lucide-react';
import { User, CallLog } from '../types';
import { UserAvatar } from './UserAvatar';
import { VerifiedBadge } from './VerifiedBadge';
import { formatMessageTime } from '../utils/time';
import { getMaskedContact } from '../utils/privacy';

interface CallsViewProps {
  currentUser: User;
  users: User[];
  onStartCall: (user: User, callType?: 'audio' | 'video') => void;
  onOpenDrawer: () => void;
  onBack?: () => void;
  onRefreshUsers?: () => void;
}

export const CallsView: React.FC<CallsViewProps> = ({
  currentUser,
  users,
  onStartCall,
  onOpenDrawer,
  onBack,
  onRefreshUsers,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'missed' | 'contacts'>('all');
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCallIds, setSelectedCallIds] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState<{ type: 'all' | 'selected'; count: number } | null>(null);
  
  // Contact multi-select & delete states
  const [isContactSelectionMode, setIsContactSelectionMode] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [showContactConfirmModal, setShowContactConfirmModal] = useState<{
    type: 'single' | 'selected' | 'all';
    target?: User;
    count?: number;
  } | null>(null);

  const [contactToDelete, setContactToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localUsers, setLocalUsers] = useState<User[]>(users);

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  const fetchCallLogs = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/calls/history?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setCallLogs(data.calls || []);
      }
    } catch (err) {
      console.error('Failed to fetch call logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchCallLogs();

      const eventSource = new EventSource(`/api/events?userId=${encodeURIComponent(currentUser.id)}`);
      eventSource.addEventListener('call_history_updated', () => {
        fetchCallLogs();
      });
      eventSource.addEventListener('user_updated', () => {
        fetchCallLogs();
      });
      eventSource.addEventListener('users_updated', () => {
        fetchCallLogs();
      });
      return () => {
        eventSource.close();
      };
    }
  }, [currentUser?.id]);

  const toggleSelectCall = (callId: string) => {
    setSelectedCallIds(prev => 
      prev.includes(callId) ? prev.filter(id => id !== callId) : [...prev, callId]
    );
  };

  const handleSelectAll = () => {
    const visibleIds = filteredLogs.map(l => l.id);
    const allSelected = visibleIds.every(id => selectedCallIds.includes(id));
    if (allSelected) {
      setSelectedCallIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedCallIds(Array.from(new Set([...selectedCallIds, ...visibleIds])));
    }
  };

  const handleDeleteSelected = async () => {
    if (!currentUser || selectedCallIds.length === 0) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/calls/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, callIds: selectedCallIds }),
      });
      if (res.ok) {
        setCallLogs(prev => prev.filter(c => !selectedCallIds.includes(c.id)));
        setSelectedCallIds([]);
        setIsSelectionMode(false);
        setShowConfirmModal(null);
      }
    } catch (err) {
      console.error('Failed to delete selected calls:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!currentUser) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/calls/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (res.ok) {
        setCallLogs([]);
        setSelectedCallIds([]);
        setIsSelectionMode(false);
        setShowConfirmModal(null);
      }
    } catch (err) {
      console.error('Failed to clear all call history:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExecuteDeleteContacts = async () => {
    if (!showContactConfirmModal) return;
    setIsDeleting(true);
    try {
      if (showContactConfirmModal.type === 'single' && showContactConfirmModal.target) {
        const res = await fetch(`/api/contacts/${showContactConfirmModal.target.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setLocalUsers(prev => prev.filter(u => u.id !== showContactConfirmModal.target!.id));
          onRefreshUsers?.();
        }
      } else if (showContactConfirmModal.type === 'selected') {
        const res = await fetch('/api/contacts/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactIds: selectedContactIds,
            currentUserId: currentUser?.id,
          }),
        });
        if (res.ok) {
          setLocalUsers(prev => prev.filter(u => !selectedContactIds.includes(u.id)));
          setSelectedContactIds([]);
          setIsContactSelectionMode(false);
          onRefreshUsers?.();
        }
      } else if (showContactConfirmModal.type === 'all') {
        const res = await fetch('/api/contacts/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deleteAll: true,
            currentUserId: currentUser?.id,
          }),
        });
        if (res.ok) {
          setLocalUsers([]);
          setSelectedContactIds([]);
          setIsContactSelectionMode(false);
          onRefreshUsers?.();
        }
      }
    } catch (err) {
      console.error('Failed to delete contact(s):', err);
    } finally {
      setIsDeleting(false);
      setShowContactConfirmModal(null);
    }
  };

  const filteredLogs = callLogs.filter((log) => {
    if (activeTab === 'missed') {
      if (log.status !== 'missed' && log.status !== 'declined' && log.status !== 'cancelled') return false;
    }
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const otherName = log.callerId === currentUser?.id ? log.calleeName : log.callerName;
    return otherName.toLowerCase().includes(query);
  });

  const maskedUsers = useMemo(() => {
    return localUsers
      .filter(u => u.id !== currentUser?.id)
      .map(u => getMaskedContact(u, currentUser?.id || ''));
  }, [localUsers, currentUser?.id]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return maskedUsers;
    const q = searchQuery.toLowerCase().trim();
    return maskedUsers.filter(u => 
      u.name.toLowerCase().includes(q) || 
      (u.username && u.username.toLowerCase().includes(q))
    );
  }, [maskedUsers, searchQuery]);

  const isAllContactsSelected = filteredUsers.length > 0 && selectedContactIds.length === filteredUsers.length;

  const isAllVisibleSelected = filteredLogs.length > 0 && filteredLogs.every(l => selectedCallIds.includes(l.id));

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0 dtk';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins} mnt ${secs} dtk`;
    return `${secs} dtk`;
  };

  const formatLogDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    if (isToday) {
      return `Hari ini, ${hours}:${minutes}`;
    }
    return `${d.getDate()}/${d.getMonth() + 1}, ${hours}:${minutes}`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#17212b] text-white select-none">
      {/* Top App Bar with identical style to ChatList */}
      <div className="p-3.5 border-b border-[#101921] flex items-center gap-2.5 bg-[#17212b] shrink-0">
        <button
          id="header-hamburger-calls-btn"
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
            id="search-calls-input"
            type="text"
            placeholder="Cari riwayat panggilan atau kontak..."
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

        {/* Header Action Buttons for Deleting/Selecting Calls or Contacts */}
        {callLogs.length > 0 && activeTab !== 'contacts' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedCallIds([]);
              }}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border ${
                isSelectionMode 
                  ? 'bg-[#5288c1] text-white border-[#5288c1] shadow-md shadow-[#5288c1]/20' 
                  : 'text-slate-300 hover:text-white bg-[#242f3d] border-[#313d4f] hover:border-[#5288c1]'
              }`}
              title={isSelectionMode ? 'Selesai Memilih' : 'Pilih / Centang Panggilan'}
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowConfirmModal({ type: 'all', count: callLogs.length })}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 bg-[#242f3d] border border-[#313d4f] hover:bg-rose-950/30 hover:border-rose-900/50 transition-colors cursor-pointer"
              title="Hapus Semua Riwayat Panggilan"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header Action Buttons for Contacts */}
        {activeTab === 'contacts' && filteredUsers.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setIsContactSelectionMode(!isContactSelectionMode);
                if (isContactSelectionMode) setSelectedContactIds([]);
              }}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border ${
                isContactSelectionMode 
                  ? 'bg-[#5288c1] text-white border-[#5288c1] shadow-md shadow-[#5288c1]/20' 
                  : 'text-slate-300 hover:text-white bg-[#242f3d] border-[#313d4f] hover:border-[#5288c1]'
              }`}
              title={isContactSelectionMode ? 'Selesai Memilih' : 'Pilih / Centang Kontak'}
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowContactConfirmModal({ type: 'all', count: filteredUsers.length })}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 bg-[#242f3d] border border-[#313d4f] hover:bg-rose-950/30 hover:border-rose-900/50 transition-colors cursor-pointer"
              title="Hapus Semua Kontak"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex border-b border-[#242f3d] bg-[#17212b] text-xs font-semibold shrink-0">
        <button
          id="tab-calls-all"
          onClick={() => {
            setActiveTab('all');
            setSelectedCallIds([]);
            setIsContactSelectionMode(false);
          }}
          className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer ${
            activeTab === 'all'
              ? 'border-[#5288c1] text-[#5288c1]'
              : 'border-transparent text-[#7f91a4] hover:text-slate-300'
          }`}
        >
          Semua ({callLogs.length})
        </button>
        <button
          id="tab-calls-missed"
          onClick={() => {
            setActiveTab('missed');
            setSelectedCallIds([]);
            setIsContactSelectionMode(false);
          }}
          className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer ${
            activeTab === 'missed'
              ? 'border-[#5288c1] text-[#5288c1]'
              : 'border-transparent text-[#7f91a4] hover:text-slate-300'
          }`}
        >
          Tak Terjawab
        </button>
        <button
          id="tab-calls-contacts"
          onClick={() => {
            setActiveTab('contacts');
            setIsSelectionMode(false);
            setSelectedCallIds([]);
          }}
          className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'contacts'
              ? 'border-[#5288c1] text-[#5288c1]'
              : 'border-transparent text-[#7f91a4] hover:text-slate-300'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Panggil Baru</span>
        </button>
      </div>

      {/* Selection Action Bar for Calls */}
      {isSelectionMode && activeTab !== 'contacts' && (
        <div className="bg-[#1e2a38] px-4 py-2.5 border-b border-[#2d3d4f] flex items-center justify-between text-xs animate-in fade-in duration-150 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 text-[#5288c1] hover:text-white font-medium cursor-pointer"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                isAllVisibleSelected ? 'bg-[#5288c1] border-[#5288c1] text-white' : 'border-[#45586d] bg-[#17212b]'
              }`}>
                {isAllVisibleSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span>{isAllVisibleSelected ? 'Batal Semua' : 'Pilih Semua'}</span>
            </button>
            <span className="text-[#7f91a4]">|</span>
            <span className="text-white font-semibold">{selectedCallIds.length} dipilih</span>
          </div>

          <button
            disabled={selectedCallIds.length === 0}
            onClick={() => setShowConfirmModal({ type: 'selected', count: selectedCallIds.length })}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus ({selectedCallIds.length})</span>
          </button>
        </div>
      )}

      {/* Selection Action Bar for Contacts */}
      {isContactSelectionMode && activeTab === 'contacts' && (
        <div className="bg-[#1e2a38] px-4 py-2.5 border-b border-[#2d3d4f] flex items-center justify-between text-xs animate-in fade-in duration-150 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (isAllContactsSelected) {
                  setSelectedContactIds([]);
                } else {
                  setSelectedContactIds(filteredUsers.map(u => u.id));
                }
              }}
              className="flex items-center gap-1.5 text-[#5288c1] hover:text-white font-medium cursor-pointer"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                isAllContactsSelected ? 'bg-[#5288c1] border-[#5288c1] text-white' : 'border-[#45586d] bg-[#17212b]'
              }`}>
                {isAllContactsSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span>{isAllContactsSelected ? 'Batal Semua' : 'Pilih Semua'}</span>
            </button>
            <span className="text-[#7f91a4]">|</span>
            <span className="text-white font-semibold">{selectedContactIds.length} dipilih</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={selectedContactIds.length === 0}
              onClick={() => setShowContactConfirmModal({ type: 'selected', count: selectedContactIds.length })}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus ({selectedContactIds.length})</span>
            </button>
            <button
              disabled={filteredUsers.length === 0}
              onClick={() => setShowContactConfirmModal({ type: 'all', count: filteredUsers.length })}
              className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 rounded-lg disabled:opacity-40 transition-colors font-medium flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Semua</span>
            </button>
          </div>
        </div>
      )}

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {activeTab === 'contacts' ? (
          /* Panggil Baru / Contacts Picker */
          <div className="space-y-1">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#7f91a4] flex items-center justify-between">
              <span>Pilih Kontak untuk Dipanggil</span>
              <span>{filteredUsers.length} Kontak</span>
            </div>
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-[#7f91a4] text-xs">
                Tidak ada kontak ditemukan
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = selectedContactIds.includes(u.id);

                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      if (isContactSelectionMode) {
                        setSelectedContactIds(prev => 
                          prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                        );
                      }
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                      isContactSelectionMode ? 'cursor-pointer' : ''
                    } ${
                      isSelected 
                        ? 'bg-[#5288c1]/15 border border-[#5288c1]/40' 
                        : 'hover:bg-[#202b36] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      {isContactSelectionMode && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContactIds(prev => 
                              prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                            );
                          }}
                          className="cursor-pointer shrink-0"
                        >
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-md bg-[#5288c1] border border-[#5288c1] flex items-center justify-center text-white shadow-sm">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md border border-[#3f4f63] bg-[#242f3d] hover:border-[#5288c1] transition-colors" />
                          )}
                        </div>
                      )}

                      <UserAvatar
                        name={u.name}
                        username={u.username}
                        avatar={u.avatar}
                        color={u.color || '#5288c1'}
                        size="md"
                        isOnline={u.isOnline}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                          <span className="truncate">{u.name}</span>
                          <VerifiedBadge isVerified={u.isVerified !== undefined ? u.isVerified : true} badgeColor={u.badgeColor || 'blue'} size="sm" />
                        </div>
                        <div className="text-xs text-[#7f91a4] truncate mt-0.5">
                          {u.username ? (
                            <span className="text-[#5288c1]">@{u.username}</span>
                          ) : (
                            <span className="text-[#64748b] italic">Username disembunyikan</span>
                          )}
                          {u.isOnline ? ' • Online' : ''}
                        </div>
                      </div>
                    </div>

                    {!isContactSelectionMode && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartCall(u, 'audio');
                          }}
                          className="p-2 rounded-full text-[#5288c1] hover:bg-[#5288c1]/20 transition-colors cursor-pointer"
                          title="Panggilan Suara"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartCall(u, 'video');
                          }}
                          className="p-2 rounded-full text-[#5288c1] hover:bg-[#5288c1]/20 transition-colors cursor-pointer"
                          title="Panggilan Video"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowContactConfirmModal({ type: 'single', target: u });
                          }}
                          className="p-2 rounded-full text-[#7f91a4] hover:text-red-400 hover:bg-red-500/15 transition-all cursor-pointer"
                          title={`Hapus Kontak ${u.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Call Logs List */
          <>
            {filteredLogs.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#7f91a4]">
                <div className="w-14 h-14 rounded-full bg-[#202b36] border border-[#2d3d4f] flex items-center justify-center text-[#5288c1] mb-3 shadow-inner">
                  <Phone className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-300">Belum ada riwayat panggilan</p>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className="mt-3 px-4 py-2 bg-[#5288c1] hover:bg-[#4374a8] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow"
                >
                  Mulai Panggilan Baru Sekarang
                </button>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isOutgoing = log.callerId === currentUser.id;
                const targetUserId = isOutgoing ? log.calleeId : log.callerId;
                const targetName = isOutgoing ? log.calleeName : log.callerName;
                const targetUsername = isOutgoing ? log.calleeUsername : log.callerUsername;
                
                const allCombinedUsers = [currentUser, ...users].filter(Boolean);
                const matchedUser = allCombinedUsers.find(u => 
                  (targetUserId && u.id === targetUserId) || 
                  (targetUsername && u.username && u.username.toLowerCase() === targetUsername.toLowerCase().replace('@', '')) ||
                  (targetName && u.name && u.name.toLowerCase() === targetName.toLowerCase())
                );
                
                const otherUser: User = {
                  id: targetUserId,
                  name: matchedUser?.name || targetName,
                  username: matchedUser?.username || targetUsername,
                  avatar: matchedUser !== undefined ? (matchedUser.avatar || '') : (isOutgoing ? (log.calleeAvatar || '') : (log.callerAvatar || '')),
                  color: matchedUser?.color || (isOutgoing ? log.calleeColor : log.callerColor) || '#5288c1',
                  isVerified: matchedUser?.isVerified !== undefined ? matchedUser.isVerified : true,
                  badgeColor: matchedUser?.badgeColor || 'blue',
                  phone: '',
                };

                const isMissed = log.status === 'missed' || log.status === 'declined' || log.status === 'cancelled';
                const isSelected = selectedCallIds.includes(log.id);

                return (
                  <div
                    key={log.id}
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleSelectCall(log.id);
                      }
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                      isSelected ? 'bg-[#5288c1]/20 border border-[#5288c1]/40' : 'hover:bg-[#202b36] border border-transparent'
                    } ${isSelectionMode ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {isSelectionMode && (
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-[#5288c1] border-[#5288c1] text-white' : 'border-[#45586d] bg-[#17212b]'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      )}

                      <UserAvatar
                        name={otherUser.name}
                        username={otherUser.username}
                        avatar={otherUser.avatar}
                        color={otherUser.color}
                        size="md"
                      />

                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-semibold truncate flex items-center gap-1.5 ${isMissed && !isOutgoing ? 'text-rose-400' : 'text-white'}`}>
                          <span className="truncate">{otherUser.name}</span>
                          <VerifiedBadge isVerified={otherUser.isVerified} badgeColor={otherUser.badgeColor} size="sm" />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[#7f91a4] mt-0.5">
                          {isOutgoing ? (
                            <PhoneOutgoing className="w-3.5 h-3.5 text-[#5288c1] shrink-0" />
                          ) : isMissed ? (
                            <PhoneMissed className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ) : (
                            <PhoneIncoming className="w-3.5 h-3.5 text-[#4fae5e] shrink-0" />
                          )}
                          <span className="truncate">
                            {formatLogDate(log.timestamp)}
                            {log.duration ? ` • ${formatDuration(log.duration)}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isSelectionMode && (
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartCall(otherUser, log.callType === 'video' ? 'video' : 'audio');
                          }}
                          className="p-2 rounded-full text-[#5288c1] hover:bg-[#5288c1]/20 hover:scale-110 transition-all cursor-pointer"
                          title={log.callType === 'video' ? 'Panggilan Video' : 'Panggilan Suara'}
                        >
                          {log.callType === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCallIds([log.id]);
                            setShowConfirmModal({ type: 'selected', count: 1 });
                          }}
                          className="p-2 rounded-full text-[#7f91a4] hover:text-red-400 hover:bg-red-500/15 transition-all cursor-pointer"
                          title="Hapus Riwayat Panggilan Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Confirmation Dialog for Call Deletion */}
      {showConfirmModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowConfirmModal(null)}
        >
          <div 
            className="bg-[#17212b] border border-[#242f3d] rounded-2xl p-5 max-w-sm w-full shadow-2xl text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold">
                {showConfirmModal.type === 'all' ? 'Hapus Semua Riwayat?' : `Hapus ${showConfirmModal.count} Panggilan?`}
              </h3>
              <p className="text-xs text-[#7f91a4] mt-1">
                Riwayat panggilan yang dipilih akan dihapus secara permanen.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                disabled={isDeleting}
                onClick={showConfirmModal.type === 'all' ? handleDeleteAll : handleDeleteSelected}
                className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
              <button
                onClick={() => setShowConfirmModal(null)}
                className="w-full py-2.5 bg-[#202b36] hover:bg-[#283644] text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Contact Deletion */}
      {showContactConfirmModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowContactConfirmModal(null)}
        >
          <div 
            className="bg-[#17212b] border border-[#242f3d] rounded-2xl p-5 max-w-sm w-full shadow-2xl text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold">
                {showContactConfirmModal.type === 'all' && 'Hapus Semua Kontak?'}
                {showContactConfirmModal.type === 'selected' && `Hapus ${showContactConfirmModal.count} Kontak Terpilih?`}
                {showContactConfirmModal.type === 'single' && `Hapus Kontak ${showContactConfirmModal.target?.name}?`}
              </h3>
              <p className="text-xs text-[#7f91a4] mt-1">
                {showContactConfirmModal.type === 'all' && `Tindakan ini akan menghapus seluruh kontak Anda (${showContactConfirmModal.count} kontak) dari daftar Anda.`}
                {showContactConfirmModal.type === 'selected' && `${showContactConfirmModal.count} kontak yang dipilih akan dihapus dari daftar Anda.`}
                {showContactConfirmModal.type === 'single' && `Kontak ${showContactConfirmModal.target?.name} akan dihapus dari daftar Anda.`}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                disabled={isDeleting}
                onClick={handleExecuteDeleteContacts}
                className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-semibold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : (
                  showContactConfirmModal.type === 'all' ? 'Ya, Hapus Semua Kontak' : 'Ya, Hapus Kontak'
                )}
              </button>
              <button
                disabled={isDeleting}
                onClick={() => setShowContactConfirmModal(null)}
                className="w-full py-2.5 bg-[#202b36] hover:bg-[#283644] text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
