import React, { useState, useEffect } from 'react';
import { 
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, X, 
  Trash2, UserPlus, Search, CheckCheck, Clock, CheckSquare, 
  Check, AlertTriangle
} from 'lucide-react';
import { User, CallLog } from '../types';
import { UserAvatar } from './UserAvatar';
import { VerifiedBadge } from './VerifiedBadge';
import { formatMessageTime } from '../utils/time';
import { getMaskedContact } from '../utils/privacy';

interface CallsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User;
  users: User[];
  onStartCall: (user: User, callType?: 'audio' | 'video') => void;
  onRefreshUsers?: () => void;
}

export const CallsModal: React.FC<CallsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  onStartCall,
  onRefreshUsers,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'missed' | 'contacts'>('all');
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCallIds, setSelectedCallIds] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState<{ type: 'all' | 'selected'; count: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localUsers, setLocalUsers] = useState<User[]>(users);

  // Contact selection & batch delete states
  const [isContactSelectionMode, setIsContactSelectionMode] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [showContactConfirmModal, setShowContactConfirmModal] = useState<{
    type: 'single' | 'selected' | 'all';
    target?: User;
    count?: number;
  } | null>(null);

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
    if (isOpen && currentUser) {
      fetchCallLogs();
      setIsSelectionMode(false);
      setSelectedCallIds([]);
      setShowConfirmModal(null);

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
  }, [isOpen, currentUser?.id]);

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
        const targetId = showContactConfirmModal.target.id;
        const res = await fetch(`/api/contacts/${targetId}`, { method: 'DELETE' });
        if (res.ok) {
          setLocalUsers(prev => prev.filter(u => u.id !== targetId));
          setShowContactConfirmModal(null);
          onRefreshUsers?.();
        }
      } else if (showContactConfirmModal.type === 'selected') {
        const res = await fetch('/api/contacts/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser?.id,
            contactIds: selectedContactIds,
          }),
        });
        if (res.ok) {
          setLocalUsers(prev => prev.filter(u => !selectedContactIds.includes(u.id)));
          setSelectedContactIds([]);
          setIsContactSelectionMode(false);
          setShowContactConfirmModal(null);
          onRefreshUsers?.();
        }
      } else if (showContactConfirmModal.type === 'all') {
        const res = await fetch('/api/contacts/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser?.id,
            deleteAll: true,
          }),
        });
        if (res.ok) {
          setLocalUsers([]);
          setSelectedContactIds([]);
          setIsContactSelectionMode(false);
          setShowContactConfirmModal(null);
          onRefreshUsers?.();
        }
      }
    } catch (err) {
      console.error('Failed to delete contact(s):', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const filteredLogs = callLogs.filter((log) => {
    if (activeTab === 'missed') {
      if (log.status !== 'missed' && log.status !== 'declined' && log.status !== 'cancelled') return false;
    }
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const otherName = log.callerId === currentUser?.id ? log.calleeName : log.callerName;
    return otherName.toLowerCase().includes(query);
  });

  const filteredUsers = localUsers.filter((u) => {
    if (u.id === currentUser?.id) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  const isAllVisibleSelected = filteredLogs.length > 0 && filteredLogs.every(l => selectedCallIds.includes(l.id));
  const isAllContactsSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedContactIds.includes(u.id));

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
    <div id="calls-modal-overlay" className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[#17212b] border border-[#242f3d] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 bg-[#17212b] flex items-center justify-between border-b border-[#242f3d]">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <Phone className="w-5 h-5 text-[#5288c1]" />
            <span>Panggilan Telegram</span>
          </div>
          <div className="flex items-center gap-2">
            {callLogs.length > 0 && activeTab !== 'contacts' && (
              <>
                {/* Tombol Centang / Mode Pilih */}
                <button 
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    if (isSelectionMode) setSelectedCallIds([]);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isSelectionMode 
                      ? 'bg-[#5288c1] text-white border-[#5288c1]' 
                      : 'text-slate-300 hover:text-white bg-[#242f3d] border-[#313d4f] hover:border-[#5288c1]'
                  }`}
                  title={isSelectionMode ? 'Selesai Memilih' : 'Centang / Pilih Panggilan'}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{isSelectionMode ? 'Selesai' : 'Centang'}</span>
                </button>

                {/* Tombol Hapus Semua (Tong Sampah) */}
                <button 
                  onClick={() => setShowConfirmModal({ type: 'all', count: callLogs.length })}
                  className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-rose-950/30 hover:border-rose-900/50 border border-transparent transition-colors cursor-pointer"
                  title="Hapus Semua Riwayat Panggilan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            {filteredUsers.length > 0 && activeTab === 'contacts' && (
              <>
                <button 
                  onClick={() => {
                    setIsContactSelectionMode(!isContactSelectionMode);
                    if (isContactSelectionMode) setSelectedContactIds([]);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isContactSelectionMode 
                      ? 'bg-[#5288c1] text-white border-[#5288c1]' 
                      : 'text-slate-300 hover:text-white bg-[#242f3d] border-[#313d4f] hover:border-[#5288c1]'
                  }`}
                  title={isContactSelectionMode ? 'Selesai Memilih' : 'Centang / Pilih Kontak'}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{isContactSelectionMode ? 'Selesai' : 'Pilih'}</span>
                </button>

                <button 
                  onClick={() => setShowContactConfirmModal({ type: 'all', count: filteredUsers.length })}
                  className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-rose-950/30 hover:border-rose-900/50 border border-transparent transition-colors cursor-pointer"
                  title="Hapus Semua Kontak"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center border-b border-[#242f3d] bg-[#131b24] px-2 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('all');
              setSelectedCallIds([]);
              setIsContactSelectionMode(false);
            }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer ${
              activeTab === 'all'
                ? 'border-[#5288c1] text-[#5288c1]'
                : 'border-transparent text-[#7f91a4] hover:text-white'
            }`}
          >
            Semua ({callLogs.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('missed');
              setSelectedCallIds([]);
              setIsContactSelectionMode(false);
            }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer ${
              activeTab === 'missed'
                ? 'border-[#5288c1] text-[#5288c1]'
                : 'border-transparent text-[#7f91a4] hover:text-white'
            }`}
          >
            Tak Terjawab
          </button>
          <button
            onClick={() => {
              setActiveTab('contacts');
              setIsSelectionMode(false);
              setSelectedCallIds([]);
            }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'contacts'
                ? 'border-[#5288c1] text-[#5288c1]'
                : 'border-transparent text-[#7f91a4] hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Panggil Baru</span>
          </button>
        </div>

        {/* Selection Bar Action Toolbar (When Mode Centang is Active for Calls) */}
        {isSelectionMode && activeTab !== 'contacts' && (
          <div className="bg-[#1b2733] px-3.5 py-2 border-b border-[#313d4f] flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 text-[#5288c1] hover:text-white font-medium cursor-pointer"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  isAllVisibleSelected 
                    ? 'bg-[#5288c1] border-[#5288c1] text-white' 
                    : 'border-[#45586d] bg-[#17212b]'
                }`}>
                  {isAllVisibleSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>{isAllVisibleSelected ? 'Batalkan Semua' : 'Pilih Semua'}</span>
              </button>
              <span className="text-[#7f91a4]">|</span>
              <span className="text-white font-semibold">
                {selectedCallIds.length} dicentang
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={selectedCallIds.length === 0}
                onClick={() => setShowConfirmModal({ type: 'selected', count: selectedCallIds.length })}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  selectedCallIds.length > 0 
                    ? 'bg-rose-600/90 hover:bg-rose-600 text-white shadow-sm' 
                    : 'bg-[#242f3d] text-slate-500 cursor-not-allowed opacity-50'
                }`}
                title="Hapus panggilan yang dicentang"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus ({selectedCallIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Selection Bar Action Toolbar for Contacts */}
        {isContactSelectionMode && activeTab === 'contacts' && (
          <div className="bg-[#1b2733] px-3.5 py-2 border-b border-[#313d4f] flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-150">
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
                  isAllContactsSelected 
                    ? 'bg-[#5288c1] border-[#5288c1] text-white' 
                    : 'border-[#45586d] bg-[#17212b]'
                }`}>
                  {isAllContactsSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>{isAllContactsSelected ? 'Batalkan Semua' : 'Pilih Semua'}</span>
              </button>
              <span className="text-[#7f91a4]">|</span>
              <span className="text-white font-semibold">
                {selectedContactIds.length} dicentang
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={selectedContactIds.length === 0}
                onClick={() => setShowContactConfirmModal({ type: 'selected', count: selectedContactIds.length })}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  selectedContactIds.length > 0 
                    ? 'bg-rose-600/90 hover:bg-rose-600 text-white shadow-sm' 
                    : 'bg-[#242f3d] text-slate-500 cursor-not-allowed opacity-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus ({selectedContactIds.length})</span>
              </button>
              <button
                disabled={filteredUsers.length === 0}
                onClick={() => setShowContactConfirmModal({ type: 'all', count: filteredUsers.length })}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold bg-rose-700/80 hover:bg-rose-700 text-white text-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Semua</span>
              </button>
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="p-3 border-b border-[#242f3d]/60 bg-[#17212b]">
          <div className="flex items-center gap-2 bg-[#242f3d] px-3 py-1.5 rounded-xl border border-[#313d4f]">
            <Search className="w-3.5 h-3.5 text-[#7f91a4]" />
            <input
              type="text"
              placeholder={activeTab === 'contacts' ? 'Cari kontak untuk ditelepon...' : 'Cari riwayat panggilan...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-[#7f91a4] outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[#7f91a4] hover:text-white">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {activeTab === 'contacts' ? (
            /* Contact list for new call */
            filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#7f91a4]">
                Tidak ada pengguna ditemukan.
              </div>
            ) : (
              filteredUsers.map((rawUser) => {
                const user = currentUser ? getMaskedContact(rawUser, currentUser) : rawUser;
                const isSelected = selectedContactIds.includes(user.id);

                return (
                  <div 
                    key={user.id} 
                    onClick={() => {
                      if (isContactSelectionMode) {
                        setSelectedContactIds(prev => 
                          prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                        );
                      }
                    }}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors ${
                      isContactSelectionMode ? 'cursor-pointer' : ''
                    } ${
                      isSelected 
                        ? 'bg-[#5288c1]/15 border border-[#5288c1]/40' 
                        : 'hover:bg-[#242f3d] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2 flex-1">
                      {isContactSelectionMode && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContactIds(prev => 
                              prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
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
                        name={user.name}
                        username={user.username}
                        avatar={user.avatar}
                        color={user.color || '#5288c1'}
                        size="md"
                        isOnline={user.isOnline}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                          <span className="truncate">{user.name}</span>
                          <VerifiedBadge isVerified={user.isVerified !== undefined ? user.isVerified : true} badgeColor={user.badgeColor || 'blue'} size="sm" />
                        </div>
                        <div className="text-xs text-[#7f91a4] truncate mt-0.5">
                          {user.username ? (
                            <span className="text-[#5288c1]">@{user.username}</span>
                          ) : (
                            <span className="text-[#64748b] italic">Username disembunyikan</span>
                          )}
                          {user.isOnline ? ' • Online' : ''}
                        </div>
                      </div>
                    </div>

                    {!isContactSelectionMode && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartCall(user, 'audio');
                            onClose();
                          }}
                          className="w-8 h-8 rounded-full bg-[#242f3d] hover:bg-[#5288c1] text-[#5288c1] hover:text-white flex items-center justify-center transition-all cursor-pointer border border-[#313d4f] shadow-sm"
                          title="Panggilan Suara Real-Time"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartCall(user, 'video');
                            onClose();
                          }}
                          className="w-8 h-8 rounded-full bg-[#242f3d] hover:bg-[#5288c1] text-[#5288c1] hover:text-white flex items-center justify-center transition-all cursor-pointer border border-[#313d4f] shadow-sm"
                          title="Panggilan Video"
                        >
                          <Video className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowContactConfirmModal({ type: 'single', target: user });
                          }}
                          className="w-8 h-8 rounded-full bg-[#242f3d] hover:bg-rose-500/20 text-[#7f91a4] hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer border border-[#313d4f] shadow-sm"
                          title={`Hapus Kontak ${user.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : (
            /* Call Logs List */
            filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#7f91a4] flex flex-col items-center gap-2">
                <Phone className="w-8 h-8 text-[#5288c1]/40" />
                <span>
                  {activeTab === 'missed' 
                    ? 'Tidak ada panggilan tak terjawab.' 
                    : 'Belum ada riwayat panggilan.'}
                </span>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className="mt-2 text-[#5288c1] hover:underline text-xs font-semibold"
                >
                  Mulai panggilan baru sekarang →
                </button>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isOutgoing = log.callerId === currentUser?.id;
                const otherUserId = isOutgoing ? log.calleeId : log.callerId;
                const otherName = isOutgoing ? log.calleeName : log.callerName;
                const otherAvatar = isOutgoing ? log.calleeAvatar : log.callerAvatar;
                const otherColor = (isOutgoing ? log.calleeColor : log.callerColor) || '#5288c1';
                const isMissed = log.status === 'missed' || log.status === 'declined' || log.status === 'cancelled';
                const isSelected = selectedCallIds.includes(log.id);
                
                const allCombinedUsers = currentUser ? [currentUser, ...users] : users;
                const matchedUser = allCombinedUsers.find((u) => 
                  u.id === otherUserId || 
                  (u.username && u.username.toLowerCase() === (isOutgoing ? log.calleeUsername : log.callerUsername)?.toLowerCase().replace('@', '')) ||
                  (u.name && u.name.toLowerCase() === otherName?.toLowerCase())
                );
                const targetUserObj: User = {
                  id: otherUserId,
                  name: matchedUser?.name || otherName,
                  username: matchedUser?.username || (isOutgoing ? log.calleeUsername : log.callerUsername) || otherName.toLowerCase().replace(/\s+/g, ''),
                  avatar: matchedUser !== undefined ? (matchedUser.avatar || '') : (isOutgoing ? (log.calleeAvatar || '') : (log.callerAvatar || '')),
                  color: matchedUser?.color || (isOutgoing ? log.calleeColor : log.callerColor) || '#5288c1',
                  isVerified: matchedUser?.isVerified !== undefined ? matchedUser.isVerified : true,
                  badgeColor: matchedUser?.badgeColor || 'blue',
                  phone: '',
                };

                return (
                  <div 
                    key={log.id} 
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleSelectCall(log.id);
                      }
                    }}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-xl transition-all group ${
                      isSelectionMode ? 'cursor-pointer select-none' : ''
                    } ${
                      isSelected 
                        ? 'bg-[#5288c1]/20 border border-[#5288c1]/50' 
                        : 'hover:bg-[#242f3d] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2 flex-1">
                      {/* Checkbox when in Selection Mode */}
                      {isSelectionMode && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectCall(log.id);
                          }}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                            isSelected 
                              ? 'bg-[#5288c1] border-[#5288c1] text-white' 
                              : 'border-[#415366] bg-[#17212b] hover:border-[#5288c1]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      )}

                      <UserAvatar
                        name={targetUserObj.name}
                        username={targetUserObj.username}
                        avatar={targetUserObj.avatar}
                        color={targetUserObj.color}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                          <span className="truncate">{targetUserObj.name}</span>
                          <VerifiedBadge isVerified={targetUserObj.isVerified} badgeColor={targetUserObj.badgeColor} size="sm" />
                        </div>
                        <div className="text-xs text-[#7f91a4] flex items-center gap-1.5 mt-0.5">
                          {isMissed ? (
                            <PhoneMissed className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          ) : isOutgoing ? (
                            <PhoneOutgoing className="w-3.5 h-3.5 text-[#5288c1] shrink-0" />
                          ) : (
                            <PhoneIncoming className="w-3.5 h-3.5 text-[#4fae4e] shrink-0" />
                          )}
                          <span className={isMissed ? 'text-red-400 font-medium' : ''}>
                            {formatLogDate(log.timestamp)}
                          </span>
                          {log.duration > 0 && (
                            <>
                              <span>•</span>
                              <span>{formatDuration(log.duration)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isSelectionMode ? (
                        <>
                          <button
                            onClick={() => {
                              onStartCall(targetUserObj, log.callType === 'video' || log.type === 'video' ? 'video' : 'audio');
                              onClose();
                            }}
                            className="w-8 h-8 rounded-full bg-[#242f3d] hover:bg-[#5288c1] text-[#5288c1] hover:text-white flex items-center justify-center transition-all cursor-pointer border border-[#313d4f] shadow-sm"
                            title="Panggil Kembali"
                          >
                            {log.callType === 'video' || log.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCallIds([log.id]);
                              setShowConfirmModal({ type: 'selected', count: 1 });
                            }}
                            className="w-8 h-8 rounded-full text-[#7f91a4] hover:text-red-400 hover:bg-red-500/15 flex items-center justify-center transition-all cursor-pointer"
                            title="Hapus Panggilan Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-[#7f91a4]">
                          {isSelected ? 'Dicentang' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Confirmation Modal for Delete Selected or All */}
        {showConfirmModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-[#242f3d] border border-[#313d4f] rounded-2xl p-5 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">
                  {showConfirmModal.type === 'all' 
                    ? 'Hapus Semua Riwayat Panggilan?' 
                    : `Hapus ${showConfirmModal.count} Panggilan Terpilih?`}
                </h3>
                <p className="text-xs text-[#7f91a4] leading-relaxed">
                  {showConfirmModal.type === 'all'
                    ? 'Seluruh riwayat panggilan Anda akan dihapus secara permanen dari server Telegram.'
                    : `Sebanyak ${showConfirmModal.count} riwayat panggilan yang dicentang akan dihapus secara permanen.`}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowConfirmModal(null)}
                  className="flex-1 py-2 rounded-xl bg-[#17212b] hover:bg-[#1a2530] text-slate-300 hover:text-white text-xs font-semibold border border-[#313d4f] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    if (showConfirmModal.type === 'all') {
                      handleDeleteAll();
                    } else {
                      handleDeleteSelected();
                    }
                  }}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/50"
                >
                  {isDeleting ? (
                    <span>Menghapus...</span>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{showConfirmModal.type === 'all' ? 'Hapus Semua' : 'Hapus'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Contact Deletion */}
        {showContactConfirmModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-[#242f3d] border border-[#313d4f] rounded-2xl p-5 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">
                  {showContactConfirmModal.type === 'all' && 'Hapus Semua Kontak?'}
                  {showContactConfirmModal.type === 'selected' && `Hapus ${showContactConfirmModal.count} Kontak Terpilih?`}
                  {showContactConfirmModal.type === 'single' && `Hapus Kontak ${showContactConfirmModal.target?.name}?`}
                </h3>
                <p className="text-xs text-[#7f91a4] leading-relaxed">
                  {showContactConfirmModal.type === 'all' && `Tindakan ini akan menghapus seluruh kontak Anda (${showContactConfirmModal.count} kontak) dari daftar Anda.`}
                  {showContactConfirmModal.type === 'selected' && `${showContactConfirmModal.count} kontak yang dipilih akan dihapus dari daftar Anda.`}
                  {showContactConfirmModal.type === 'single' && `Kontak @${showContactConfirmModal.target?.username || showContactConfirmModal.target?.name} akan dihapus dari daftar kontak dan panggilan Anda.`}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowContactConfirmModal(null)}
                  className="flex-1 py-2 rounded-xl bg-[#17212b] hover:bg-[#1a2530] text-slate-300 hover:text-white text-xs font-semibold border border-[#313d4f] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleExecuteDeleteContacts}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/50"
                >
                  {isDeleting ? (
                    <span>Menghapus...</span>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{showContactConfirmModal.type === 'all' ? 'Hapus Semua' : 'Hapus Kontak'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

