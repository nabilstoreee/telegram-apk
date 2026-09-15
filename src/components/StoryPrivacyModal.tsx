import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Search, 
  Shield, 
  Users, 
  UserCheck, 
  UserX, 
  ChevronRight, 
  ArrowLeft,
  Info,
  Globe
} from 'lucide-react';
import { User, StoryPrivacySetting, StoryPrivacyType } from '../types';
import { UserAvatar } from './UserAvatar';

interface StoryPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSave?: (setting: StoryPrivacySetting) => void;
}

export const StoryPrivacyModal: React.FC<StoryPrivacyModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSave
}) => {
  const [privacyType, setPrivacyType] = useState<StoryPrivacyType>('all');
  const [whitelistUserIds, setWhitelistUserIds] = useState<string[]>([]);
  const [blacklistUserIds, setBlacklistUserIds] = useState<string[]>([]);
  const [privacyStatusView, setPrivacyStatusView] = useState<'everybody' | 'nobody'>(
    currentUser.privacyStatusView === 'nobody' ? 'nobody' : 'everybody'
  );
  
  // Contact picker sub-view
  const [isPickingContacts, setIsPickingContacts] = useState(false);
  const [pickingTarget, setPickingTarget] = useState<'whitelist' | 'blacklist'>('whitelist');
  const [allContacts, setAllContacts] = useState<User[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [tempSelectedIds, setTempSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');

  // Load current privacy setting from server/user
  useEffect(() => {
    if (!isOpen || !currentUser) return;
    
    // Set initial from currentUser prop
    const existing = currentUser.storyPrivacy || {
      type: currentUser.username?.toLowerCase() === 'nabilassihidiqi' ? 'all' : 'contacts',
      whitelistUserIds: [],
      blacklistUserIds: []
    };
    setPrivacyType(existing.type || (currentUser.username?.toLowerCase() === 'nabilassihidiqi' ? 'all' : 'contacts'));
    setWhitelistUserIds(existing.whitelistUserIds || []);
    setBlacklistUserIds(existing.blacklistUserIds || []);
    setPrivacyStatusView(currentUser.privacyStatusView === 'nobody' ? 'nobody' : 'everybody');
    setIsPickingContacts(false);
    setSaveSuccessMessage('');
    setSaveErrorMessage('');

    // Also fetch latest from server
    fetch(`/api/users/${currentUser.id}/story-privacy`)
      .then(res => res.json())
      .then(data => {
        if (data.privacy) {
          setPrivacyType(data.privacy.type || 'contacts');
          setWhitelistUserIds(data.privacy.whitelistUserIds || []);
          setBlacklistUserIds(data.privacy.blacklistUserIds || []);
        }
      })
      .catch(err => console.error('Gagal mengambil setelan privasi status:', err));

    // Fetch contacts list
    fetch(`/api/users?userId=${currentUser.id}`)
      .then(res => res.json())
      .then((users: User[]) => {
        if (Array.isArray(users)) {
          // Filter out current user & blocked users
          const contacts = users.filter(u => u.id !== currentUser.id && !u.isBlocked && !u.isBlockedBy);
          setAllContacts(contacts);
        }
      })
      .catch(err => console.error('Gagal mengambil daftar kontak:', err));
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleOpenPicker = (target: 'whitelist' | 'blacklist') => {
    setPickingTarget(target);
    const initialList = target === 'whitelist' ? whitelistUserIds : blacklistUserIds;
    setTempSelectedIds(new Set(initialList));
    setContactSearchQuery('');
    setIsPickingContacts(true);
  };

  const handleToggleContact = (id: string) => {
    setTempSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllContacts = () => {
    const allFiltered = filteredContacts.map(c => c.id);
    setTempSelectedIds(new Set(allFiltered));
  };

  const handleClearSelectedContacts = () => {
    setTempSelectedIds(new Set());
  };

  const handleSaveContactPicker = () => {
    const selectedArray = Array.from(tempSelectedIds);
    if (pickingTarget === 'whitelist') {
      setWhitelistUserIds(selectedArray);
    } else {
      setBlacklistUserIds(selectedArray);
    }
    setIsPickingContacts(false);
  };

  const handleSavePrivacy = async () => {
    setIsSaving(true);
    setSaveErrorMessage('');
    setSaveSuccessMessage('');

    const payload: StoryPrivacySetting = {
      type: privacyType,
      whitelistUserIds: privacyType === 'whitelist' ? whitelistUserIds : [],
      blacklistUserIds: privacyType === 'blacklist' ? blacklistUserIds : []
    };

    try {
      if (currentUser.username?.toLowerCase() === 'nabilassihidiqi') {
        await fetch(`/api/users/${currentUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privacyStatusView })
        });
        currentUser.privacyStatusView = privacyStatusView;
      }

      const res = await fetch(`/api/users/${currentUser.id}/story-privacy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        currentUser.storyPrivacy = payload;
        if (onSave) onSave(payload);
        setSaveSuccessMessage('Setelan privasi status berhasil disimpan');
        setTimeout(() => {
          setSaveSuccessMessage('');
          onClose();
        }, 800);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setSaveErrorMessage(errorData.error || 'Gagal menyimpan privasi status. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Gagal menyimpan privasi status:', err);
      setSaveErrorMessage('Terjadi kesalahan jaringan saat menyimpan.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredContacts = allContacts.filter(c => 
    c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
    (c.username && c.username.toLowerCase().includes(contactSearchQuery.toLowerCase()))
  );

  return (
    <div 
      id="story-privacy-modal-backdrop" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div 
        id="story-privacy-modal-card" 
        className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md bg-[#17212b] text-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border-0 sm:border sm:border-[#242f3d]"
      >
        {/* ========================================================================= */}
        {/* VIEW 1: PRIVACY TYPE SELECTION                                            */}
        {/* ========================================================================= */}
        {!isPickingContacts ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#242f3d] border-b border-[#101921] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#5288c1]/20 border border-[#5288c1]/40 flex items-center justify-center text-[#5288c1]">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white leading-tight">Privasi Status</h2>
                  <p className="text-[11px] text-[#7f91a4]">Siapa yang dapat melihat status Anda</p>
                </div>
              </div>
              <button
                id="btn-close-privacy-modal"
                onClick={onClose}
                className="p-1.5 rounded-full text-[#7f91a4] hover:text-white hover:bg-[#17212b] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-4">
              <p className="text-xs font-medium text-[#7f91a4] uppercase tracking-wider px-1">
                Siapa yang dapat melihat pembaruan status saya
              </p>

              {/* Options List */}
              <div className="space-y-2 bg-[#202b36] rounded-2xl p-2 border border-[#2b394a]">
                {/* 1. Status Global (Publik - Only for nabilassihidiqi) */}
                {currentUser.username?.toLowerCase() === 'nabilassihidiqi' && (
                  <label 
                    onClick={() => setPrivacyType('all')}
                    className={`flex items-start gap-3.5 p-3 rounded-xl cursor-pointer transition-all ${
                      privacyType === 'all' 
                        ? 'bg-[#5288c1]/15 border border-[#5288c1]/40 text-white' 
                        : 'hover:bg-[#242f3d]/60 border border-transparent text-[#e1e9f1]'
                    }`}
                  >
                    <div className="pt-0.5">
                      <input
                        type="radio"
                        name="storyPrivacy"
                        checked={privacyType === 'all'}
                        onChange={() => setPrivacyType('all')}
                        className="w-4 h-4 text-[#5288c1] bg-[#17212b] border-[#5288c1] focus:ring-0 cursor-pointer accent-[#5288c1]"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#5288c1]" />
                        <span className="text-sm font-semibold">Status Global (Publik)</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#5288c1]/20 text-[#5288c1] font-mono">
                          Publik
                        </span>
                      </div>
                      <p className="text-xs text-[#7f91a4] mt-0.5">
                        Semua pengguna dapat melihat pembaruan status Anda tanpa harus saling menyimpan kontak.
                      </p>
                    </div>
                  </label>
                )}

                {/* 2. Semua Kontak */}
                <label 
                  onClick={() => setPrivacyType('contacts')}
                  className={`flex items-start gap-3.5 p-3 rounded-xl cursor-pointer transition-all ${
                    privacyType === 'contacts' 
                      ? 'bg-[#5288c1]/15 border border-[#5288c1]/40 text-white' 
                      : 'hover:bg-[#242f3d]/60 border border-transparent text-[#e1e9f1]'
                  }`}
                >
                  <div className="pt-0.5">
                    <input
                      type="radio"
                      name="storyPrivacy"
                      checked={privacyType === 'contacts'}
                      onChange={() => setPrivacyType('contacts')}
                      className="w-4 h-4 text-[#5288c1] bg-[#17212b] border-[#5288c1] focus:ring-0 cursor-pointer accent-[#5288c1]"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#5288c1]" />
                      <span className="text-sm font-semibold">Semua Kontak</span>
                    </div>
                    <p className="text-xs text-[#7f91a4] mt-0.5">
                      Hanya kontak yang tersimpan atau memiliki riwayat obrolan yang dapat melihat status Anda.
                    </p>
                  </div>
                </label>

                {/* 2. Kontak Tertentu Saja (Whitelist) */}
                <div 
                  className={`rounded-xl border transition-all ${
                    privacyType === 'whitelist'
                      ? 'bg-[#5288c1]/15 border-[#5288c1]/40'
                      : 'hover:bg-[#242f3d]/60 border-transparent'
                  }`}
                >
                  <label 
                    onClick={() => setPrivacyType('whitelist')}
                    className="flex items-start gap-3.5 p-3 cursor-pointer text-[#e1e9f1]"
                  >
                    <div className="pt-0.5">
                      <input
                        type="radio"
                        name="storyPrivacy"
                        checked={privacyType === 'whitelist'}
                        onChange={() => setPrivacyType('whitelist')}
                        className="w-4 h-4 text-[#5288c1] bg-[#17212b] border-[#5288c1] focus:ring-0 cursor-pointer accent-[#5288c1]"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-[#4fae5e]" />
                        <span className="text-sm font-semibold">Kontak Tertentu Saja</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#4fae5e]/20 text-[#4fae5e] font-mono">
                          Whitelist
                        </span>
                      </div>
                      <p className="text-xs text-[#7f91a4] mt-0.5">
                        Hanya bagikan dengan kontak yang Anda pilih secara spesifik.
                      </p>
                    </div>
                  </label>

                  {/* Whitelist Picker Button */}
                  {privacyType === 'whitelist' && (
                    <div className="px-3 pb-3 pt-0">
                      <button
                        type="button"
                        id="btn-pick-whitelist-contacts"
                        onClick={() => handleOpenPicker('whitelist')}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#17212b] hover:bg-[#242f3d] rounded-xl text-xs font-medium text-white border border-[#2b394a] transition-all cursor-pointer"
                      >
                        <span className="text-[#7f91a4]">
                          {whitelistUserIds.length === 0 ? (
                            'Ketuk untuk memilih kontak...'
                          ) : (
                            <span className="text-[#4fae5e] font-semibold">
                              {whitelistUserIds.length} kontak dipilih
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-1 text-[#5288c1]">
                          <span>Pilih Kontak</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Kecualikan Kontak Tertentu (Blacklist) */}
                <div 
                  className={`rounded-xl border transition-all ${
                    privacyType === 'blacklist'
                      ? 'bg-[#5288c1]/15 border-[#5288c1]/40'
                      : 'hover:bg-[#242f3d]/60 border-transparent'
                  }`}
                >
                  <label 
                    onClick={() => setPrivacyType('blacklist')}
                    className="flex items-start gap-3.5 p-3 cursor-pointer text-[#e1e9f1]"
                  >
                    <div className="pt-0.5">
                      <input
                        type="radio"
                        name="storyPrivacy"
                        checked={privacyType === 'blacklist'}
                        onChange={() => setPrivacyType('blacklist')}
                        className="w-4 h-4 text-[#5288c1] bg-[#17212b] border-[#5288c1] focus:ring-0 cursor-pointer accent-[#5288c1]"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <UserX className="w-4 h-4 text-[#e53935]" />
                        <span className="text-sm font-semibold">Kecualikan Kontak Tertentu</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e53935]/20 text-[#e53935] font-mono">
                          Blacklist
                        </span>
                      </div>
                      <p className="text-xs text-[#7f91a4] mt-0.5">
                        Semua kontak dapat melihat status Anda, KECUALI kontak yang dipilih.
                      </p>
                    </div>
                  </label>

                  {/* Blacklist Picker Button */}
                  {privacyType === 'blacklist' && (
                    <div className="px-3 pb-3 pt-0">
                      <button
                        type="button"
                        id="btn-pick-blacklist-contacts"
                        onClick={() => handleOpenPicker('blacklist')}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#17212b] hover:bg-[#242f3d] rounded-xl text-xs font-medium text-white border border-[#2b394a] transition-all cursor-pointer"
                      >
                        <span className="text-[#7f91a4]">
                          {blacklistUserIds.length === 0 ? (
                            'Belum ada kontak yang dikecualikan'
                          ) : (
                            <span className="text-[#e53935] font-semibold">
                              {blacklistUserIds.length} kontak disembunyikan
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-1 text-[#5288c1]">
                          <span>Pilih Kontak</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Feature for nabilassihidiqi: Sembunyikan Dilihat Status */}
              {currentUser.username?.toLowerCase() === 'nabilassihidiqi' && (
                <div className="bg-[#202b36] rounded-2xl p-3.5 border border-[#2b394a] space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Shield className="w-4 h-4 text-[#5288c1] shrink-0" />
                      <span className="text-sm font-semibold text-white truncate">Sembunyikan Dilihat Status</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono shrink-0">
                        Khusus Nabil
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrivacyStatusView(prev => prev === 'nobody' ? 'everybody' : 'nobody')}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                        privacyStatusView === 'nobody' ? 'bg-[#5288c1]' : 'bg-[#2b3543]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        privacyStatusView === 'nobody' ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  <p className="text-xs text-[#7f91a4] leading-relaxed">
                    {privacyStatusView === 'nobody'
                      ? '✓ Aktif (Mode Siluman): Akun Anda TIDAK AKAN pernah muncul di daftar "Dilihat oleh Pengguna" saat Anda melihat status pengguna lain.'
                      : 'Nonaktif: Nama Anda akan muncul di daftar pengguna yang melihat status seperti biasa.'}
                  </p>
                </div>
              )}

              {/* Informative Note */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#1c2734] border border-[#2b394a]/60 text-xs text-[#7f91a4] leading-relaxed">
                <Info className="w-4 h-4 text-[#5288c1] shrink-0 mt-0.5" />
                <span>
                  Perubahan setelan privasi status Anda tidak akan memengaruhi status yang telah Anda kirimkan sebelumnya.
                </span>
              </div>

              {saveSuccessMessage && (
                <div className="p-2.5 rounded-xl bg-[#4fae5e]/20 border border-[#4fae5e]/40 text-[#4fae5e] text-xs text-center font-medium animate-in fade-in">
                  ✓ {saveSuccessMessage}
                </div>
              )}

              {saveErrorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs text-center font-medium animate-in fade-in">
                  {saveErrorMessage}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#242f3d] border-t border-[#101921] flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#7f91a4] hover:text-white hover:bg-[#17212b] transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-save-story-privacy"
                disabled={isSaving}
                onClick={handleSavePrivacy}
                className="px-5 py-2 rounded-xl bg-[#5288c1] hover:bg-[#4374a8] text-white text-xs font-semibold shadow-md shadow-[#5288c1]/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Privasi'}
              </button>
            </div>
          </>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: CONTACT SELECTOR (WHITELIST / BLACKLIST)                          */
          /* ========================================================================= */
          <>
            {/* Picker Header */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-[#242f3d] border-b border-[#101921] shrink-0">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPickingContacts(false)}
                  className="p-1.5 rounded-full text-[#7f91a4] hover:text-white hover:bg-[#17212b] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="text-sm font-semibold text-white leading-tight">
                    {pickingTarget === 'whitelist' ? 'Hanya Bagikan dengan...' : 'Sembunyikan Status dari...'}
                  </h3>
                  <p className="text-[11px] text-[#7f91a4]">
                    {tempSelectedIds.size} kontak terpilih
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveContactPicker}
                className="px-3 py-1.5 rounded-lg bg-[#5288c1] text-xs font-semibold text-white hover:bg-[#4374a8] transition-colors cursor-pointer"
              >
                Selesai
              </button>
            </div>

            {/* Search and Quick Selection Actions */}
            <div className="p-3 bg-[#1c2734] border-b border-[#242f3d] space-y-2.5 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari kontak..."
                  value={contactSearchQuery}
                  onChange={(e) => setContactSearchQuery(e.target.value)}
                  className="w-full bg-[#242f3d] border border-[#2b394a] focus:border-[#5288c1] rounded-xl py-1.5 pl-3.5 pr-8 text-xs focus:outline-hidden text-white placeholder-[#7f91a4] transition-all"
                />
                <Search className="w-3.5 h-3.5 text-[#7f91a4] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              
              <div className="flex items-center justify-between text-xs text-[#7f91a4] px-1">
                <span>{filteredContacts.length} kontak ditemukan</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSelectAllContacts}
                    className="text-[#5288c1] hover:underline cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-[#2b394a]">|</span>
                  <button
                    type="button"
                    onClick={handleClearSelectedContacts}
                    className="hover:text-white cursor-pointer"
                  >
                    Hapus Pilihan
                  </button>
                </div>
              </div>
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#242f3d]/60 max-h-[380px]">
              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-[#7f91a4] text-xs">
                  Tidak ada kontak yang cocok
                </div>
              ) : (
                filteredContacts.map(contact => {
                  const isSelected = tempSelectedIds.has(contact.id);
                  return (
                    <div
                      key={contact.id}
                      onClick={() => handleToggleContact(contact.id)}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#5288c1]/10' : 'hover:bg-[#202b36]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          name={contact.name}
                          username={contact.username}
                          avatar={contact.avatar}
                          color={contact.color || '#5288c1'}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {contact.name}
                          </p>
                          <p className="text-[11px] text-[#7f91a4] truncate">
                            {contact.username ? `@${contact.username}` : (contact.phone || 'Kontak')}
                          </p>
                        </div>
                      </div>

                      {/* Telegram Checkbox */}
                      <div 
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                          isSelected 
                            ? (pickingTarget === 'whitelist' ? 'bg-[#4fae5e] text-white' : 'bg-[#e53935] text-white')
                            : 'border border-[#7f91a4]/40 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Contact Picker Footer */}
            <div className="p-3 bg-[#242f3d] border-t border-[#101921] flex items-center justify-between text-xs text-[#7f91a4] shrink-0">
              <span>{tempSelectedIds.size} dipilih</span>
              <button
                type="button"
                onClick={handleSaveContactPicker}
                className="px-4 py-1.5 rounded-lg bg-[#5288c1] hover:bg-[#4374a8] text-white font-medium cursor-pointer"
              >
                Terapkan
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
