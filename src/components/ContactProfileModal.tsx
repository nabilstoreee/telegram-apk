import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, MoreVertical, MessageCircle, Bell, BellOff, Phone, Video,
  QrCode, Timer, Share2, CircleSlash, Edit2, Trash2, Gift, Lock, Home,
  ChevronRight, Copy, Check, X, ShieldAlert, Sparkles, Star
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { VerifiedBadge } from './VerifiedBadge';

export interface ContactProfileData {
  id?: string;
  name: string;
  username?: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  color?: string;
  isOnline?: boolean;
  lastSeen?: string;
  isVerified?: boolean;
  badgeColor?: 'blue' | 'black' | 'green' | string | null;
  isMuted?: boolean;
  isBlocked?: boolean;
  isAdminBlocked?: boolean;
  isBlockedBy?: boolean;
  privacyCalls?: 'everybody' | 'contacts' | 'nobody';
  privacyVoiceMessages?: 'everybody' | 'contacts' | 'nobody';
  privacyBio?: 'everybody' | 'contacts' | 'nobody';
}

interface ContactProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: ContactProfileData;
  onStartChat?: () => void;
  onStartSecretChat?: () => void;
  onStartCall?: (video: boolean) => void;
  onUpdateContactName?: (newName: string) => void;
  onToggleBlock?: () => void;
  onToggleMute?: () => void;
  onDeleteContact?: () => void;
}

