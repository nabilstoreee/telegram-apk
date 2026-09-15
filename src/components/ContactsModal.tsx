import React, { useState, useMemo } from 'react';
import { 
  X, Search, Trash2, CheckSquare, Square, UserPlus, Phone, Video, 
  MessageSquare, AlertTriangle, Check, User as UserIcon, QrCode
} from 'lucide-react';
import { User } from '../types';
import { UserAvatar } from './UserAvatar';
import { VerifiedBadge } from './VerifiedBadge';
import { getMaskedContact } from '../utils/privacy';

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User;
  onSelectUser: (user: User) => void;
  onRefreshUsers: () => void;
  onStartCall?: (user: User, type: 'audio' | 'video') => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onSelectUser,
  onRefreshUsers,
  onStartCall,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    type: 'single' | 'selected' | 'all';
    target?: User;
    count?: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactUsername, setNewContactUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter out current user
  const contactList = useMemo(() => {
    return users.filter(u => u.id !== currentUser.id);
  }, [users, currentUser.id]);

  // Apply privacy masking to contacts relative to currentUser
  const maskedContacts = useMemo(() => {
    return contactList.map(u => getMaskedContact(u, currentUser.id));
  }, [contactList, currentUser.id]);

  // Search filter
  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return maskedContacts;
    return maskedContacts.filter(u => 
      u.name?.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q))
    );
  }, [maskedContacts, searchQuery]);

  if (!isOpen) return null;

  const toggleSelectContact = (id: string) => {
    setSelectedContactIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedContactIds.length === filteredContacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(filteredContacts.map(u => u.id));
    }
  };

  const executeDelete = async () => {
    if (!showConfirmModal) return;
    setIsDeleting(true);

    try {
      if (showConfirmModal.type === 'single' && showConfirmModal.target) {
        const res = await fetch(`/api/contacts/${showConfirmModal.target.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          showToast(`Kontak ${showConfirmModal.target.name} berhasil dihapus.`);
        } else {
          showToast('Gagal menghapus kontak.');
        }
      } else if (showConfirmModal.type === 'selected') {
        const res = await fetch('/api/contacts/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactIds: selectedContactIds,
            currentUserId: currentUser.id,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast(`${data.count || selectedContactIds.length} kontak berhasil dihapus.`);
        } else {
          showToast('Gagal menghapus kontak terpilih.');
        }
      } else if (showConfirmModal.type === 'all') {
        const res = await fetch('/api/contacts/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deleteAll: true,
            currentUserId: currentUser.id,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast(`Semua kontak (${data.count || contactList.length}) berhasil dihapus.`);
        } else {
          showToast('Gagal menghapus semua kontak.');
        }
      }

      // Reset selection and refresh contacts
      setSelectedContactIds([]);
      setIsSelectionMode(false);
      setShowConfirmModal(null);
      onRefreshUsers();
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat menghapus kontak.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContactName.trim(),
          phone: newContactPhone.trim() || undefined,
          username: newContactUsername.trim().replace(/^@/, '') || undefined,
        }),
      });
      if (res.ok) {
        showToast(`Kontak ${newContactName} berhasil ditambahkan.`);
        setNewContactName('');
        setNewContactPhone('');
        setNewContactUsername('');
        setShowAddContact(false);
        onRefreshUsers();
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal menambahkan kontak.');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan saat menambahkan kontak.');
    } finally {
      setIsAdding(false);
    }
  };

  const allSelected = filteredContacts.length > 0 && selectedContactIds.length === filteredContacts.length;

  return (
    <div 
      id="contacts-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="contacts-modal-container"
        className="bg-[#17212b] border border-[#242f3d] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-white relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Notification */}
        {toastMessage && (
          <div 
            id="contacts-toast"
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#242f3d] text-white border border-[#313d4f] px-4 py-2 rounded-xl text-xs font-medium shadow-2xl animate-in slide-in-from-top-2 duration-150 flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-[#4fae4e]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        {isSelectionMode ? (
          /* Selection Header */
          <div className="p-4 border-b border-[#242f3d] bg-[#1e2936] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                id="btn-cancel-contact-selection"
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedContactIds([]);
                }}
                className="p-1.5 rounded-lg text-[#7f91a4] hover:text-white hover:bg-[#283644] transition-colors cursor-pointer"
                title="Batal Memilih"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base font-bold text-white">
                  {selectedContactIds.length} Dipilih
                </h2>
                <p className="text-xs text-[#7f91a4]">
                  Pilih kontak untuk dihapus
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-select-all-contacts"
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#242f3d] hover:bg-[#2f3d4e] text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                title={allSelected ? 'Batal Pilih Semua' : 'Pilih Semua Kontak'}
              >
                {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-[#5288c1]" /> : <Square className="w-3.5 h-3.5" />}
                <span>{allSelected ? 'Batal Semua' : 'Pilih Semua'}</span>
              </button>

              <button
                id="btn-delete-selected-contacts"
                disabled={selectedContactIds.length === 0}
                onClick={() => setShowConfirmModal({ type: 'selected', count: selectedContactIds.length })}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Hapus Kontak Terpilih"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus ({selectedContactIds.length})</span>
              </button>

              <button
                id="btn-delete-all-contacts"
                disabled={contactList.length === 0}
                onClick={() => setShowConfirmModal({ type: 'all', count: contactList.length })}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1"
                title="Hapus Semua Kontak Sekaligus"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Header */
          <div className="p-4 border-b border-[#242f3d] bg-[#17212b] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                id="btn-close-contacts-modal"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#7f91a4] hover:text-white hover:bg-[#242f3d] transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base font-bold text-white">Kontak</h2>
                <p className="text-xs text-[#7f91a4]">
                  {contactList.length} Kontak Tersimpan
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="btn-add-new-contact"
                onClick={() => setShowAddContact(!showAddContact)}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border ${
                  showAddContact 
                    ? 'bg-[#5288c1] text-white border-[#5288c1]' 
                    : 'text-slate-300 hover:text-white bg-[#242f3d] border-[#313d4f] hover:border-[#5288c1]'
                }`}
                title="Tambah Kontak Baru"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Tambah</span>
              </button>

              <button
                id="btn-toggle-contact-selection-mode"
                onClick={() => {
                  setIsSelectionMode(true);
                  setSelectedContactIds([]);
                }}
                disabled={contactList.length === 0}
                className="p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer text-slate-300 hover:text-white bg-[#242f3d] border border-[#313d4f] hover:border-[#5288c1] disabled:opacity-40"
                title="Pilih / Centang Kontak untuk Dihapus"
              >
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Pilih</span>
              </button>

              <button
                id="btn-delete-all-contacts-quick"
                onClick={() => setShowConfirmModal({ type: 'all', count: contactList.length })}
                disabled={contactList.length === 0}
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 bg-[#242f3d] border border-[#313d4f] hover:bg-red-950/30 hover:border-red-900/50 transition-colors cursor-pointer disabled:opacity-40"
                title="Hapus Semua Kontak"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Add Contact Form (Toggleable) */}
        {showAddContact && (
          <form 
            onSubmit={handleCreateContact}
            className="p-4 border-b border-[#242f3d] bg-[#1a2430] space-y-3 shrink-0 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5288c1] uppercase tracking-wider">
                Tambah Kontak Baru
              </span>
              <button 
                type="button" 
                onClick={() => setShowAddContact(false)}
                className="text-xs text-[#7f91a4] hover:text-white cursor-pointer"
              >
                Batal
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Nama lengkap *"
                required
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="bg-[#242f3d] border border-[#313d4f] focus:border-[#5288c1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-[#7f91a4]"
              />
              <input
                type="text"
                placeholder="Nomor telepon (opsional)"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                className="bg-[#242f3d] border border-[#313d4f] focus:border-[#5288c1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-[#7f91a4]"
              />
              <input
                type="text"
                placeholder="Username (opsional)"
                value={newContactUsername}
                onChange={(e) => setNewContactUsername(e.target.value)}
                className="bg-[#242f3d] border border-[#313d4f] focus:border-[#5288c1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-[#7f91a4]"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isAdding || !newContactName.trim()}
                className="px-4 py-2 bg-[#5288c1] hover:bg-[#4374a8] text-white font-semibold text-xs rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isAdding ? 'Menyimpan...' : 'Simpan Kontak'}
              </button>
            </div>
          </form>
        )}

        {/* Search Bar */}
        <div className="p-3 border-b border-[#242f3d] bg-[#17212b] shrink-0">
          <div className="relative">
            <input
              id="search-contacts-modal-input"
              type="text"
              placeholder="Cari nama, username, atau telepon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#242f3d] border border-[#242f3d] focus:border-[#5288c1] rounded-xl py-2 pl-3.5 pr-9 text-xs focus:outline-none text-white placeholder-[#7f91a4] transition-all"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7f91a4] hover:text-white cursor-pointer p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Search className="w-4 h-4 text-[#7f91a4] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredContacts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-[#7f91a4] p-4">
              <div className="w-12 h-12 rounded-full bg-[#202b36] flex items-center justify-center text-[#5288c1] mb-2">
                <UserIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">
                {searchQuery ? 'Tidak ada kontak yang cocok' : 'Belum ada kontak tersimpan'}
              </p>
              <p className="text-xs text-[#7f91a4] mt-1 max-w-xs">
                {searchQuery ? 'Coba kata kunci pencarian lain' : 'Gunakan tombol Tambah di atas untuk menambahkan kontak baru'}
              </p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedContactIds.includes(contact.id);

              return (
                <div
                  key={contact.id}
                  id={`contact-item-${contact.id}`}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelectContact(contact.id);
                    } else {
                      onSelectUser(contact);
                      onClose();
                    }
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer group ${
                    isSelected 
                      ? 'bg-[#5288c1]/15 border border-[#5288c1]/40' 
                      : 'hover:bg-[#202b36] border border-transparent'
                  }`}
                >
                  {/* Left: Checkbox (in selection mode) + Avatar + Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    {isSelectionMode && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectContact(contact.id);
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
                      name={contact.name}
                      username={contact.username}
                      avatar={contact.avatar}
                      color={contact.color || '#5288c1'}
                      size="md"
                      isOnline={contact.isOnline}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{contact.name}</span>
                        <VerifiedBadge 
                          isVerified={contact.isVerified !== undefined ? contact.isVerified : true} 
                          badgeColor={contact.badgeColor || 'blue'} 
                          size="sm" 
                        />
                      </div>
                      <div className="text-xs text-[#7f91a4] truncate flex items-center gap-1.5 mt-0.5">
                        {contact.username ? (
                          <span className="text-[#5288c1]">@{contact.username}</span>
                        ) : (
                          <span className="text-[#64748b] italic">Username disembunyikan</span>
                        )}
                        <span>•</span>
                        <span>{contact.isOnline ? 'Online' : (contact.lastSeen || 'Lama sekali')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  {!isSelectionMode && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          onSelectUser(contact);
                          onClose();
                        }}
                        className="p-2 rounded-lg text-[#7f91a4] hover:text-[#5288c1] hover:bg-[#242f3d] transition-colors cursor-pointer"
                        title="Buka Pesan"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      {onStartCall && (
                        <button
                          onClick={() => {
                            onStartCall(contact, 'audio');
                            onClose();
                          }}
                          className="p-2 rounded-lg text-[#7f91a4] hover:text-[#5288c1] hover:bg-[#242f3d] transition-colors cursor-pointer"
                          title="Panggilan Suara"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        id={`btn-delete-contact-${contact.id}`}
                        onClick={() => setShowConfirmModal({ type: 'single', target: contact })}
                        className="p-2 rounded-lg text-[#7f91a4] hover:text-red-400 hover:bg-red-500/15 transition-all cursor-pointer"
                        title={`Hapus Kontak ${contact.name}`}
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

        {/* Footer Selection Summary */}
        {isSelectionMode && selectedContactIds.length > 0 && (
          <div className="p-3 border-t border-[#242f3d] bg-[#1a2430] flex items-center justify-between text-xs shrink-0">
            <span className="text-slate-300 font-medium">
              {selectedContactIds.length} dari {filteredContacts.length} kontak terpilih
            </span>
            <button
              onClick={() => setShowConfirmModal({ type: 'selected', count: selectedContactIds.length })}
              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus yang Dicentang ({selectedContactIds.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div 
          id="confirm-delete-contact-modal"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-100"
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
                {showConfirmModal.type === 'all' && 'Hapus Semua Kontak?'}
                {showConfirmModal.type === 'selected' && `Hapus ${showConfirmModal.count} Kontak Terpilih?`}
                {showConfirmModal.type === 'single' && `Hapus Kontak ${showConfirmModal.target?.name}?`}
              </h3>
              <p className="text-xs text-[#7f91a4] mt-1">
                {showConfirmModal.type === 'all' && `Tindakan ini akan menghapus seluruh kontak Anda (${showConfirmModal.count} kontak) secara permanen.`}
                {showConfirmModal.type === 'selected' && `${showConfirmModal.count} kontak yang Anda pilih akan dihapus dari daftar kontak Anda.`}
                {showConfirmModal.type === 'single' && `Kontak ${showConfirmModal.target?.name} akan dihapus dari daftar kontak Anda.`}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                id="btn-confirm-delete-contacts-action"
                disabled={isDeleting}
                onClick={executeDelete}
                className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-semibold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : (
                  showConfirmModal.type === 'all' ? 'Ya, Hapus Semua Kontak' : 'Ya, Hapus Kontak'
                )}
              </button>
              <button
                disabled={isDeleting}
                onClick={() => setShowConfirmModal(null)}
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
