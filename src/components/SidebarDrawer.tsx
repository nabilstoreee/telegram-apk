import React, { useState, useEffect } from 'react';
import { 
  Users, User as UserIcon, Bookmark, Phone, 
  ChevronDown, ChevronUp, Plus, Contact, 
  Settings, UserPlus, HelpCircle, Check, LogOut, Moon, X, Download, Smartphone
} from 'lucide-react';
import { User } from '../types';
import { UserAvatar } from './UserAvatar';
import { VerifiedBadge } from './VerifiedBadge';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  onOpenAddAccount: () => void;
  onOpenProfile: () => void;
  onOpenStatusEmoji: () => void;
  onOpenWallet: () => void;
  onOpenNewGroup: () => void;
  onOpenContacts: () => void;
  onOpenCalls: () => void;
  onOpenSavedMessages: () => void;
  onOpenSettings: () => void;
  onOpenChatSettings: () => void;
  onOpenInvite: () => void;
  onOpenFeatures: () => void;
  onLogout: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onSwitchUser,
  onOpenAddAccount,
  onOpenProfile,
  onOpenStatusEmoji,
  onOpenWallet,
  onOpenNewGroup,
  onOpenContacts,
  onOpenCalls,
  onOpenSavedMessages,
  onOpenSettings,
  onOpenChatSettings,
  onOpenInvite,
  onOpenFeatures,
  onLogout,
}) => {
  const [isAccountsExpanded, setIsAccountsExpanded] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState<boolean>(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = () => {
    setShowInstallGuideModal(true);
  };

  // Close drawer on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div id="drawer-overlay" className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex transition-opacity animate-in fade-in duration-200">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container (Telegram Dark Theme) */}
      <div 
        id="sidebar-drawer-panel"
        className="relative w-[300px] max-w-[85vw] h-full bg-[#17212b] text-slate-100 shadow-2xl flex flex-col z-10 select-none animate-in slide-in-from-left duration-200 border-r border-[#101921]"
      >
        {/* Drawer Header */}
        <div className="bg-[#242f3d] text-white p-4 border-b border-[#101921]">
          {/* Avatar & Dark Mode Badge */}
          <div className="flex items-center justify-between mb-3">
            <div 
              onClick={onOpenProfile}
              className="relative cursor-pointer group"
            >
              <UserAvatar
                name={currentUser.name}
                username={currentUser.username}
                avatar={currentUser.avatar}
                color={currentUser.color || '#5288c1'}
                size="xl"
                statusEmoji={currentUser.statusEmoji}
                className="group-hover:scale-105 transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-[#17212b] flex items-center justify-center text-[#5288c1] border border-[#313d4f]" title="Tema Gelap Aktif">
                <Moon className="w-4 h-4" />
              </div>
              <button
                id="btn-close-sidebar-drawer"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#17212b] flex items-center justify-center text-slate-300 hover:text-white border border-[#313d4f] hover:bg-[#202d3d] transition-colors cursor-pointer"
                title="Tutup Menu (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* User Name & Chevron */}
          <div 
            onClick={() => setIsAccountsExpanded(!isAccountsExpanded)}
            className="flex items-center justify-between cursor-pointer group py-0.5"
          >
            <div className="min-w-0 pr-2">
              <div className="text-base font-semibold text-white truncate flex items-center gap-1.5">
                <span>{currentUser.name}</span>
                {currentUser.statusEmoji && (
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenStatusEmoji();
                    }}
                    className="text-base cursor-pointer hover:scale-110 transition-transform select-none" 
                    title="Ubah Status Emoji"
                  >
                    {currentUser.statusEmoji}
                  </span>
                )}
                <VerifiedBadge isVerified={currentUser.isVerified} badgeColor={currentUser.badgeColor} size="sm" />
              </div>
              <div className="text-xs text-[#7f91a4] tracking-wide mt-0.5">
                {currentUser.phone || `@${currentUser.username}`}
              </div>
            </div>
            <button 
              id="drawer-account-expand-btn"
              className="text-[#7f91a4] group-hover:text-white transition-colors"
            >
              {isAccountsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {/* Account Switcher Section */}
          {isAccountsExpanded && (
            <div id="drawer-accounts-list" className="mt-3 pt-3 border-t border-[#313d4f] space-y-1 animate-in fade-in duration-150">
              {allUsers.map((user) => {
                const isSelected = user.id === currentUser.id;
                const isBlockedAcc = Boolean(user.isBlocked || user.isAdminBlocked || user.name === 'Akun Tidak Ditemukan');
                return (
                  <div
                    key={user.id}
                    id={`account-item-${user.username}`}
                    onClick={() => {
                      if (isBlockedAcc) {
                        alert(`Akun @${user.username || user.name} telah diblokir oleh administrator.`);
                        return;
                      }
                      onSwitchUser(user);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                      isSelected ? 'bg-[#5288c1]/25 border border-[#5288c1]/40' : 'hover:bg-[#17212b]'
                    } ${isBlockedAcc ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative">
                        <UserAvatar
                          name={user.name}
                          username={user.username}
                          avatar={user.avatar}
                          color={user.color || '#5288c1'}
                          size="sm"
                        />
                        {isSelected && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#5288c1] text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-white truncate max-w-[130px]">
                          {user.name}
                        </span>
                        {isBlockedAcc && (
                          <span className="text-[10px] font-semibold text-rose-400">
                            (Diblokir)
                          </span>
                        )}
                      </div>
                    </div>

                    {user.unreadTotal !== undefined && user.unreadTotal > 0 && (
                      <span className="px-2 py-0.5 bg-[#5288c1] text-white text-[11px] font-bold rounded-full min-w-[20px] text-center">
                        {user.unreadTotal}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Tambah Akun Button */}
              <button
                id="drawer-add-account-btn"
                onClick={() => {
                  onClose();
                  onOpenAddAccount();
                }}
                className="w-full flex items-center gap-3 p-2 rounded-xl text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-[#17212b] transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-[#17212b] border border-[#313d4f] flex items-center justify-center text-[#5288c1]">
                  <Plus className="w-4 h-4" />
                </div>
                <span>Tambah Akun</span>
              </button>
            </div>
          )}
        </div>

        {/* Drawer Menu Items */}
        <div id="drawer-menu-scroll" className="flex-1 overflow-y-auto custom-scrollbar py-2 bg-[#17212b]">
          
          {/* Section 1: Profil Saya */}
          <div className="space-y-0.5">
            <button
              id="menu-btn-profile"
              onClick={() => { onClose(); onOpenProfile(); }}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[#202b36] transition-colors text-left text-sm text-slate-200 cursor-pointer font-medium"
            >
              <UserIcon className="w-5 h-5 text-[#7f91a4]" />
              <span>Profil Saya</span>
            </button>
          </div>

          <div className="h-[1px] bg-[#101921] my-2" />

          {/* Section 2: Grup Baru, Kontak, Panggilan, Pesan Tersimpan, Pengaturan */}
          <div className="space-y-0.5">
            <button
              id="menu-btn-new-group"
              onClick={() => { onClose(); onOpenNewGroup(); }}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[#202b36] transition-colors text-left text-sm text-slate-200 cursor-pointer font-medium"
            >
              <Users className="w-5 h-5 text-[#7f91a4]" />
              <span>Grup Baru</span>
            </button>

            <button
              id="menu-btn-contacts"
              onClick={() => { onClose(); onOpenContacts(); }}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[#202b36] transition-colors text-left text-sm text-slate-200 cursor-pointer font-medium"
            >
              <Contact className="w-5 h-5 text-[#7f91a4]" />
              <span>Kontak</span>
            </button>

            <button
              id="menu-btn-saved-messages"
              onClick={() => { onClose(); onOpenSavedMessages(); }}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[#202b36] transition-colors text-left text-sm text-slate-200 cursor-pointer font-medium"
            >
              <Bookmark className="w-5 h-5 text-[#7f91a4]" />
              <span>Pesan Tersimpan</span>
            </button>

            <button
              id="menu-btn-settings"
              onClick={() => { onClose(); onOpenSettings(); }}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[#202b36] transition-colors text-left text-sm text-slate-200 cursor-pointer font-medium"
            >
              <Settings className="w-5 h-5 text-[#7f91a4]" />
              <span>Pengaturan</span>
            </button>
          </div>

          <div className="h-[1px] bg-[#101921] my-2" />

          {/* Section 3: Undang Teman, Fitur Telegram, Logout */}
          <div className="space-y-0.5 pb-4">
            <button
              id="menu-btn-invite"
              onClick={() => { onClose(); onOpenInvite(); }}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[#202b36] transition-colors text-left text-sm text-slate-200 cursor-pointer font-medium"
            >
              <UserPlus className="w-5 h-5 text-[#7f91a4]" />
              <span>Undang Teman</span>
            </button>

            {!isAppInstalled && (
              <div className="px-3.5 my-1">
                <button
                  id="menu-btn-install-apk"
                  onClick={handleInstallClick}
                  className="w-full flex items-center justify-between px-3 py-2 bg-[#1c2733] hover:bg-[#233140] border border-[#2b394a] active:scale-[0.98] transition-all rounded-xl cursor-pointer shadow-xs group text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Telegram Paper Plane Icon Logo */}
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#1E96C8] via-[#2AABEE] to-[#37AEE2] flex items-center justify-center text-white shadow-xs shrink-0">
                      <svg className="w-4 h-4 fill-current text-white -ml-0.5" viewBox="0 0 24 24">
                        <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 7.54l-2.01 9.48c-.15.68-.55.84-1.12.52l-3.08-2.27-1.48 1.43c-.16.16-.3.3-.62.3l.22-3.13 5.71-5.16c.25-.22-.05-.34-.38-.12l-7.06 4.45-3.03-.95c-.66-.21-.67-.66.14-.98l11.85-4.57c.55-.2 1.03.13.86.98z" />
                      </svg>
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-semibold text-white group-hover:text-[#5288c1] transition-colors leading-tight truncate">
                        Install Telegram
                      </h4>
                      <p className="text-[10px] text-[#7f91a4] font-normal leading-tight mt-0.5 truncate">
                        Layar Utama / Desktop
                      </p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#243242] group-hover:bg-[#2b3c50] flex items-center justify-center text-[#5288c1] transition-colors shrink-0 ml-2">
                    <Download className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>
            )}

            <button
              id="menu-btn-features"
              onClick={() => { onClose(); onOpenFeatures(); }}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[#202b36] transition-colors text-left text-sm text-slate-200 cursor-pointer font-medium"
            >
              <HelpCircle className="w-5 h-5 text-[#7f91a4]" />
              <span>Fitur Telegram</span>
            </button>

            <button
              id="menu-btn-logout"
              onClick={() => { onClose(); onLogout(); }}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-red-950/40 text-red-400 transition-colors text-left text-sm cursor-pointer mt-2 font-medium"
            >
              <LogOut className="w-5 h-5 text-red-400" />
              <span>Keluar dari Akun</span>
            </button>
          </div>

        </div>
      </div>

      {showInstallGuideModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#242b35] border border-[#333d4b] rounded-3xl p-6 max-w-sm w-full text-white shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="font-semibold text-lg text-slate-100 mb-6">Instal aplikasi</h3>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1E96C8] via-[#2AABEE] to-[#37AEE2] flex items-center justify-center shadow-lg shrink-0">
                <svg className="w-7 h-7 fill-current text-white -ml-0.5" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 7.54l-2.01 9.48c-.15.68-.55.84-1.12.52l-3.08-2.27-1.48 1.43c-.16.16-.3.3-.62.3l.22-3.13 5.71-5.16c.25-.22-.05-.34-.38-.12l-7.06 4.45-3.03-.95c-.66-.21-.67-.66.14-.98l11.85-4.57c.55-.2 1.03.13.86.98z" />
                </svg>
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-base text-white truncate">Telegram Web</h4>
                <p className="text-xs text-slate-400 truncate">{window.location.host || 'telegram-web.app'}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInstallGuideModal(false)}
                className="px-5 py-2 text-sm font-semibold text-[#5288c1] hover:bg-[#5288c1]/10 rounded-full transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                      setIsAppInstalled(true);
                    }
                    setDeferredPrompt(null);
                    setShowInstallGuideModal(false);
                  } else {
                    setShowInstallGuideModal(false);
                    alert('Tekan menu Titik Tiga (⋮) di kanan atas browser Anda lalu pilih "Tambahkan ke Layar Utama" / "Install Aplikasi" untuk memasang Telegram Web sebagai APK.');
                  }
                }}
                className="px-5 py-2 text-sm font-semibold text-[#5288c1] hover:bg-[#5288c1]/10 rounded-full transition-colors cursor-pointer"
              >
                Instal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