export const ContactProfileModal: React.FC<ContactProfileModalProps> = ({
  isOpen,
  onClose,
  contact,
  onStartChat,
  onStartSecretChat,
  onStartCall,
  onUpdateContactName,
  onToggleBlock,
  onToggleMute,
  onDeleteContact,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAutoDeleteModal, setShowAutoDeleteModal] = useState(false);
  const [autoDeleteTime, setAutoDeleteTime] = useState<'off' | '1d' | '1w' | '1m'>('off');
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editedName, setEditedName] = useState(contact.name);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(Boolean(contact.isMuted));
  const [isBlocked, setIsBlocked] = useState(Boolean(contact.isBlocked));

  useEffect(() => {
    setIsBlocked(Boolean(contact.isBlocked));
  }, [contact.isBlocked]);

  useEffect(() => {
    setIsMuted(Boolean(contact.isMuted));
  }, [contact.isMuted]);

  useEffect(() => {
    setEditedName(contact.name);
  }, [contact.name]);

  if (!isOpen) return null;

  if (contact.isAdminBlocked || contact.name === 'Akun Tidak Ditemukan') {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none font-sans">
        <div className="w-full max-w-sm bg-[#17212b] rounded-2xl border border-[#242f3d] p-6 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Akun Tidak Ditemukan</h3>
          <p className="text-xs text-[#7f91a4] leading-relaxed">
            Pengguna ini telah diblokir oleh administrator atau akun tidak tersedia untuk diperiksa.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#5288c1] hover:bg-[#437ca8] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      showToast(`${label} disalin ke papan klip`);
    } else {
      showToast(`${label} disalin: ${text}`);
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (onToggleMute) onToggleMute();
    showToast(next ? 'Notifikasi obrolan disenyapkan' : 'Notifikasi obrolan diaktifkan');
    setShowMenu(false);
  };

  const handleToggleBlock = () => {
    const next = !isBlocked;
    setIsBlocked(next);
    if (onToggleBlock) onToggleBlock();
    showToast(next ? `Pengguna @${contact.username || contact.name} telah diblokir` : `Blokir @${contact.username || contact.name} telah dibuka`);
    setShowMenu(false);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim()) return;
    if (onUpdateContactName) {
      onUpdateContactName(editedName.trim());
    }
    showToast('Nama kontak berhasil diperbarui');
    setShowEditNameModal(false);
    setShowMenu(false);
  };

  const handleShareContact = () => {
    const shareText = `Kontak Telegram: ${contact.name} (@${contact.username || 'user'})\nhttps://t.me/${contact.username || 'user'}`;
    if (navigator.share) {
      navigator.share({
        title: contact.name,
        text: shareText,
        url: `https://t.me/${contact.username || 'user'}`,
      }).catch(() => {});
    } else {
      copyToClipboard(`https://t.me/${contact.username || 'user'}`, 'Tautan kontak');
    }
    setShowMenu(false);
  };

  const handleAddToHome = () => {
    showToast(`Pintasan obrolan ${contact.name} ditambahkan ke Beranda`);
    setShowMenu(false);
  };

  return (
    <div 
      id="contact-profile-fullscreen-overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-150 select-none font-sans"
      onClick={() => {
        if (showMenu) setShowMenu(false);
      }}
    >
      <div 
        id="contact-profile-card"
        className="w-full h-full md:h-[92vh] md:max-w-md bg-[#17181c] md:rounded-2xl md:border md:border-[#2b2d33] shadow-2xl overflow-hidden flex flex-col text-white relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top App Bar with Back and 3-Dots */}
        <div className="h-14 bg-[#17181c] flex items-center justify-between px-3 md:px-4 shrink-0 z-30 relative">
          <button
            id="contact-profile-back-btn"
            onClick={onClose}
            className="p-2 text-slate-200 hover:text-white rounded-full hover:bg-[#26282e] active:scale-95 transition-all cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="relative">
            <button
              id="contact-profile-menu-btn"
              onClick={() => setShowMenu((prev) => !prev)}
              className="p-2 text-slate-200 hover:text-white rounded-full hover:bg-[#26282e] active:scale-95 transition-all cursor-pointer"
              title="Opsi Lainnya"
            >
              <MoreVertical className="w-6 h-6" />
            </button>

            {/* 3-Dots Dropdown Popup (Matches Screenshot 2) */}
            {showMenu && (
              <div 
                id="contact-profile-dropdown-menu"
                className="absolute right-0 top-11 w-64 bg-[#23252a] rounded-2xl shadow-2xl border border-[#32353c] py-2 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-[#2c2f36]"
              >
                <div className="py-1">
                  {/* Hapus Otomatis */}
                  <button
                    id="menu-auto-delete"
                    onClick={() => {
                      setShowMenu(false);
                      setShowAutoDeleteModal(true);
                    }}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-slate-200 hover:bg-[#2d3037] hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <Timer className="w-5 h-5 text-slate-400 shrink-0" />
                      <span>Hapus Otomatis</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>

                  {/* Bagi Kontak */}
                  <button
                    id="menu-share-contact"
                    onClick={handleShareContact}
                    className="w-full px-4 py-2.5 flex items-center gap-3.5 text-sm text-slate-200 hover:bg-[#2d3037] hover:text-white transition-colors cursor-pointer"
                  >
                    <Share2 className="w-5 h-5 text-slate-400 shrink-0" />
                    <span>Bagi Kontak</span>
                  </button>

                  {/* Blokir */}
                  <button
                    id="menu-block-contact"
                    onClick={handleToggleBlock}
                    className="w-full px-4 py-2.5 flex items-center gap-3.5 text-sm text-slate-200 hover:bg-[#2d3037] hover:text-white transition-colors cursor-pointer"
                  >
                    <CircleSlash className={`w-5 h-5 ${isBlocked ? 'text-red-400' : 'text-slate-400'} shrink-0`} />
                    <span>{isBlocked ? 'Buka Blokir' : 'Blokir'}</span>
                  </button>

                  {/* Edit Kontak */}
                  <button
                    id="menu-edit-contact"
                    onClick={() => {
                      setShowMenu(false);
                      setEditedName(contact.name);
                      setShowEditNameModal(true);
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3.5 text-sm text-slate-200 hover:bg-[#2d3037] hover:text-white transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-5 h-5 text-slate-400 shrink-0" />
                    <span>Edit Kontak</span>
                  </button>

                  {/* Hapus Kontak */}
                  <button
                    id="menu-delete-contact"
                    onClick={() => {
                      setShowMenu(false);
                      if (onDeleteContact) onDeleteContact();
                      showToast(`Kontak ${contact.name} telah dihapus`);
                      setTimeout(() => onClose(), 600);
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3.5 text-sm text-slate-200 hover:bg-[#2d3037] hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5 text-slate-400 shrink-0" />
                    <span>Hapus Kontak</span>
                  </button>

                  {/* Kirim Hadiah */}
                  <button
                    id="menu-send-gift"
                    onClick={() => {
                      setShowMenu(false);
                      setShowGiftModal(true);
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3.5 text-sm text-slate-200 hover:bg-[#2d3037] hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    <Gift className="w-5 h-5 text-slate-400 shrink-0" />
                    <span>Kirim Hadiah</span>
                  </button>

                  {/* Mulai Secret Chat */}
                  <button
                    id="menu-secret-chat"
                    onClick={() => {
                      setShowMenu(false);
                      if (onStartSecretChat) onStartSecretChat();
                      showToast('Memulai Obrolan Rahasia Terenkripsi End-to-End...');
                      onClose();
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3.5 text-sm text-slate-200 hover:bg-[#2d3037] hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                    <span>Mulai Secret Chat</span>
                  </button>

                  {/* Tambah ke Beranda */}
                  <button
                    id="menu-add-home"
                    onClick={handleAddToHome}
                    className="w-full px-4 py-2.5 flex items-center gap-3.5 text-sm text-slate-200 hover:bg-[#2d3037] hover:text-white transition-colors cursor-pointer"
                  >
                    <Home className="w-5 h-5 text-slate-400 shrink-0" />
                    <span>Tambah ke Beranda</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content (Hero Profile + Action Buttons + Details) */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-thin">
          
          {/* Centered Large Avatar */}
          <div className="flex flex-col items-center pt-2 pb-5">
            <div className="relative">
              <UserAvatar
                name={contact.name}
                username={contact.isBlockedBy ? undefined : contact.username}
                avatar={contact.isBlockedBy ? '' : contact.avatar}
                color={contact.color || '#5288c1'}
                size="3xl"
                isOnline={contact.isBlockedBy ? false : contact.isOnline}
                className="shadow-2xl"
              />
            </div>

            {/* Contact Name */}
            <h1 className="text-xl font-bold text-white mt-3 text-center tracking-tight flex items-center justify-center gap-1.5">
              <span>{contact.name}</span>
              <VerifiedBadge isVerified={contact.isVerified} badgeColor={contact.badgeColor} size="md" />
            </h1>

            {/* Status (terlihat belakangan ini / online / jam) */}
            <p className={`text-xs mt-1 text-center font-normal ${!contact.isBlockedBy && contact.isOnline ? 'text-[#4fae4e] font-medium' : 'text-[#878a94]'}`}>
              {contact.isBlockedBy 
                ? 'terakhir dilihat lama sekali' 
                : (contact.isOnline ? 'online' : (contact.lastSeen || 'terlihat belakangan ini'))}
            </p>
          </div>

          {/* Blocked by Contact Notification Banner */}
          {contact.isBlockedBy && (
            <div 
              id="blocked-by-user-banner"
              className="bg-red-500/15 border border-red-500/30 rounded-2xl p-4 mb-4 flex items-start gap-3 text-red-200 shadow-md animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-300">Anda telah diblokir oleh pengguna ini</p>
                <p className="text-xs text-red-300/80 mt-1 leading-relaxed">
                  Informasi profil seperti username, nomor telepon, dan bio disembunyikan. Anda tidak dapat mengirim pesan atau melakukan panggilan.
                </p>
              </div>
            </div>
          )}

          {/* Blocked by Me Notification Banner */}
          {isBlocked && !contact.isBlockedBy && (
            <div 
              id="blocked-by-me-banner"
              className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-3.5 mb-4 flex items-center justify-between gap-3 text-amber-200 shadow-md animate-in fade-in"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CircleSlash className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-medium text-amber-300 truncate">Pengguna ini telah Anda blokir</span>
              </div>
              <button
                onClick={handleToggleBlock}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Buka Blokir
              </button>
            </div>
          )}

          {/* 4 Action Pill Buttons (Obrolan, Senyapkan, Hubungi, Video) */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            
            {/* 1. Obrolan */}
            <button
              id="action-btn-chat"
              onClick={() => {
                if (contact.isBlockedBy) {
                  showToast('Anda telah diblokir oleh pengguna ini.');
                  return;
                }
                if (onStartChat) onStartChat();
                onClose();
              }}
              className="bg-[#23252a] hover:bg-[#2d3037] active:scale-95 py-3 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border border-[#2b2d33]"
              title="Obrolan"
            >
              <MessageCircle className="w-5 h-5 text-white" />
              <span className="text-xs text-white font-medium">Obrolan</span>
            </button>

            {/* 2. Senyapkan */}
            <button
              id="action-btn-mute"
              onClick={handleToggleMute}
              className="bg-[#23252a] hover:bg-[#2d3037] active:scale-95 py-3 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border border-[#2b2d33]"
              title={isMuted ? 'Bunyikan' : 'Senyapkan'}
            >
              {isMuted ? (
                <BellOff className="w-5 h-5 text-red-400" />
              ) : (
                <Bell className="w-5 h-5 text-white" />
              )}
              <span className="text-xs text-white font-medium">
                {isMuted ? 'Bunyikan' : 'Senyapkan'}
              </span>
            </button>

            {/* 3. Hubungi */}
            <button
              id="action-btn-call"
              onClick={() => {
                if (contact.isBlockedBy) {
                  showToast('Anda telah diblokir oleh pengguna ini.');
                  return;
                }
                if (contact.privacyCalls === 'nobody') {
                  showToast('Pengguna ini membatasi panggilan masuk karena privasi.');
                  return;
                }
                if (onStartCall) onStartCall(false);
                else showToast(`Memanggil suara ke ${contact.name}...`);
              }}
              className="bg-[#23252a] hover:bg-[#2d3037] active:scale-95 py-3 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border border-[#2b2d33]"
              title="Hubungi"
            >
              <Phone className="w-5 h-5 text-white" />
              <span className="text-xs text-white font-medium">Hubungi</span>
            </button>

            {/* 4. Video */}
            <button
              id="action-btn-video"
              onClick={() => {
                if (contact.isBlockedBy) {
                  showToast('Anda telah diblokir oleh pengguna ini.');
                  return;
                }
                if (contact.privacyCalls === 'nobody') {
                  showToast('Pengguna ini membatasi panggilan video karena privasi.');
                  return;
                }
                if (onStartCall) onStartCall(true);
                else showToast(`Memanggil panggilan video ke ${contact.name}...`);
              }}
              className="bg-[#23252a] hover:bg-[#2d3037] active:scale-95 py-3 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border border-[#2b2d33]"
              title="Video"
            >
              <Video className="w-5 h-5 text-white" />
              <span className="text-xs text-white font-medium">Video</span>
            </button>
          </div>

          {/* Info Details Section */}
          <div className="bg-[#23252a] rounded-2xl border border-[#2b2d33] overflow-hidden divide-y divide-[#2c2f36] shadow-sm">
            
            {contact.isBlockedBy ? (
              /* When blocked, sensitive info (username, phone, bio) is completely removed */
              <div className="p-4 text-center">
                <p className="text-xs text-[#878a94] italic">
                  Informasi kontak (nomor ponsel, username, bio) disembunyikan oleh sistem.
                </p>
              </div>
            ) : (
              <>
                {/* Phone Number */}
                {contact.phone && contact.phone !== 'Disembunyikan' ? (
                  <div 
                    id="info-row-phone"
                    onClick={() => copyToClipboard(contact.phone || '', 'Nomor telepon')}
                    className="p-3.5 hover:bg-[#2a2c33] transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-sm font-medium text-white block tracking-wide">
                        {contact.phone}
                      </span>
                      <span className="text-xs text-[#878a94] block mt-0.5">
                        Ponsel
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Username with QR code icon (hidden completely if no username) */}
                {contact.username && contact.username !== 'Disembunyikan' ? (
                  <div 
                    id="info-row-username"
                    className="p-3.5 hover:bg-[#2a2c33] transition-colors flex items-center justify-between"
                  >
                    <div 
                      className="min-w-0 pr-2 cursor-pointer flex-1"
                      onClick={() => copyToClipboard(`@${contact.username}`, 'Username')}
                    >
                      <span className="text-sm font-medium text-white block tracking-wide">
                        @{contact.username}
                      </span>
                      <span className="text-xs text-[#878a94] block mt-0.5">
                        Username
                      </span>
                    </div>

                    {/* QR Code button */}
                    <button
                      id="btn-open-qr"
                      onClick={() => setShowQrModal(true)}
                      className="p-2 text-[#5288c1] hover:text-white rounded-lg hover:bg-[#34373f] transition-colors cursor-pointer shrink-0"
                      title="Tampilkan Kode QR"
                    >
                      <QrCode className="w-5 h-5 text-[#5288c1]" />
                    </button>
                  </div>
                ) : null}

                {/* Bio (if available) */}
                {contact.bio ? (
                  <div 
                    id="info-row-bio"
                    onClick={() => copyToClipboard(contact.bio || '', 'Bio')}
                    className="p-3.5 hover:bg-[#2a2c33] transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-normal text-white leading-relaxed block break-words">
                      {contact.bio}
                    </span>
                    <span className="text-xs text-[#878a94] block mt-0.5">
                      Bio
                    </span>
                  </div>
                ) : null}

                {/* Fallback empty message if all private/empty */}
                {!contact.phone && !contact.username && !contact.bio && (
                  <div className="p-4 text-center">
                    <p className="text-xs text-[#878a94]">
                      Tidak ada informasi kontak tambahan.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-[#2d3037] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-2xl border border-[#40444e] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 z-50">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* QR Code Dialog Modal */}
        {showQrModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-xs bg-[#23252a] rounded-3xl p-6 flex flex-col items-center border border-[#34373f] shadow-2xl relative">
              <button 
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <UserAvatar
                name={contact.name}
                username={contact.username}
                avatar={contact.avatar}
                color={contact.color || '#5288c1'}
                size="lg"
                className="mb-3"
              />
              <h3 className="font-bold text-white text-base">{contact.name}</h3>
              <p className="text-xs text-[#5288c1] font-semibold mb-4">@{contact.username || 'user'}</p>

              <div className="p-4 bg-white rounded-2xl shadow-inner mb-4 flex items-center justify-center">
                <QrCode className="w-36 h-36 text-slate-900" />
              </div>

              <p className="text-[11px] text-[#878a94] text-center mb-4">
                Pindai kode QR ini untuk membuka obrolan langsung dengan {contact.name}.
              </p>

              <button
                onClick={() => {
                  copyToClipboard(`https://t.me/${contact.username || 'user'}`, 'Tautan profil');
                  setShowQrModal(false);
                }}
                className="w-full py-2.5 bg-[#5288c1] hover:bg-[#4374a8] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Bagikan Tautan Profil
              </button>
            </div>
          </div>
        )}

        {/* Auto-Delete (Hapus Otomatis) Timer Modal */}
        {showAutoDeleteModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-sm bg-[#23252a] rounded-3xl p-5 flex flex-col border border-[#34373f] shadow-2xl relative">
              <button 
                onClick={() => setShowAutoDeleteModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-2">
                <Timer className="w-5 h-5 text-[#5288c1]" />
                <h3 className="font-bold text-white text-base">Hapus Otomatis Pesan</h3>
              </div>
              <p className="text-xs text-[#878a94] mb-4">
                Pesan baru dalam obrolan ini akan dihapus secara otomatis setelah durasi waktu yang dipilih.
              </p>

              <div className="space-y-2 mb-5">
                {[
                  { id: 'off', label: 'Nonaktif' },
                  { id: '1d', label: 'Setelah 24 Jam' },
                  { id: '1w', label: 'Setelah 1 Minggu' },
                  { id: '1m', label: 'Setelah 1 Bulan' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAutoDeleteTime(item.id as any)}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      autoDeleteTime === item.id 
                        ? 'bg-[#5288c1] text-white' 
                        : 'bg-[#17181c] text-slate-300 hover:bg-[#2d3037]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {autoDeleteTime === item.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  showToast(autoDeleteTime === 'off' ? 'Hapus otomatis dinonaktifkan' : 'Pengaturan hapus otomatis disimpan');
                  setShowAutoDeleteModal(false);
                }}
                className="w-full py-2.5 bg-[#5288c1] hover:bg-[#4374a8] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Terapkan Pengaturan
              </button>
            </div>
          </div>
        )}

        {/* Edit Contact Modal */}
        {showEditNameModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
            <form 
              onSubmit={handleSaveName}
              className="w-full max-w-sm bg-[#23252a] rounded-3xl p-5 flex flex-col border border-[#34373f] shadow-2xl relative"
            >
              <button 
                type="button"
                onClick={() => setShowEditNameModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-bold text-white text-base mb-1">Edit Nama Kontak</h3>
              <p className="text-xs text-[#878a94] mb-4">
                Nama ini hanya akan terlihat oleh Anda di daftar kontak Anda.
              </p>

              <input
                type="text"
                required
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full bg-[#17181c] border border-[#34373f] focus:border-[#5288c1] rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none mb-5"
                placeholder="Nama Kontak"
                autoFocus
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditNameModal(false)}
                  className="flex-1 py-2.5 bg-[#2d3037] hover:bg-[#383c45] text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#5288c1] hover:bg-[#4374a8] text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Send Gift Modal */}
        {showGiftModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-xs bg-[#23252a] rounded-3xl p-5 flex flex-col items-center border border-[#34373f] shadow-2xl relative">
              <button 
                onClick={() => setShowGiftModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                <Gift className="w-8 h-8" />
              </div>

              <h3 className="font-bold text-white text-base mb-1">Kirim Hadiah Telegram</h3>
              <p className="text-xs text-[#878a94] text-center mb-4">
                Kirim hadiah bintang Telegram eksklusif untuk {contact.name}.
              </p>

              <div className="w-full grid grid-cols-3 gap-2 mb-4">
                {[
                  { star: '⭐ 50', label: 'Bintang' },
                  { star: '⭐ 100', label: 'Bintang' },
                  { star: '⭐ 250', label: 'Bintang' },
                ].map((gift, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      showToast(`Hadiah ${gift.star} berhasil dikirim ke ${contact.name}! 🎁`);
                      setShowGiftModal(false);
                    }}
                    className="p-2.5 bg-[#17181c] hover:bg-[#2d3037] rounded-xl border border-[#34373f] text-center transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-amber-300 block group-hover:scale-105 transition-transform">{gift.star}</span>
                    <span className="text-[10px] text-[#878a94]">{gift.label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowGiftModal(false)}
                className="w-full py-2 bg-[#2d3037] text-slate-300 hover:text-white text-xs font-semibold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
