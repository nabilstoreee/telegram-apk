import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, QrCode, Search, MoreVertical, Camera, 
  MessageCircle, Lock, Bell, PieChart, Zap, Folder, 
  MonitorSmartphone, Globe, Sparkles, Star, ShieldCheck, 
  Check, X, Edit2, ChevronRight, ChevronDown, Image as ImageIcon, Trash2, 
  KeyRound, Laptop, Forward, PhoneCall, Smartphone, AlertTriangle, LogOut
} from 'lucide-react';
import { User } from '../types';
import { UserAvatar } from './UserAvatar';
import { VerifiedBadge } from './VerifiedBadge';
import { compressImage } from '../utils/image';
import { MediaQualitySettingsSection } from './MediaQualitySettingsSection';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers?: User[];
  onUpdateProfile: (updatedData: Partial<User>) => Promise<void>;
  onToggleBlockUser?: (targetUserId: string, explicitBlock?: boolean) => Promise<void>;
  onOpenChatSettings?: () => void;
  onLogout?: () => void;
  onDeleteAccount?: (userId: string) => Promise<void> | void;
  onLoginSuccess?: (user: User) => void;
  onStartChatWithUsername?: (username: string) => void;
}

const PRIVACY_CONFIG: Record<string, {
  title: string;
  field: string;
  question: string;
  note: string;
  hasHideReadTime?: boolean;
  hasPremiumNote?: boolean;
}> = {
  privacy_last_seen: {
    title: 'Terakhir Terlihat & Online',
    field: 'privacyLastSeen',
    question: 'Siapa yang dapat lihat waktu terlihat saya?',
    note: 'Apabila Anda bukan pengguna Premium, Anda tidak akan dapat melihat status Terakhir Terlihat dan Online pengguna lain jika tidak membagikan milik Anda dengan mereka. Perkiraan akan ditampilkan (belakangan ini, seminggu yang lalu, sebulan yang lalu).',
    hasHideReadTime: true,
    hasPremiumNote: true,
  },
  privacy_phone: {
    title: 'Nomor Telepon',
    field: 'privacyPhone',
    question: 'Siapa yang dapat melihat nomor telepon saya?',
    note: 'Pengguna yang menyimpan nomor Anda di kontak mereka akan tetap dapat melihatnya di Telegram.',
    hasPremiumNote: false,
  },
  privacy_username: {
    title: 'Username',
    field: 'privacyUsername',
    question: 'Siapa yang dapat melihat username saya?',
    note: 'Anda dapat membatasi siapa saja yang dapat melihat username pada akun profil Anda.',
    hasPremiumNote: false,
  },
  privacy_status_view: {
    title: 'Sembunyikan Dilihat Status',
    field: 'privacyStatusView',
    question: 'Siapa yang dapat melihat saat Anda melihat status mereka?',
    note: 'Fitur khusus akun @nabilassihidiqi. Jika memilih "Tidak Ada", akun Anda tidak akan pernah muncul di daftar "Dilihat oleh Pengguna" saat Anda melihat status pengguna lain.',
    hasPremiumNote: false,
  },
  privacy_profile_photo: {
    title: 'Foto Profil',
    field: 'privacyProfilePhoto',
    question: 'Siapa yang dapat melihat foto profil saya?',
    note: 'Anda dapat membatasi siapa saja yang dapat melihat foto dan video profil utama Anda.',
    hasPremiumNote: false,
  },
  privacy_bio: {
    title: 'Bio',
    field: 'privacyBio',
    question: 'Siapa yang dapat melihat bio saya?',
    note: 'Anda dapat membatasi siapa saja yang dapat membaca bio pada akun profil Anda.',
    hasPremiumNote: false,
  },
  privacy_forwards: {
    title: 'Pesan Terusan',
    field: 'privacyForwards',
    question: 'Siapa yang dapat menautkan akun saya saat meneruskan pesan?',
    note: 'Tautan ke profil Anda tidak akan disertakan pada pesan yang Anda teruskan jika dibatasi.',
    hasPremiumNote: false,
  },
  privacy_calls: {
    title: 'Panggilan',
    field: 'privacyCalls',
    question: 'Siapa yang dapat memanggil saya?',
    note: 'Panggilan suara dan video dari pengguna yang dibatasi akan otomatis ditolak.',
    hasPremiumNote: false,
  },
  privacy_voice_messages: {
    title: 'Pesan Suara',
    field: 'privacyVoiceMessages',
    question: 'Siapa yang dapat mengirimkan pesan suara ke saya?',
    note: 'Pengguna yang tidak diizinkan tidak akan dapat mengirim voice note atau pesan video kepada Anda.',
    hasPremiumNote: true,
  },
  privacy_messaging: {
    title: 'Perpesanan',
    field: 'privacyMessaging',
    question: 'Siapa yang dapat mengirim pesan ke saya?',
    note: 'Batasi siapa yang dapat memulai percakapan pribadi baru dengan Anda.',
    hasPremiumNote: false,
  },
  privacy_birthday: {
    title: 'Tanggal Lahir',
    field: 'privacyBirthday',
    question: 'Siapa yang dapat melihat tanggal lahir saya?',
    note: 'Tanggal lahir Anda akan ditampilkan di informasi profil Anda.',
    hasPremiumNote: false,
  },
  privacy_gifts: {
    title: 'Hadiah',
    field: 'privacyGifts',
    question: 'Siapa yang dapat melihat hadiah saya?',
    note: 'Hadiah bintang dan item koleksi yang Anda terima dari pengguna lain.',
    hasPremiumNote: false,
  },
  privacy_saved_music: {
    title: 'Musik Tersimpan',
    field: 'privacySavedMusic',
    question: 'Siapa yang dapat melihat musik tersimpan saya?',
    note: 'Daftar audio dan trek musik yang Anda sematkan di profil Anda.',
    hasPremiumNote: false,
  },
  privacy_invites: {
    title: 'Undangan',
    field: 'privacyInvites',
    question: 'Siapa yang dapat menambahkan saya ke grup dan channel?',
    note: 'Anda dapat membatasi siapa saja yang dapat menambahkan Anda langsung ke grup obrolan.',
    hasPremiumNote: false,
  },
};

type SubView = 
  | 'main' 
  | 'privacy' 
  | 'privacy_last_seen' 
  | 'privacy_phone' 
  | 'privacy_profile_photo'
  | 'privacy_forwards' 
  | 'privacy_calls' 
  | 'two_step_verification'
  | 'passcode_lock'
  | 'active_devices'
  | 'account_auto_delete'
  | 'delete_account'
  | 'power_saving' | 'notifications' | 'data_and_storage' | 'proxy_settings' | 'storage_usage' | 'data_usage' | string;

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers = [],
  onUpdateProfile,
  onToggleBlockUser,
  onOpenChatSettings,
  onLogout,
  onDeleteAccount,
  onLoginSuccess,
  onStartChatWithUsername,
}) => {
  const [subView, setSubView] = useState<SubView>('main');
  const [lastPrivacySubView, setLastPrivacySubView] = useState<string>('privacy_last_seen');
  const [exceptionTarget, setExceptionTarget] = useState<{ field: string; type: 'always' | 'never'; title: string } | null>(null);
  const [selectedExceptionUserIds, setSelectedExceptionUserIds] = useState<string[]>([]);
  const [exceptionSearchQuery, setExceptionSearchQuery] = useState('');
  const [editingField, setEditingField] = useState<'name' | 'phone' | 'username' | 'bio' | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const isNabilUser = currentUser.username?.toLowerCase() === 'nabilassihidiqi';

  // Secure admin input states (Opsi C)
  const [adminInputUser, setAdminInputUser] = useState('');
  const [adminInputPass, setAdminInputPass] = useState('');

  // Admin user blocking state
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [targetUserForBlock, setTargetUserForBlock] = useState<any | null>(null);
  const [blockIsPermanent, setBlockIsPermanent] = useState(true);
  const [blockYears, setBlockYears] = useState(0);
  const [blockMonths, setBlockMonths] = useState(0);
  const [blockDays, setBlockDays] = useState(7);
  const [blockReason, setBlockReason] = useState('Nyepam berlebihan & aktivitas tidak wajar');

  // Admin user verification state
  const [targetUserForVerification, setTargetUserForVerification] = useState<any | null>(null);
  const [verifyIsVerified, setVerifyIsVerified] = useState(true);
  const [verifyBadgeColor, setVerifyBadgeColor] = useState<'blue' | 'black' | 'green'>('blue');
  const [verifyDuration, setVerifyDuration] = useState<'1d' | '1w' | '1m' | '1y' | '2y' | 'permanent'>('permanent');

  useEffect(() => {
    if (subView === 'admin_panel' && currentUser.id === 'user-admin-nabil') {
      fetchAdminUsers();
    }
    if (subView === 'privacy_username' && !isNabilUser) {
      setSubView('privacy');
    }
  }, [subView, currentUser, isNabilUser]);

  const openBlockModal = (userToBlock: any) => {
    setBlockIsPermanent(false);
    setBlockYears(0);
    setBlockMonths(1);
    setBlockDays(0);
    setBlockReason('Nyepam berlebihan di chat/grup');
    setTargetUserForBlock(userToBlock);
  };

  const fetchAdminUsers = async () => {
    try {
      setAdminUsersLoading(true);
      const res = await fetch(`/api/admin/users?adminUsername=${currentUser.username}`);
      const data = await res.json();
      if (res.ok && data.users) {
        setAdminUsers(data.users);
      }
    } catch (e) {
      console.error('Failed to fetch admin users:', e);
    } finally {
      setAdminUsersLoading(false);
    }
  };

  const handleBlockUserAction = async () => {
    if (!targetUserForBlock) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUsername: currentUser.username,
          targetUserId: targetUserForBlock.id,
          isPermanent: blockIsPermanent,
          years: blockYears,
          months: blockMonths,
          days: blockDays,
          reason: blockReason
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memblokir pengguna');
      setActiveAlert(data.message || `Pengguna @${targetUserForBlock.username} berhasil diblokir.`);
      setTargetUserForBlock(null);
      fetchAdminUsers();
    } catch (err: any) {
      setActiveAlert(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockUserAction = async (targetUserId: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUsername: currentUser.username,
          targetUserId
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuka blokir');
      setActiveAlert(data.message || 'Blokir berhasil dicabut.');
      fetchAdminUsers();
    } catch (err: any) {
      setActiveAlert(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVerificationAction = async () => {
    if (!targetUserForVerification) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users/grant-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUsername: currentUser.username,
          targetUserId: targetUserForVerification.id,
          isVerified: verifyIsVerified,
          badgeColor: verifyBadgeColor,
          duration: verifyDuration
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui verifikasi');
      setActiveAlert(data.message || 'Verifikasi berhasil diperbarui.');
      setTargetUserForVerification(null);
      fetchAdminUsers();
    } catch (err: any) {
      setActiveAlert(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  // Delete account & Top options menu state
  const [showTopMenu, setShowTopMenu] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Ingin istirahat sejenak dari Telegram');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // 2FA local state
  const [twoFaPassword, setTwoFaPassword] = useState('');
  const [twoFaHint, setTwoFaHint] = useState('');
  const [show2FaForm, setShow2FaForm] = useState(false);

  // Passcode local state
  const [passcodePinInput, setPasscodePinInput] = useState('');
  const [showPasscodeForm, setShowPasscodeForm] = useState(false);
  const [expandedSticker, setExpandedSticker] = useState(true);
  const [expandedEmoji, setExpandedEmoji] = useState(true);
  const [expandedEffect, setExpandedEffect] = useState(true);
  const [showLessDataCallsPopup, setShowLessDataCallsPopup] = useState(false);
  const [dataUsageTab, setDataUsageTab] = useState<'Semua' | 'Ponsel' | 'Wi-Fi' | 'Roaming'>('Semua');
  const [expandedDataCategories, setExpandedDataCategories] = useState<Record<string, boolean>>({});
  const [showResetDataConfirm, setShowResetDataConfirm] = useState(false);

  const [dataUsageStats, setDataUsageStats] = useState<Record<'Semua' | 'Ponsel' | 'Wi-Fi' | 'Roaming', {
    video: number;
    pesan: number;
    foto: number;
    dokumen: number;
    sent: number;
    received: number;
    resetDate: string;
  }>>({
    Semua: {
      video: 7434.24, // 7.26 GB
      pesan: 2406.4,  // 2.35 GB
      foto: 2027.52,  // 1.98 GB
      dokumen: 169.5, // 169.5 MB
      sent: 386.7,
      received: 11653.12, // 11.38 GB
      resetDate: '28 Jan 2026, 22:13'
    },
    Ponsel: {
      video: 7410.34,
      pesan: 2330.5,
      foto: 1990.52,
      dokumen: 167.4,
      sent: 377.5,
      received: 11523.62,
      resetDate: '28 Jan 2026, 22:13'
    },
    'Wi-Fi': {
      video: 23.9,
      pesan: 75.9,
      foto: 37.0,
      dokumen: 2.1,
      sent: 9.2,
      received: 129.5,
      resetDate: '28 Jan 2026, 22:13'
    },
    Roaming: {
      video: 0,
      pesan: 0,
      foto: 0,
      dokumen: 0,
      sent: 0,
      received: 0,
      resetDate: '28 Jan 2026, 22:13'
    }
  });

  const [cacheSizes, setCacheSizes] = useState<Record<string, number>>({
    sticker: 51.9,
    photo: 29.8,
    video: 21.1,
    profile: 10.7,
    other: 0.77
  });
  const [storageItems, setStorageItems] = useState<Record<string, boolean>>({
    sticker: true,
    photo: true,
    video: true,
    profile: true,
    other: true
  });
  const [showCachePopup, setShowCachePopup] = useState<'private' | 'groups' | 'channels' | 'stories' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPrivacyLastSeen = currentUser.privacyLastSeen || 'everybody';
  const currentPrivacyPhone = currentUser.privacyPhone || 'everybody';
  const currentPrivacyProfilePhoto = currentUser.privacyProfilePhoto || 'everybody';
  const currentPrivacyForwards = currentUser.privacyForwards || 'everybody';
  const currentPrivacyCalls = currentUser.privacyCalls || 'everybody';
  const is2FaActive = currentUser.twoStepVerification ?? false;
  const isPasscodeActive = currentUser.passcodeLock ?? false;
  const autoDeleteMonths = currentUser.accountAutoDeleteMonths || 6;

  const isBatterySaver = currentUser.batterySaver ?? false;
  const isAutoDownload = currentUser.autoDownloadMedia ?? true;
  const isAnimationsOn = currentUser.uiAnimations ?? true;

  const startEditing = (field: 'name' | 'phone' | 'username' | 'bio') => {
    setEditingField(field);
    if (field === 'name') setTempValue(currentUser.name);
    else if (field === 'phone') setTempValue(currentUser.phone || '');
    else if (field === 'username') setTempValue(currentUser.username || '');
    else if (field === 'bio') setTempValue(currentUser.bio || '');
  };

  const saveEditing = async () => {
    if (!editingField) return;
    setLoading(true);
    try {
      if (editingField === 'name') {
        await onUpdateProfile({ name: tempValue });
      } else if (editingField === 'phone') {
        await onUpdateProfile({ phone: tempValue });
      } else if (editingField === 'username') {
        await onUpdateProfile({ username: tempValue.replace(/^@/, '') });
      } else if (editingField === 'bio') {
        await onUpdateProfile({ bio: tempValue });
      }
      setEditingField(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrivacy = async (
    field: string, 
    value: any
  ) => {
    setLoading(true);
    try {
      await onUpdateProfile({ [field]: value });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePreference = async (field: 'batterySaver' | 'autoDownloadMedia' | 'uiAnimations', val: boolean) => {
    setLoading(true);
    try {
      await onUpdateProfile({ [field]: val });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Handle local image file upload directly from device gallery
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setActiveAlert('Harap pilih file gambar (JPG, PNG, WebP, dll).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      if (base64Data) {
        setLoading(true);
        try {
          const optimizedBase64 = await compressImage(base64Data);
          await onUpdateProfile({ avatar: optimizedBase64 });
          setShowPhotoPicker(false);
        } catch (error) {
          console.error(error);
          setActiveAlert('Gagal memperbarui foto profil.');
        } finally {
          setLoading(false);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = async () => {
    setLoading(true);
    try {
      await onUpdateProfile({ avatar: '' });
      setShowPhotoPicker(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPhotoSelector = () => {
    if (currentUser.avatar) {
      setShowPhotoPicker(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const getPrivacyLabel = (val: 'everybody' | 'contacts' | 'nobody') => {
    if (val === 'everybody') return 'Semua Orang';
    if (val === 'contacts') return 'Kontak Saya';
    return 'Tidak Ada';
  };

  const handleOpenExceptionPicker = (field: string, type: 'always' | 'never', title: string) => {
    const currentEx = currentUser.privacyExceptions || {};
    const fieldEx = currentEx[field] || currentEx[subView] || {};
    const currentList = fieldEx[type] || [];
    setExceptionTarget({ field, type, title });
    setSelectedExceptionUserIds([...currentList]);
    setExceptionSearchQuery('');
    setLastPrivacySubView(subView);
    setSubView('privacy_exception_picker');
  };

  const handleSaveExceptions = async () => {
    if (!exceptionTarget) return;
    const currentEx = currentUser.privacyExceptions || {};
    const fieldEx = currentEx[exceptionTarget.field] || (lastPrivacySubView ? currentEx[lastPrivacySubView] : {}) || {};
    const updatedFieldEx = {
      ...fieldEx,
      [exceptionTarget.type]: selectedExceptionUserIds,
    };
    const updatedExceptions = {
      ...currentEx,
      [exceptionTarget.field]: updatedFieldEx,
    };
    if (lastPrivacySubView) {
      updatedExceptions[lastPrivacySubView] = updatedFieldEx;
    }

    setLoading(true);
    try {
      await onUpdateProfile({ privacyExceptions: updatedExceptions });
      setActiveAlert('Pengecualian berhasil diperbarui.');
      setSubView(lastPrivacySubView as SubView || 'privacy');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (subView === 'privacy_exception_picker') {
      setSubView(lastPrivacySubView || 'privacy');
    } else if (
      subView.startsWith('privacy_') || 
      subView === 'two_step_verification' ||
      subView === 'auto_delete_messages' ||
      subView === 'passcode_lock' ||
      subView === 'active_devices' ||
      subView === 'account_auto_delete' ||
      subView === 'map_provider' ||
      subView === 'login_email' ||
      subView === 'blocked_users' ||
      subView === 'bot_biometrics'
    ) {
      setSubView('privacy');
    } else if (subView === 'proxy_settings' || subView === 'storage_usage' || subView === 'data_usage') {
      setSubView('data_and_storage');
    } else if (subView === 'privacy' || subView === 'power_saving' || subView === 'notifications' || subView === 'data_and_storage' || subView === 'admin_panel') {
      setSubView('main');
    } else {
      onClose();
    }
  };

  // Listen for Escape key to go back or close profile modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, subView, lastPrivacySubView]);

  const handleSave2Fa = async () => {
    if (!twoFaPassword.trim()) {
      setActiveAlert('Silakan masukkan kata sandi untuk Verifikasi 2 Langkah.');
      return;
    }
    setLoading(true);
    try {
      await onUpdateProfile({ twoStepVerification: true });
      setShow2FaForm(false);
      setTwoFaPassword('');
      setActiveAlert('Verifikasi 2 Langkah berhasil diaktifkan!');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2Fa = async () => {
    setLoading(true);
    try {
      await onUpdateProfile({ twoStepVerification: false });
      setActiveAlert('Verifikasi 2 Langkah telah dinonaktifkan.');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePasscode = async () => {
    if (passcodePinInput.length < 4) {
      setActiveAlert('PIN harus berisi minimal 4 digit angka.');
      return;
    }
    setLoading(true);
    try {
      await onUpdateProfile({ passcodeLock: true, passcodePin: passcodePinInput });
      setShowPasscodeForm(false);
      setPasscodePinInput('');
      setActiveAlert('Kunci Kode Sandi berhasil diaktifkan!');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDisablePasscode = async () => {
    setLoading(true);
    try {
      await onUpdateProfile({ passcodeLock: false, passcodePin: '' });
      setActiveAlert('Kunci Kode Sandi telah dinonaktifkan.');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSetAutoDelete = async (months: number) => {
    setLoading(true);
    try {
      await onUpdateProfile({ accountAutoDeleteMonths: months });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      if (onDeleteAccount) {
        await onDeleteAccount(currentUser.id);
      } else {
        const res = await fetch('/api/users/account', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        if (res.ok) {
          localStorage.removeItem('tg_current_user_id');
          window.location.reload();
        }
      }
      setShowDeleteConfirmModal(false);
      onClose();
    } catch (err) {
      console.error('Delete account failed:', err);
      setActiveAlert('Gagal menghapus akun. Silakan coba beberapa saat lagi.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      id="profile-view-overlay" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-150"
    >
      {/* Hidden file input for device photo selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div 
        id="telegram-profile-screen" 
        className="w-full h-full md:h-[92vh] md:max-w-md bg-[#0e1621] md:rounded-2xl md:border md:border-[#242f3d] shadow-2xl overflow-hidden flex flex-col text-slate-100 font-sans select-none"
      >
        
        {/* Top App Bar */}
        <div className="h-14 bg-[#0e1621] flex items-center justify-between px-3 md:px-4 z-20 shrink-0 border-b border-[#17212b]/60">
          <div className="flex items-center gap-3">
            <button
              id="profile-back-btn"
              onClick={handleBack}
              className="p-2 text-slate-300 hover:text-white rounded-full hover:bg-[#17212b] transition-colors cursor-pointer"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {subView !== 'main' && (
              <div className="flex flex-col">
                <h2 className="text-base font-bold text-white">
                  {subView === 'privacy' && 'Privasi dan Keamanan'}
                  {subView === 'privacy_exception_picker' && (exceptionTarget?.title || 'Pengecualian')}
                  {subView === 'privacy_last_seen' && 'Terakhir Terlihat & Online'}
                  {subView === 'privacy_phone' && 'Nomor Telepon'}
                  {subView === 'privacy_profile_photo' && 'Foto Profil'}
                  {subView === 'privacy_forwards' && 'Pesan Terusan'}
                  {subView === 'privacy_calls' && 'Panggilan'}
                  {subView === 'privacy_voice_messages' && 'Pesan Suara'}
                  {subView === 'privacy_messaging' && 'Perpesanan'}
                  {subView === 'privacy_birthday' && 'Tanggal Lahir'}
                  {subView === 'privacy_gifts' && 'Hadiah'}
                  {subView === 'privacy_bio' && 'Bio'}
                  {subView === 'privacy_saved_music' && 'Musik Tersimpan'}
                  {subView === 'privacy_invites' && 'Undangan'}
                  {subView === 'two_step_verification' && 'Verifikasi 2 Langkah'}
                  {subView === 'auto_delete_messages' && 'Hapus Pesan Otomatis'}
                  {subView === 'passcode_lock' && 'Kunci Kode Sandi'}
                  {subView === 'active_devices' && 'Perangkat'}
                  {subView === 'account_auto_delete' && 'Hapus Akun Otomatis'}
                  {subView === 'map_provider' && 'Penyedia Tampilan Peta'}
                  {subView === 'login_email' && 'Surel untuk Masuk'}
                  {subView === 'blocked_users' && 'Daftar Blokir'}
                  {subView === 'bot_biometrics' && 'Bot dengan akses biometrik'}
                  {subView === 'power_saving' && 'Hemat Baterai & Data'}
                  {subView === 'notifications' && 'Notifikasi dan Suara'}
                  {subView === 'data_and_storage' && 'Data dan Penyimpanan'}
                  {subView === 'proxy_settings' && 'Pengaturan Proxy'}
                  {subView === 'storage_usage' && 'Pemakaian Penyimpanan'}
                  {subView === 'data_usage' && 'Penggunaan Data'}
                  {subView === 'admin_panel' && 'Akses Admin & Pengaturan Khusus'}
                  {subView === 'delete_account' && 'Hapus Akun Saya'}
                </h2>
                {subView === 'privacy_exception_picker' && (
                  <span className="text-xs text-[#7f91a4]">
                    {selectedExceptionUserIds.length > 0
                      ? `${selectedExceptionUserIds.length} pengguna dipilih`
                      : 'Pilih pengguna atau kontak'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right Action Button for Privacy & Exception Picker */}
          {subView.startsWith('privacy_') && subView !== 'privacy' && subView !== 'privacy_exception_picker' && (
            <button
              onClick={() => {
                setActiveAlert('Pengaturan privasi tersimpan.');
                setSubView('privacy');
              }}
              className="p-2 text-[#5288c1] hover:text-white rounded-full hover:bg-[#17212b] transition-colors cursor-pointer"
              title="Terapkan"
            >
              <Check className="w-5 h-5" />
            </button>
          )}

          {subView === 'privacy_exception_picker' && (
            <button
              onClick={handleSaveExceptions}
              disabled={loading}
              className="p-2 text-[#5288c1] hover:text-white rounded-full hover:bg-[#17212b] transition-colors cursor-pointer"
              title="Simpan Pengecualian"
            >
              <Check className="w-5 h-5" />
            </button>
          )}

          {subView === 'main' && (
            <div className="relative flex items-center gap-1">
              <button
                onClick={() => setActiveAlert(`Kode QR untuk @${currentUser.username}\nPindai untuk memulai obrolan langsung di Telegram.`)}
                className="p-2 text-slate-300 hover:text-white rounded-full hover:bg-[#17212b] transition-colors cursor-pointer"
                title="Kode QR"
              >
                <QrCode className="w-5 h-5" />
              </button>

              <button
                onClick={() => setActiveAlert('Pencarian di Pengaturan Telegram')}
                className="p-2 text-slate-300 hover:text-white rounded-full hover:bg-[#17212b] transition-colors cursor-pointer"
                title="Cari"
              >
                <Search className="w-5 h-5" />
              </button>

              <div className="relative">
                <button
                  id="profile-more-menu-btn"
                  onClick={() => setShowTopMenu((prev) => !prev)}
                  className="p-2 text-slate-300 hover:text-white rounded-full hover:bg-[#17212b] transition-colors cursor-pointer"
                  title="Lainnya"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {showTopMenu && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-[#17212b] border border-[#242f3d] rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95">
                    {onLogout && (
                      <button
                        onClick={() => {
                          setShowTopMenu(false);
                          onClose();
                          onLogout();
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-[#242f3d]/70 flex items-center gap-3 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-slate-400" />
                        <span>Keluar</span>
                      </button>
                    )}
                    <button
                      id="menu-popup-delete-account"
                      onClick={() => {
                        setShowTopMenu(false);
                        setSubView('delete_account');
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span>Hapus Akun Permanen</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                id="profile-close-btn"
                onClick={onClose}
                className="p-2 text-slate-300 hover:text-white rounded-full hover:bg-[#17212b] transition-colors cursor-pointer ml-1"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Body Content */}
        <div id="profile-scroll-area" className="flex-1 overflow-y-auto custom-scrollbar">
          
          {/* VIEW: MAIN PROFILE & SETTINGS */}
          {subView === 'main' && (
            <>
              {/* Hero Profile Header (Photo, Name, Online Status & FAB Camera) */}
              <div className="bg-[#0e1621] pt-2 pb-6 px-6 relative flex flex-col items-center border-b border-[#17212b]">
                
                {/* Center Avatar */}
                <div 
                  onClick={handleOpenPhotoSelector}
                  className="relative cursor-pointer group mb-3.5"
                  title="Ketuk untuk mengganti foto profil"
                >
                  <UserAvatar
                    name={currentUser.name}
                    username={currentUser.username}
                    avatar={currentUser.avatar}
                    color={currentUser.color || '#5288c1'}
                    size="2xl"
                    statusEmoji={currentUser.statusEmoji}
                    className="group-hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-7 h-7 text-white/90" />
                  </div>
                </div>

                {/* Name with Optional Verified / Status Emoji */}
                <div 
                  onClick={() => startEditing('name')}
                  className="relative flex items-center justify-center gap-1.5 cursor-pointer group hover:bg-[#17212b]/60 pl-6 pr-6 py-1 rounded-xl transition-colors max-w-full"
                >
                  <h2 className="text-xl font-bold text-white tracking-wide truncate max-w-[280px] text-center">
                    {currentUser.name}
                  </h2>
                  {currentUser.statusEmoji && (
                    <span className="text-lg shrink-0">{currentUser.statusEmoji}</span>
                  )}
                  <div className="shrink-0">
                    <VerifiedBadge isVerified={currentUser.isVerified} badgeColor={currentUser.badgeColor} size="md" />
                  </div>
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Edit2 className="w-3.5 h-3.5 text-[#7f91a4]" />
                  </div>
                </div>

                {/* Online Status */}
                <span className="text-xs text-[#7f91a4] mt-0.5 font-medium">
                  online
                </span>

                {/* Floating Action Button (Camera for setting profile photo) */}
                <button
                  id="fab-change-photo-btn"
                  onClick={handleOpenPhotoSelector}
                  className="absolute right-5 bottom-4 w-12 h-12 rounded-full bg-[#5288c1] hover:bg-[#437ca8] text-white flex items-center justify-center shadow-lg shadow-[#5288c1]/30 transition-transform active:scale-95 cursor-pointer border border-[#6ba4e2]/30"
                  title="Pilih Foto Profil dari Galeri"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              {/* Section: Akun */}
              <div className="pt-3 bg-[#0e1621]">
                <div className="px-5 py-2">
                  <span className="text-xs font-bold text-[#5288c1] tracking-wide">Akun</span>
                </div>

                <div className="divide-y divide-[#17212b]/80">
                  {/* Phone */}
                  <div
                    id="profile-phone-row"
                    onClick={() => startEditing('phone')}
                    className="px-5 py-3 hover:bg-[#17212b] transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-white tracking-wide">
                      {currentUser.phone || '+62 858 85773612'}
                    </div>
                    <div className="text-xs text-[#7f91a4] mt-0.5">
                      Ketuk untuk ganti nomor telepon.
                    </div>
                  </div>

                  {/* Username */}
                  <div
                    id="profile-username-row"
                    onClick={() => startEditing('username')}
                    className="px-5 py-3 hover:bg-[#17212b] transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-white">
                      @{currentUser.username}
                    </div>
                    <div className="text-xs text-[#7f91a4] mt-0.5">
                      Username
                    </div>
                  </div>

                  {/* Bio */}
                  <div
                    id="profile-bio-row"
                    onClick={() => startEditing('bio')}
                    className="px-5 py-3 hover:bg-[#17212b] transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-medium text-white break-words">
                      {currentUser.bio || 'Tambahkan beberapa kata tentang diri Anda.'}
                    </div>
                    <div className="text-xs text-[#7f91a4] mt-0.5">
                      Bio
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider between sections */}
              <div className="h-2.5 bg-[#17212b]/50 border-y border-[#17212b]" />

              {/* Section: Pengaturan */}
              <div className="py-2 bg-[#0e1621]">
                <div className="px-5 py-2">
                  <span className="text-xs font-bold text-[#5288c1] tracking-wide">Pengaturan</span>
                </div>

                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      if (onOpenChatSettings) {
                        onClose();
                        onOpenChatSettings();
                      } else {
                        setActiveAlert('Pengaturan Obrolan: Ukuran teks, latar wallpaper obrolan, sudut pesan, dan tema.');
                      }
                    }}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#17212b] transition-colors text-left text-sm text-slate-100 cursor-pointer"
                  >
                    <div className="flex items-center gap-5">
                      <MessageCircle className="w-5 h-5 text-[#7f91a4]" />
                      <span className="font-medium">Pengaturan Obrolan</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7f91a4]" />
                  </button>

                  <button
                    id="menu-privacy-settings-btn"
                    onClick={() => setSubView('privacy')}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#17212b] transition-colors text-left text-sm text-slate-100 cursor-pointer"
                  >
                    <div className="flex items-center gap-5">
                      <Lock className="w-5 h-5 text-[#7f91a4]" />
                      <span className="font-medium">Privasi dan Keamanan</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7f91a4]" />
                  </button>

                  <button
                    id="menu-power-saving-btn"
                    onClick={() => setSubView('power_saving')}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#17212b] transition-colors text-left text-sm text-slate-100 cursor-pointer"
                  >
                    <div className="flex items-center gap-5">
                      <Zap className="w-5 h-5 text-[#7f91a4]" />
                      <span className="font-medium">Hemat Baterai & Data</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7f91a4]" />
                  </button>

                  <button
                    onClick={() => setActiveAlert('Bahasa: Pengaturan bahasa.')}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#17212b] transition-colors text-left text-sm text-slate-100 cursor-pointer"
                  >
                    <div className="flex items-center gap-5">
                      <Globe className="w-5 h-5 text-[#7f91a4]" />
                      <span className="font-medium">Bahasa</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7f91a4]" />
                  </button>

                  {currentUser.id === 'user-admin-nabil' && (
                    <button
                      id="menu-admin-access-btn"
                      onClick={() => setSubView('admin_panel')}
                      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#17212b] transition-colors text-left text-sm text-slate-100 cursor-pointer group"
                    >
                      <div className="flex items-center gap-5">
                        <ShieldCheck className="w-5 h-5 text-[#5288c1] group-hover:scale-110 transition-transform" />
                        <div>
                          <span className="font-medium text-[#5288c1]">Akses Admin / Moderasi</span>
                          <div className="text-[11px] text-[#7f91a4]">
                            Kelola sistem & moderasi pengguna
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#7f91a4]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-2.5 bg-[#17212b]/50 border-y border-[#17212b]" />

              {/* Section: Premium & Stars */}
              <div className="py-2 bg-[#0e1621] space-y-0.5">
                <button
                  onClick={() => setActiveAlert('telegram_premium')}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#17212b] transition-colors text-left text-sm text-slate-100 cursor-pointer group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-5 h-5 flex items-center justify-center text-purple-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="font-medium group-hover:text-purple-300 transition-colors">Telegram Premium</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#7f91a4]" />
                </button>

                <button
                  onClick={() => setActiveAlert('Stars Saya: Beli dan kirim bintang Telegram untuk mendukung channel atau membeli konten digital.')}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#17212b] transition-colors text-left text-sm text-slate-100 cursor-pointer group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-5 h-5 flex items-center justify-center text-amber-400">
                      <Star className="w-5 h-5 fill-amber-400" />
                    </div>
                    <span className="font-medium group-hover:text-amber-300 transition-colors">Stars Saya</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#7f91a4]" />
                </button>
              </div>

              {/* Footer Build Tag */}
              <div className="py-6 px-4 text-center">
                <p className="text-[11px] text-[#7f91a4] font-medium">
                  Telegram untuk Web v12.3.1 (6385) store bundled arm64-v8a
                </p>
              </div>
            </>
          )}

          
          {/* VIEW: PRIVASI DAN KEAMANAN (MAIN PRIVACY & SECURITY LIST) */}
          {subView === 'privacy' && (
            <div className="py-3 bg-[#0e1621] space-y-4 h-full overflow-y-auto custom-scrollbar">
              
              {/* KEAMANAN */}
              <div>
                <div className="px-5 py-2">
                  <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Keamanan</span>
                </div>
                <div className="divide-y divide-[#242f3d]/50 bg-[#17212b] border-y border-[#242f3d]/50">
                  <button onClick={() => setSubView('auto_delete_messages')} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#242f3d]/50 transition-colors text-left text-[15px] text-white">
                    <span>Hapus Pesan Otomatis</span>
                    <span className="text-[#5288c1]">{currentUser.autoDeleteMessagesTimer ? currentUser.autoDeleteMessagesTimer + ' Detik' : 'Mati'}</span>
                  </button>
                  <button onClick={() => { setTempValue(currentUser.loginEmail || ""); setSubView('login_email'); }} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#242f3d]/50 transition-colors text-left text-[15px] text-white">
                    <span>Surel untuk Masuk</span>
                    <span className="text-[#5288c1] max-w-[150px] truncate">{currentUser.loginEmail || 'nabil...y@gmail.com'}</span>
                  </button>
                  <button onClick={() => setSubView('blocked_users')} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#242f3d]/50 transition-colors text-left text-[15px] text-white">
                    <span>Daftar Blokir</span>
                    <span className="text-[#5288c1]">{currentUser.blockedUsers?.length || 0}</span>
                  </button>
                </div>
              </div>

              {/* PRIVASI */}
              <div>
                <div className="px-5 py-2">
                  <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Privasi</span>
                </div>
                <div className="divide-y divide-[#242f3d]/50 bg-[#17212b] border-y border-[#242f3d]/50">
                  {[
                    { id: 'privacy_phone', label: 'Nomor Telepon', val: currentUser.privacyPhone },
                    ...(isNabilUser ? [{ id: 'privacy_username', label: 'Username', val: currentUser.privacyUsername }] : []),
                    { id: 'privacy_last_seen', label: 'Terakhir Terlihat & Online', val: currentUser.privacyLastSeen },
                    ...(isNabilUser ? [{ id: 'privacy_status_view', label: 'Sembunyikan Dilihat Status', val: currentUser.privacyStatusView }] : []),
                    { id: 'privacy_profile_photo', label: 'Foto Profil', val: currentUser.privacyProfilePhoto },
                    { id: 'privacy_forwards', label: 'Pesan Terusan', val: currentUser.privacyForwards },
                    { id: 'privacy_bio', label: 'Bio', val: currentUser.privacyBio },
                  ].map((item) => (
                    <button key={item.id} onClick={() => setSubView(item.id as any)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#242f3d]/50 transition-colors text-left text-[15px] text-white">
                      <span>{item.label}</span>
                      <span className="text-[#5288c1]">{getPrivacyLabel(item.val || 'everybody')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* OBROLAN BARU DARI PENGGUNA TAK DIKENAL */}
              <div>
                <div className="px-5 py-2">
                  <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Obrolan baru dari pengguna tak dikenal</span>
                </div>
                <div className="divide-y divide-[#242f3d]/50 bg-[#17212b] border-y border-[#242f3d]/50">
                  <div onClick={() => handleUpdatePrivacy('archiveAndMuteUnknown', !currentUser.archiveAndMuteUnknown)} className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                    <span className="text-[15px] text-white">Arsip & Senyapkan</span>
                    <button
                      className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.archiveAndMuteUnknown ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.archiveAndMuteUnknown ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
                <div className="px-5 py-2">
                  <p className="text-[13px] text-[#7f91a4] leading-relaxed">Menyembunyikan obrolan, grup dan channel dari non kontak ke arsip dan senyapkan secara otomatis.</p>
                </div>
              </div>

              {/* HAPUS AKUN SAYA */}
              <div className="pb-8">
                <div className="px-5 py-2">
                  <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Hapus akun saya</span>
                </div>
                <div className="divide-y divide-[#242f3d]/50 bg-[#17212b] border-y border-[#242f3d]/50">
                  <button onClick={() => setSubView('account_auto_delete')} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#242f3d]/50 transition-colors text-left text-[15px] text-white">
                    <span>Jika tidak aktif selama</span>
                    <span className="text-[#5288c1]">{currentUser.accountAutoDeleteMonths || 18} bulan</span>
                  </button>
                  <button onClick={() => setSubView('delete_account')} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#242f3d]/50 transition-colors text-left text-[15px] text-[#e53935] group">
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-4 h-4 text-[#e53935]" />
                      <span className="font-medium">Hapus Akun Sekarang Secara Permanen</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#e53935]/70" />
                  </button>
                </div>
                <div className="px-5 py-2">
                  <p className="text-[13px] text-[#7f91a4] leading-relaxed">Jika Anda menghapus akun atau tidak aktif dalam periode ini, seluruh riwayat obrolan, kontak, dan pesan tersimpan akan dihapus permanen.</p>
                </div>
              </div>

            </div>
          )}

          {/* DYNAMIC PRIVACY SUBVIEWS */}
          {subView.startsWith('privacy_') && subView !== 'privacy' && subView !== 'privacy_exception_picker' && (() => {
            const config = PRIVACY_CONFIG[subView] || {
              title: 'Privasi',
              field: subView.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
              question: 'Siapa yang bisa melihat ini?',
              note: 'Ubah pengaturan ini untuk membatasi siapa yang bisa berinteraksi dan melihat info privasi Anda.',
              hasHideReadTime: false,
              hasPremiumNote: false,
            };

            const currentValue = ((currentUser as any)[config.field] as 'everybody' | 'contacts' | 'nobody') || 'everybody';
            const currentExceptions = currentUser.privacyExceptions?.[config.field] || currentUser.privacyExceptions?.[subView] || {};
            const alwaysUsers = currentExceptions.always || [];
            const neverUsers = currentExceptions.never || [];

            return (
              <div className="py-3 bg-[#0e1621] space-y-4 h-full overflow-y-auto custom-scrollbar pb-10">
                {/* 1. Main Radio Selection Section */}
                <div>
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">
                      {config.question}
                    </span>
                  </div>
                  <div className="bg-[#17212b] divide-y divide-[#242f3d]/60 border-y border-[#242f3d]">
                    {(['everybody', 'contacts', 'nobody'] as const).map((opt) => {
                      const isSelected = currentValue === opt;
                      return (
                        <div
                          key={opt}
                          onClick={() => handleUpdatePrivacy(config.field, opt)}
                          className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/60 transition-colors"
                        >
                          <span className="text-[15px] text-white">
                            {getPrivacyLabel(opt)}
                          </span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {config.note && (
                    <div className="px-5 py-2.5">
                      <p className="text-[13px] text-[#7f91a4] leading-relaxed">
                        {config.note}
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Tambahkan pengecualian Section */}
                <div>
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">
                      Tambahkan pengecualian
                    </span>
                  </div>
                  <div className="bg-[#17212b] divide-y divide-[#242f3d]/60 border-y border-[#242f3d]">
                    {/* When 'everybody': show 'Jangan Bagikan Dengan' */}
                    {currentValue === 'everybody' && (
                      <div
                        onClick={() => handleOpenExceptionPicker(config.field, 'never', 'Jangan Bagikan Dengan')}
                        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/60 transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-[15px] text-white">Jangan Bagikan Dengan</span>
                          {neverUsers.length > 0 && (
                            <span className="text-[12px] text-[#7f91a4] truncate max-w-[220px]">
                              {(allUsers || []).filter(u => neverUsers.includes(u.id)).map(u => u.name).join(', ') || `${neverUsers.length} pengguna`}
                            </span>
                          )}
                        </div>
                        <span className="text-[14px] text-[#5288c1] font-medium shrink-0">
                          {neverUsers.length > 0 ? `${neverUsers.length} pengguna` : 'Tambahkan Pengguna'}
                        </span>
                      </div>
                    )}

                    {/* When 'contacts': show 'Selalu Berbagi Dengan' AND 'Jangan Bagikan Dengan' */}
                    {currentValue === 'contacts' && (
                      <>
                        <div
                          onClick={() => handleOpenExceptionPicker(config.field, 'always', 'Selalu Berbagi Dengan')}
                          className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/60 transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="text-[15px] text-white">Selalu Berbagi Dengan</span>
                            {alwaysUsers.length > 0 && (
                              <span className="text-[12px] text-[#7f91a4] truncate max-w-[220px]">
                                {(allUsers || []).filter(u => alwaysUsers.includes(u.id)).map(u => u.name).join(', ') || `${alwaysUsers.length} pengguna`}
                              </span>
                            )}
                          </div>
                          <span className="text-[14px] text-[#5288c1] font-medium shrink-0">
                            {alwaysUsers.length > 0 ? `${alwaysUsers.length} pengguna` : 'Tambahkan Pengguna'}
                          </span>
                        </div>
                        <div
                          onClick={() => handleOpenExceptionPicker(config.field, 'never', 'Jangan Bagikan Dengan')}
                          className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/60 transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="text-[15px] text-white">Jangan Bagikan Dengan</span>
                            {neverUsers.length > 0 && (
                              <span className="text-[12px] text-[#7f91a4] truncate max-w-[220px]">
                                {(allUsers || []).filter(u => neverUsers.includes(u.id)).map(u => u.name).join(', ') || `${neverUsers.length} pengguna`}
                              </span>
                            )}
                          </div>
                          <span className="text-[14px] text-[#5288c1] font-medium shrink-0">
                            {neverUsers.length > 0 ? `${neverUsers.length} pengguna` : 'Tambahkan Pengguna'}
                          </span>
                        </div>
                      </>
                    )}

                    {/* When 'nobody': show 'Selalu Berbagi Dengan' */}
                    {currentValue === 'nobody' && (
                      <div
                        onClick={() => handleOpenExceptionPicker(config.field, 'always', 'Selalu Berbagi Dengan')}
                        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/60 transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-[15px] text-white">Selalu Berbagi Dengan</span>
                          {alwaysUsers.length > 0 && (
                            <span className="text-[12px] text-[#7f91a4] truncate max-w-[220px]">
                              {(allUsers || []).filter(u => alwaysUsers.includes(u.id)).map(u => u.name).join(', ') || `${alwaysUsers.length} pengguna`}
                            </span>
                          )}
                        </div>
                        <span className="text-[14px] text-[#5288c1] font-medium shrink-0">
                          {alwaysUsers.length > 0 ? `${alwaysUsers.length} pengguna` : 'Tambahkan Pengguna'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="px-5 py-2.5">
                    <p className="text-[13px] text-[#7f91a4] leading-relaxed">
                      Anda dapat menambahkan pengguna atau grup sebagai pengecualian yang mengabaikan pengaturan di atas.
                    </p>
                  </div>
                </div>

                {/* 3. Sembunyikan Waktu Baca (for Last Seen & other applicable) */}
                {config.hasHideReadTime && (
                  <div>
                    <div className="bg-[#17212b] border-y border-[#242f3d]">
                      <div
                        onClick={() => handleUpdatePrivacy('hideReadTime', !currentUser.hideReadTime)}
                        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/60 transition-colors"
                      >
                        <span className="text-[15px] text-white">Sembunyikan Waktu Baca</span>
                        <button
                          className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.hideReadTime ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.hideReadTime ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    <div className="px-5 py-2.5 space-y-2">
                      <p className="text-[13px] text-[#7f91a4] leading-relaxed">
                        Sembunyikan waktu Anda membaca pesan dari orang lain yang tidak dapat melihat waktu terakhir terlihat Anda. Jika aktif, waktu baca mereka juga akan disembunyikan dari Anda (kecuali jika Anda pengguna Premium).
                      </p>
                      <p className="text-[13px] text-[#7f91a4] leading-relaxed">
                        Pengaturan ini tidak memengaruhi obrolan grup.
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. Telah Berlangganan Telegram Premium */}
                {config.hasPremiumNote && (
                  <div>
                    <div className="px-5 py-2">
                      <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">
                        Telah Berlangganan Telegram Premium
                      </span>
                    </div>
                    <div className="px-5 py-2">
                      <p className="text-[13px] text-[#7f91a4] leading-relaxed">
                        Karena Anda pelanggan Telegram Premium, Anda akan melihat waktu terakhir terlihat dan waktu baca seluruh pengguna yang membagikannya dengan Anda – bahkan jika Anda menyembunyikan milik Anda.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* EXCEPTION PICKER SUBVIEW */}
          {subView === 'privacy_exception_picker' && exceptionTarget && (
            <div className="py-2 bg-[#0e1621] space-y-3 h-full flex flex-col">
              {/* Search Bar */}
              <div className="px-4 pt-1">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#7f91a4] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={exceptionSearchQuery}
                    onChange={(e) => setExceptionSearchQuery(e.target.value)}
                    placeholder="Cari pengguna atau kontak..."
                    className="w-full bg-[#17212b] text-white text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#242f3d] focus:border-[#5288c1] focus:outline-none placeholder-[#7f91a4]"
                  />
                  {exceptionSearchQuery && (
                    <button
                      onClick={() => setExceptionSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7f91a4] hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Selected Users Chips Carousel */}
              {selectedExceptionUserIds.length > 0 && (
                <div className="px-4 flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
                  {selectedExceptionUserIds.map((userId) => {
                    const u = (allUsers || []).find((user) => user.id === userId);
                    if (!u) return null;
                    return (
                      <div
                        key={userId}
                        className="flex items-center gap-1.5 bg-[#242f3d] text-white text-xs px-2.5 py-1 rounded-full shrink-0 border border-[#5288c1]/30"
                      >
                        <UserAvatar
                          name={u.name}
                          username={u.username}
                          avatar={u.avatar}
                          color={u.color || '#5288c1'}
                          size="xs"
                        />
                        <span className="max-w-[100px] truncate font-medium">{u.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExceptionUserIds((prev) => prev.filter((id) => id !== userId));
                          }}
                          className="text-[#7f91a4] hover:text-white ml-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Action Bar */}
              <div className="px-4 flex items-center justify-between text-xs">
                <span className="text-[#7f91a4] font-medium">
                  {selectedExceptionUserIds.length} pengguna dipilih
                </span>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => {
                      const selectableUsers = (allUsers || []).filter(u => u.id !== currentUser.id);
                      setSelectedExceptionUserIds(selectableUsers.map(u => u.id));
                    }}
                    className="text-[#5288c1] hover:underline font-medium cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-[#242f3d]">•</span>
                  <button
                    onClick={() => setSelectedExceptionUserIds([])}
                    className="text-[#7f91a4] hover:text-white cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                </div>
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#242f3d]/60 bg-[#17212b] border-y border-[#242f3d]">
                {(() => {
                  const selectableUsers = (allUsers || []).filter(u => u.id !== currentUser.id);
                  const filtered = selectableUsers.filter(u => 
                    u.name.toLowerCase().includes(exceptionSearchQuery.toLowerCase()) ||
                    u.username?.toLowerCase().includes(exceptionSearchQuery.toLowerCase()) ||
                    u.phone?.toLowerCase().includes(exceptionSearchQuery.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-[#7f91a4] text-sm">
                        Tidak ada pengguna yang cocok.
                      </div>
                    );
                  }

                  return filtered.map((u) => {
                    const isSelected = selectedExceptionUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedExceptionUserIds(prev => prev.filter(id => id !== u.id));
                          } else {
                            setSelectedExceptionUserIds(prev => [...prev, u.id]);
                          }
                        }}
                        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            name={u.name}
                            username={u.username}
                            avatar={u.avatar}
                            color={u.color || '#5288c1'}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">
                              {u.name}
                            </div>
                            <div className="text-xs text-[#7f91a4] truncate">
                              @{u.username} {u.phone ? `• ${u.phone}` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Checkbox indicator */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                          isSelected ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Bottom Save Button */}
              <div className="p-4 pt-2">
                <button
                  onClick={handleSaveExceptions}
                  disabled={loading}
                  className="w-full py-3 bg-[#5288c1] hover:bg-[#437ca8] text-white font-semibold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Pengecualian ({selectedExceptionUserIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {subView === 'admin_panel' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 bg-[#0e1621] text-slate-100">
              {currentUser.id !== 'user-admin-nabil' ? (
                <div className="bg-[#17212b] rounded-2xl p-5 border border-[#242f3d] shadow-lg space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#5288c1]/20 flex items-center justify-center text-[#5288c1]">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Masuk sebagai Administrator</h3>
                      <p className="text-xs text-[#7f91a4]">Silakan masukkan kredensial admin Anda</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#7f91a4] uppercase tracking-wider">Username Admin</label>
                      <input
                        type="text"
                        value={adminInputUser}
                        onChange={(e) => setAdminInputUser(e.target.value)}
                        placeholder="Masukkan username admin"
                        className="w-full bg-[#0e1621] text-white px-4 py-3 rounded-xl border border-[#242f3d] focus:border-[#5288c1] focus:outline-none text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#7f91a4] uppercase tracking-wider">Password Admin</label>
                      <input
                        type="password"
                        value={adminInputPass}
                        onChange={(e) => setAdminInputPass(e.target.value)}
                        placeholder="Masukkan password admin"
                        className="w-full bg-[#0e1621] text-white px-4 py-3 rounded-xl border border-[#242f3d] focus:border-[#5288c1] focus:outline-none text-sm mt-1"
                      />
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (!adminInputUser.trim() || !adminInputPass.trim()) {
                        setActiveAlert('Silakan isi username dan password admin!');
                        return;
                      }
                      try {
                        setLoading(true);
                        const res = await fetch('/api/auth/login', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            username: adminInputUser.trim().replace(/^@/, ''), 
                            password: adminInputPass 
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Gagal login admin');
                        if (onLoginSuccess) {
                          onLoginSuccess(data.user);
                        }
                        setActiveAlert('Berhasil masuk sebagai Administrator!');
                        setAdminInputUser('');
                        setAdminInputPass('');
                        onClose();
                      } catch (err: any) {
                        setActiveAlert(err.message || 'Kredensial admin salah atau tidak valid');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="w-full py-3.5 bg-[#5288c1] hover:bg-[#437ca8] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#5288c1]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{loading ? 'Memproses...' : 'Verifikasi & Masuk Admin'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#17212b] rounded-2xl p-5 border border-[#242f3d] shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">Status Admin: Aktif</h3>
                          <p className="text-xs text-[#7f91a4]">Masuk sebagai @{currentUser.username}</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold">Admin Utama</span>
                    </div>
                    <p className="text-xs text-[#7f91a4]">Anda memiliki otoritas penuh untuk memantau data sistem, melakukan audit keamanan, dan memoderasi pengguna.</p>
                  </div>

                  {/* Pengaturan Warna Centang Khusus Admin */}
                  <div className="bg-[#17212b] rounded-2xl p-5 border border-[#242f3d] shadow-lg space-y-4">
                    <div className="text-xs font-bold text-[#5288c1] uppercase tracking-wider">
                      Ubah Warna Centang Verifikasi Anda
                    </div>
                    <p className="text-xs text-[#7f91a4]">Pilih warna lencana centang verifikasi akun Anda yang akan terlihat oleh semua pengguna lain di sistem.</p>
                    <div className="flex gap-2.5">
                      <button
                        onClick={async () => {
                          await onUpdateProfile({ badgeColor: 'blue' });
                          setActiveAlert('Centang biru (Instagram/WhatsApp) berhasil diaktifkan!');
                        }}
                        className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          (currentUser.badgeColor || 'blue') === 'blue'
                            ? 'bg-[#0095f6]/10 border-[#0095f6] text-[#0095f6]'
                            : 'bg-transparent border-[#242f3d] text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0095f6]" />
                        Biru
                      </button>
                      <button
                        onClick={async () => {
                          await onUpdateProfile({ badgeColor: 'black' });
                          setActiveAlert('Centang hitam (X/Twitter) berhasil diaktifkan!');
                        }}
                        className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          currentUser.badgeColor === 'black'
                            ? 'bg-black/40 border-slate-500 text-white'
                            : 'bg-transparent border-[#242f3d] text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-black border border-slate-500" />
                        Hitam
                      </button>
                      <button
                        onClick={async () => {
                          await onUpdateProfile({ badgeColor: 'green' });
                          setActiveAlert('Centang hijau (WhatsApp Business) berhasil diaktifkan!');
                        }}
                        className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          currentUser.badgeColor === 'green'
                            ? 'bg-[#25d366]/10 border-[#25d366] text-[#25d366]'
                            : 'bg-transparent border-[#242f3d] text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#25d366]" />
                        Hijau
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {currentUser.id === 'user-admin-nabil' && (
                <>
                  {/* Manajemen Blokir Pengguna (Admin Only) */}
                  <div className="bg-[#17212b] rounded-2xl p-5 border border-[#242f3d] shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#5288c1] uppercase tracking-wider">Manajemen Blokir Akun Pengguna</h4>
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full font-bold">Ban / Blokir</span>
                    </div>
                    <p className="text-xs text-[#7f91a4]">Blokir pengguna secara permanen atau sementara berdasarkan durasi (hari, bulan, tahun) dengan alasan pelanggaran.</p>

                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                      {adminUsersLoading ? (
                        <div className="text-center py-6 text-xs text-[#7f91a4]">Memuat daftar pengguna...</div>
                      ) : adminUsers.filter(u => u.id !== 'user-admin-nabil').length === 0 ? (
                        <div className="text-center py-6 text-xs text-[#7f91a4]">Belum ada pengguna lain terdaftar.</div>
                      ) : (
                        adminUsers
                          .filter(u => u.id !== 'user-admin-nabil')
                      .map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0e1621] border border-[#242f3d]">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#5288c1]/20 text-[#5288c1] font-bold flex items-center justify-center shrink-0">
                              {u.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                {u.name}
                                {u.isBlocked && <span className="text-[10px] px-1.5 py-0.2 bg-red-500/20 text-red-400 rounded-md">Diblokir</span>}
                              </div>
                              <div className="text-[11px] text-[#7f91a4]">@{u.username} • {u.phone || '-'}</div>
                              {u.isBlocked && u.blockReason && (
                                <div className="text-[10px] text-red-300 mt-0.5">Alasan: {u.blockReason}</div>
                              )}
                            </div>
                          </div>
                          <div>
                            {u.isBlocked ? (
                              <button
                                onClick={() => handleUnblockUserAction(u.id)}
                                disabled={loading}
                                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                Buka Blokir
                              </button>
                            ) : (
                              <button
                                onClick={() => openBlockModal(u)}
                                disabled={loading}
                                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                Blokir Akun
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Manajemen Centang Verifikasi Akun (Admin Only) */}
              <div className="bg-[#17212b] rounded-2xl p-5 border border-[#242f3d] shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#5288c1] uppercase tracking-wider">Manajemen Centang Verifikasi Akun</h4>
                  <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-full font-bold">Verifikasi</span>
                </div>
                <p className="text-xs text-[#7f91a4]">Beri centang verifikasi kustom (biru, hitam, hijau) pada pengguna lain dengan durasi aktif terbatas (hari, minggu, bulan, tahun) atau permanen.</p>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {adminUsersLoading ? (
                    <div className="text-center py-6 text-xs text-[#7f91a4]">Memuat daftar pengguna...</div>
                  ) : adminUsers.filter(u => u.id !== 'user-admin-nabil').length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#7f91a4]">Belum ada pengguna lain terdaftar.</div>
                  ) : (
                    adminUsers
                      .filter(u => u.id !== 'user-admin-nabil')
                      .map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0e1621] border border-[#242f3d]">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#5288c1]/20 text-[#5288c1] font-bold flex items-center justify-center shrink-0">
                              {u.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                {u.name}
                                <VerifiedBadge isVerified={u.isVerified} badgeColor={u.badgeColor} size="sm" />
                              </div>
                              <div className="text-[11px] text-[#7f91a4]">
                                @{u.username} • {u.isVerified ? (
                                  u.verifiedUntil ? `Masa Aktif: s/d ${new Date(u.verifiedUntil).toLocaleDateString('id-ID')}` : 'Permanen'
                                ) : 'Belum Terverifikasi'}
                              </div>
                            </div>
                          </div>
                          <div>
                            <button
                              onClick={() => {
                                setTargetUserForVerification(u);
                                setVerifyIsVerified(u.isVerified || false);
                                setVerifyBadgeColor(u.badgeColor || 'blue');
                                setVerifyDuration('permanent');
                              }}
                              className="px-3 py-1.5 bg-[#5288c1]/10 hover:bg-[#5288c1]/20 text-[#5288c1] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Kelola Centang
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Saran 40 Fitur Admin */}
              <div className="bg-[#17212b] rounded-2xl p-5 border border-[#242f3d] shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#5288c1] uppercase tracking-wider">40 Rekomendasi Fitur Eksklusif Administrator</h4>
                  <span className="text-[10px] bg-[#5288c1]/20 text-[#5288c1] px-2.5 py-1 rounded-full font-bold">40 Fitur</span>
                </div>
                <p className="text-xs text-[#7f91a4]">Daftar lengkap 40 fitur canggih untuk pengelolaan sistem, keamanan, dan moderasi penuh oleh @nabilassihidiqi.</p>
                
                <div className="grid grid-cols-1 gap-2.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                  {[
                    { no: 1, title: 'Broadcast Global Massal', desc: 'Kirim pesan instan ke seluruh pengguna dan grup aktif sekaligus.' },
                    { no: 2, title: 'Manajemen Akun Pengguna', desc: 'Lihat daftar, edit profil, ubah nomor, atau reset kata sandi user.' },
                    { no: 3, title: 'Pemblokiran & Ban Global', desc: 'Blokir akses akun berbahaya atau spammer dari seluruh platform.' },
                    { no: 4, title: 'Hapus Akun Permanen', desc: 'Hapus data akun pengguna yang melanggar ketentuan layanan secara tuntas.' },
                    { no: 5, title: 'Audit Log & Aktivitas Sistem', desc: 'Pantau riwayat aksi admin dan log transaksi server secara real-time.' },
                    { no: 6, title: 'Diagnostik Koneksi SSE', desc: 'Cek status latensi, jumlah client terhubung, dan reconnect otomatis.' },
                    { no: 7, title: 'Backup & Restore Database', desc: 'Unduh arsip cadangan (JSON/SQL) dan pulihkan data saat darurat.' },
                    { no: 8, title: 'Reset Sesi Aktif', desc: 'Putuskan seluruh sesi aktif dari perangkat lain untuk keamanan darurat.' },
                    { no: 9, title: 'Konfigurasi Enskripsi End-to-End', desc: 'Atur protokol enkripsi tambahan untuk ruang obrolan rahasia.' },
                    { no: 10, title: 'Manajemen Badge Bintang & Verified', desc: 'Berikan atau cabut lencana terverifikasi resmi pada akun pilihan.' },
                    { no: 11, title: 'Pemberian Status Telegram Premium', desc: 'Aktifkan akses fitur premium gratis untuk pengguna istimewa.' },
                    { no: 12, title: 'Pengaturan Kuota Unggah File', desc: 'Ubah batas maksimum ukuran file media (misal: hingga 4GB).' },
                    { no: 13, title: 'Moderator Multi-Level (RBAC)', desc: 'Tunjuk sub-admin dengan hak akses terbatas sesuai departemen.' },
                    { no: 14, title: 'Pemantauan Penggunaan Storage Disk', desc: 'Analisis pemakaian penyimpanan server berdasarkan jenis media.' },
                    { no: 15, title: 'Mode Maintenance Sistem', desc: 'Aktifkan mode pemeliharaan dengan pesan kustom untuk pengguna.' },
                    { no: 16, title: 'Pengumuman Banner Pengguna', desc: 'Tampilkan banner peringatan penting di bagian atas aplikasi web.' },
                    { no: 17, title: 'Manajemen Bot & Webhook Resmi', desc: 'Daftarkan, pantau, dan uji token bot telegram langsung dari panel.' },
                    { no: 18, title: 'Moderasi Pesan Global Terpusat', desc: 'Hapus pesan ofensif atau hoaks di grup manapun secara instan.' },
                    { no: 19, title: 'Pusat Keamanan & Anti-DDoS', desc: 'Aktifkan proteksi firewall web terhadap serangan trafik abnormal.' },
                    { no: 20, title: 'Pengaturan Slogan & Tema Default', desc: 'Ubah tema warna utama dan branding default untuk semua user baru.' },
                    { no: 21, title: 'Pencarian Global Lanjutan (Deep Search)', desc: 'Cari kata kunci mencurigakan di seluruh riwayat obrolan platform.' },
                    { no: 22, title: 'Manajemen API Keys & Token', desc: 'Kelola kunci integrasi pihak ketiga (Gemini AI, Storage, dll).' },
                    { no: 23, title: 'Sistem Laporan & Ticketing Bantuan', desc: 'Tinjau dan balas laporan kendala dari pengguna aplikasi.' },
                    { no: 24, title: 'Pemantauan Memori & CPU Server', desc: 'Grafik performa penggunaan sumber daya server Cloud Run.' },
                    { no: 25, title: 'Pengaturan Auto-Purge Cache', desc: 'Bersihkan file cache lama otomatis untuk menjaga performa.' },
                    { no: 26, title: 'Penguncian Wilayah Geografis (Geo-Blocking)', desc: 'Batasi akses aplikasi berdasarkan negara atau alamat IP tertentu.' },
                    { no: 27, title: 'Verifikasi Dua Langkah Wajib (2FA)', desc: 'Paksa seluruh admin mengaktifkan autentikasi 2FA demi keamanan.' },
                    { no: 28, title: 'Analitik Statistik Harian (DAU/MAU)', desc: 'Grafik pertumbuhan jumlah pengguna aktif harian dan bulanan.' },
                    { no: 29, title: 'Pusat Unduh Laporan Audit (CSV/PDF)', desc: 'Ekspor data rekapitulasi aktivitas user untuk keperluan laporan.' },
                    { no: 30, title: 'Pengaturan Durasi Hapus Pesan Otomatis', desc: 'Tetapkan kebijakan retensi data maksimal pada server.' },
                    { no: 31, title: 'Custom Emoji & Sticker Marketplace', desc: 'Unggah dan setujui stiker atau emoji custom buatan komunitas.' },
                    { no: 32, title: 'Manajemen Channel Resmi Sistem', desc: 'Kelola channel pengumuman resmi yang otomatis diikuti user baru.' },
                    { no: 33, title: 'Simulasi Keamanan & Penetration Test', desc: 'Alat uji kerentanan keamanan internal aplikasi secara berkala.' },
                    { no: 34, title: 'Pengaturan Bahasa & Lokalisasi Default', desc: 'Atur terjemahan sistem default ke Bahasa Indonesia atau lainnya.' },
                    { no: 35, title: 'Pembersihan Database Yatim (Orphan Records)', desc: 'Hapus data pesan/file sisa yang tidak memiliki relasi user aktif.' },
                    { no: 36, title: 'Sistem Peringatan Dini (Alert Bot)', desc: 'Kirim notifikasi otomatis ke Telegram admin jika terjadi error.' },
                    { no: 37, title: 'Manajemen Domain & SSL Certificate', desc: 'Pantau masa berlaku sertifikat keamanan dan konfigurasi domain.' },
                    { no: 38, title: 'Moderasi Live Streaming & Panggilan', desc: 'Kelola atau hentikan panggilan grup/video yang melebihi kapasitas.' },
                    { no: 39, title: 'Riwayat Pembaruan Sistem (Changelog Manager)', desc: 'Publis catatan rilis versi aplikasi terbaru langsung ke beranda.' },
                    { no: 40, title: 'Mode Super Admin God-View', desc: 'Pantau aktivitas real-time lintas chat secara transparan dan aman.' },
                  ].map((item) => (
                    <div key={item.no} className="flex items-start gap-3 p-3 rounded-xl bg-[#0e1621] border border-[#242f3d] hover:border-[#5288c1]/50 transition-colors">
                      <div className="w-6 h-6 rounded-lg bg-[#5288c1]/20 text-[#5288c1] font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {item.no}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">{item.title}</h5>
                        <p className="text-[11px] text-[#7f91a4] mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

          {/* TWO STEP VERIFICATION */}
          {subView === 'two_step_verification' && (
            <div className="py-4 bg-[#0e1621] space-y-4 h-full">
              <div className="px-5">
                <span className="text-xs font-bold text-[#5288c1] tracking-wide uppercase">Kata Sandi Verifikasi 2 Langkah</span>
              </div>
              <div className="bg-[#17212b] p-5 border-y border-[#242f3d]">
                {is2FaActive ? (
                  <div className="space-y-4">
                    <p className="text-sm text-white">Verifikasi 2 Langkah saat ini aktif. Akun Anda dilindungi oleh kata sandi tambahan.</p>
                    <button onClick={handleDisable2Fa} disabled={loading} className="w-full py-3 bg-red-500/10 text-red-500 font-semibold rounded-lg hover:bg-red-500/20 transition-colors">
                      {loading ? 'Menonaktifkan...' : 'Nonaktifkan Sandi'}
                    </button>
                  </div>
                ) : show2FaForm ? (
                  <div className="space-y-4">
                    <input type="password" value={twoFaPassword} onChange={e => setTwoFaPassword(e.target.value)} placeholder="Masukkan kata sandi baru" className="w-full bg-[#0e1621] text-white px-4 py-3 rounded-lg border border-[#242f3d] focus:border-[#5288c1] focus:outline-none" />
                    <button onClick={handleSave2Fa} disabled={loading} className="w-full py-3 bg-[#5288c1] text-white font-semibold rounded-lg hover:bg-[#467ab3] transition-colors">
                      {loading ? 'Menyimpan...' : 'Simpan Sandi'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShow2FaForm(true)} className="w-full py-3 bg-[#5288c1] text-white font-semibold rounded-lg hover:bg-[#467ab3] transition-colors">
                    Atur Kata Sandi Tambahan
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PASSCODE LOCK */}
          {subView === 'passcode_lock' && (
            <div className="py-4 bg-[#0e1621] space-y-4 h-full">
              <div className="px-5">
                <span className="text-xs font-bold text-[#5288c1] tracking-wide uppercase">Kunci Aplikasi Telegram</span>
              </div>
              <div className="bg-[#17212b] p-5 border-y border-[#242f3d]">
                {isPasscodeActive ? (
                  <div className="space-y-4">
                    <p className="text-sm text-white">Kunci aplikasi (Passcode) saat ini aktif.</p>
                    <button onClick={handleDisablePasscode} disabled={loading} className="w-full py-3 bg-red-500/10 text-red-500 font-semibold rounded-lg hover:bg-red-500/20 transition-colors">
                      {loading ? 'Mematikan...' : 'Matikan Kunci Aplikasi'}
                    </button>
                  </div>
                ) : showPasscodeForm ? (
                  <div className="space-y-4">
                    <input type="password" maxLength={4} value={passcodePinInput} onChange={e => setPasscodePinInput(e.target.value)} placeholder="Masukkan 4 digit PIN baru" className="w-full bg-[#0e1621] text-white px-4 py-3 rounded-lg border border-[#242f3d] focus:border-[#5288c1] focus:outline-none tracking-widest text-center" />
                    <button onClick={handleSavePasscode} disabled={loading} className="w-full py-3 bg-[#5288c1] text-white font-semibold rounded-lg hover:bg-[#467ab3] transition-colors">
                      {loading ? 'Menyimpan...' : 'Aktifkan Kunci'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowPasscodeForm(true)} className="w-full py-3 bg-[#5288c1] text-white font-semibold rounded-lg hover:bg-[#467ab3] transition-colors">
                    Nyalakan Kunci Aplikasi
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE DEVICES */}
          {subView === 'active_devices' && (
            <div className="py-4 bg-[#0e1621] space-y-4 h-full">
              <div className="px-5">
                <span className="text-xs font-bold text-[#5288c1] tracking-wide uppercase">Sesi Saat Ini</span>
              </div>
              <div className="bg-[#17212b] px-5 py-4 border-y border-[#242f3d] flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#5288c1]/10 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-[#5288c1]" />
                </div>
                <div>
                  <div className="text-white font-semibold">Web Browser (Ponsel/PC)</div>
                  <div className="text-xs text-[#7f91a4]">Aplikasi Aktif • {new Date().toLocaleDateString('id-ID')}</div>
                </div>
              </div>
              <div className="px-5 py-2">
                <button onClick={() => setActiveAlert('Semua sesi perangkat lain telah dihentikan.')} className="w-full py-3 bg-red-500/10 text-red-500 font-semibold rounded-lg hover:bg-red-500/20 transition-colors">
                  Hentikan Semua Sesi Lainnya
                </button>
              </div>
            </div>
          )}

          {/* ACCOUNT AUTO DELETE */}
          {subView === 'account_auto_delete' && (
            <div className="py-4 bg-[#0e1621] space-y-4 h-full">
              <div className="px-5">
                <span className="text-xs font-bold text-[#5288c1] tracking-wide uppercase">Hapus Akun Jika Tidak Aktif</span>
              </div>
              <div className="bg-[#17212b] divide-y divide-[#242f3d] border-y border-[#242f3d]">
                {[1, 3, 6, 12, 18, 24].map((months) => (
                  <div
                    key={months}
                    onClick={() => handleUpdatePrivacy('accountAutoDeleteMonths', months)}
                    className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/60 transition-colors"
                  >
                    <span className="text-sm font-medium text-white">{months} bulan</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${currentUser.accountAutoDeleteMonths === months ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                      {currentUser.accountAutoDeleteMonths === months && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: HAPUS AKUN SECARA PERMANEN */}
          {subView === 'delete_account' && (
            <div className="py-4 bg-[#0e1621] space-y-4 h-full flex flex-col justify-between overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                {/* Warning Banner */}
                <div className="mx-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-red-400">Peringatan Penghapusan Akun</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Tindakan ini tidak dapat dibatalkan. Akun <strong className="text-white">@{currentUser.username}</strong> ({currentUser.phone || '+62 858 85773612'}) akan dihapus secara permanen dari server Telegram.
                    </p>
                  </div>
                </div>

                {/* Apa yang akan terjadi */}
                <div>
                  <div className="px-5 py-2">
                    <span className="text-xs font-bold text-[#5288c1] tracking-wide uppercase">Apa yang akan terjadi</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d] divide-y divide-[#242f3d]/60 text-sm">
                    <div className="px-5 py-3.5 flex items-start gap-3 text-slate-200">
                      <span className="text-base shrink-0">🗑️</span>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-white">Semua Pesan & Media Dihapus</span>
                        <p className="text-xs text-[#7f91a4] leading-relaxed">
                          Semua obrolan pribadi, berkas tersimpan, foto, video, dan riwayat panggilan Anda akan dibersihkan tanpa bisa dipulihkan.
                        </p>
                      </div>
                    </div>

                    <div className="px-5 py-3.5 flex items-start gap-3 text-slate-200">
                      <span className="text-base shrink-0">👥</span>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-white">Grup & Channel Kehilangan Kepemilikan</span>
                        <p className="text-xs text-[#7f91a4] leading-relaxed">
                          Anda akan dikeluarkan dari semua grup dan channel. Grup yang Anda buat akan tetap berjalan namun kehilangan admin utama.
                        </p>
                      </div>
                    </div>

                    <div className="px-5 py-3.5 flex items-start gap-3 text-slate-200">
                      <span className="text-base shrink-0">👤</span>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-white">Username & Nomor Telepon Dibebaskan</span>
                        <p className="text-xs text-[#7f91a4] leading-relaxed">
                          Username @{currentUser.username} dan nomor telepon Anda akan dibebaskan dan dapat didaftarkan kembali oleh siapa saja.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alasan Penghapusan (Opsional) */}
                <div>
                  <div className="px-5 py-2">
                    <span className="text-xs font-bold text-[#5288c1] tracking-wide uppercase">Alasan Menghapus Akun (Opsional)</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d] divide-y divide-[#242f3d]/60">
                    {[
                      'Ingin istirahat sejenak dari Telegram',
                      'Saya memiliki akun Telegram lain',
                      'Terlalu banyak notifikasi & pesan yang mengganggu',
                      'Kekhawatiran privasi & keamanan data',
                      'Alasan lainnya'
                    ].map((reason) => (
                      <div
                        key={reason}
                        onClick={() => setDeleteReason(reason)}
                        className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                      >
                        <span className="text-xs font-medium text-slate-200">{reason}</span>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${deleteReason === reason ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                          {deleteReason === reason && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Action Buttons */}
              <div className="p-5 pt-2 space-y-2.5">
                <button
                  id="btn-confirm-delete-account-subview"
                  onClick={() => setShowDeleteConfirmModal(true)}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Akun Saya Secara Permanen</span>
                </button>

                <button
                  onClick={() => setSubView('main')}
                  className="w-full py-3 bg-[#242f3d] hover:bg-[#2c394b] text-slate-200 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Batalkan & Kembali ke Pengaturan
                </button>
              </div>
            </div>
          )}

          {/* AUTO DELETE MESSAGES */}
          {subView === 'auto_delete_messages' && (
            <div className="py-4 bg-[#0e1621] space-y-4 h-full">
              <div className="px-5">
                <span className="text-xs font-bold text-[#5288c1] tracking-wide uppercase">Hapus Otomatis Pesan di Obrolan Baru</span>
              </div>
              <div className="bg-[#17212b] divide-y divide-[#242f3d] border-y border-[#242f3d]">
                {[
                  { val: 0, label: 'Mati' },
                  { val: 86400, label: '1 Hari' },
                  { val: 604800, label: '1 Minggu' },
                  { val: 2592000, label: '1 Bulan' }
                ].map((opt) => (
                  <div
                    key={opt.val}
                    onClick={() => handleUpdatePrivacy('autoDeleteMessagesTimer', opt.val)}
                    className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/60 transition-colors"
                  >
                    <span className="text-sm font-medium text-white">{opt.label}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${(currentUser.autoDeleteMessagesTimer || 0) === opt.val ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                      {(currentUser.autoDeleteMessagesTimer || 0) === opt.val && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAP PROVIDER */}
          {subView === 'map_provider' && (
            <div className="py-4 bg-[#0e1621] space-y-4 h-full">
              <div className="px-5">
                <span className="text-xs font-bold text-[#5288c1] tracking-wide uppercase">Penyedia Peta Secret Chat</span>
              </div>
              <div className="bg-[#17212b] divide-y divide-[#242f3d] border-y border-[#242f3d]">
                {[
                  { val: 'none', label: 'Tidak Ada Pratinjau' },
                  { val: 'google', label: 'Google Maps' },
                  { val: 'telegram', label: 'Telegram Maps' }
                ].map((opt) => (
                  <div
                    key={opt.val}
                    onClick={() => handleUpdatePrivacy('mapProvider', opt.val)}
                    className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/60 transition-colors"
                  >
                    <span className="text-sm font-medium text-white">{opt.label}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${(currentUser.mapProvider || 'none') === opt.val ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                      {(currentUser.mapProvider || 'none') === opt.val && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}



          {/* SUREL UNTUK MASUK (LOGIN EMAIL) */}
          {subView === 'login_email' && (
            <div className="py-4 bg-[#0e1621] space-y-4 h-full">
              <div className="px-5">
                <span className="text-xs font-bold text-[#5288c1] tracking-wide uppercase">Email Anda</span>
              </div>
              <div className="bg-[#17212b] p-5 border-y border-[#242f3d]">
                <div className="space-y-4">
                  <p className="text-sm text-white">
                    Email ini akan digunakan untuk melindungi akun Anda dan sebagai pemulihan akses (contoh: jika Anda lupa Kunci Aplikasi).
                  </p>
                  <input
                    type="email"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    placeholder="Masukkan alamat email"
                    className="w-full bg-[#0e1621] text-white px-4 py-3 rounded-lg border border-[#242f3d] focus:border-[#5288c1] focus:outline-none"
                  />
                  <button 
                    onClick={async () => {
                      setLoading(true);
                      await handleUpdatePrivacy('loginEmail', tempValue);
                      setLoading(false);
                      setActiveAlert('Email berhasil diperbarui!');
                      setSubView('privacy');
                    }}
                    disabled={loading}
                    className="w-full py-3 bg-[#5288c1] text-white font-semibold rounded-lg hover:bg-[#467ab3] transition-colors"
                  >
                    {loading ? 'Menyimpan...' : 'Simpan Email'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DAFTAR BLOKIR (BLOCKED USERS) */}
          {subView === 'blocked_users' && (
            <div className="py-4 bg-[#0e1621] space-y-4 h-full flex flex-col">
              <div className="px-5">
                <span className="text-xs font-bold text-[#5288c1] tracking-wide uppercase">Pengguna Diblokir</span>
              </div>
              <div className="bg-[#17212b] border-y border-[#242f3d] flex-1 overflow-y-auto custom-scrollbar">
                {(currentUser.blockedUsers || []).length > 0 ? (
                  <div className="divide-y divide-[#242f3d]/50">
                    {(currentUser.blockedUsers || []).map((bUserId, idx) => {
                      const targetObj = (allUsers || []).find(
                        (u) => u.id === bUserId || u.username === bUserId.replace('@', '') || u.name === bUserId
                      );
                      const displayName = targetObj ? targetObj.name : bUserId;
                      const displayUsername = targetObj?.username || bUserId;
                      return (
                        <div key={idx} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#242f3d]/40 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar
                              name={displayName}
                              username={displayUsername}
                              avatar={targetObj?.avatar}
                              color={targetObj?.color || '#5288c1'}
                              size="md"
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white truncate">{displayName}</div>
                              <div className="text-xs text-[#7f91a4] truncate">@{displayUsername.replace(/^@/, '')}</div>
                            </div>
                          </div>
                          <button 
                            className="px-3 py-1.5 bg-[#5288c1]/15 hover:bg-[#5288c1]/25 text-[#5288c1] text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                            onClick={async () => {
                              if (onToggleBlockUser) {
                                await onToggleBlockUser(bUserId, false);
                              } else {
                                const targetObj = (allUsers || []).find(
                                  (u) => u.id === bUserId || u.username === bUserId.replace('@', '') || u.name === bUserId
                                );
                                const matchVariants = [bUserId, bUserId.replace(/^@/, ''), `@${bUserId.replace(/^@/, '')}`];
                                if (targetObj) {
                                  matchVariants.push(targetObj.id);
                                  if (targetObj.username) {
                                    matchVariants.push(targetObj.username, `@${targetObj.username}`);
                                  }
                                }
                                const newBlocked = (currentUser.blockedUsers || []).filter(
                                  u => !matchVariants.some(v => v.toLowerCase() === u.toLowerCase())
                                );
                                await handleUpdatePrivacy('blockedUsers', newBlocked);
                              }
                            }}
                          >
                            Buka Blokir
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-[#7f91a4] flex flex-col items-center justify-center">
                    <ShieldCheck className="w-16 h-16 mb-4 text-[#2b3543]" />
                    <p className="font-semibold text-slate-200">Daftar Blokir Kosong</p>
                    <p className="text-xs mt-2 text-[#7f91a4] max-w-xs">Pengguna yang diblokir tidak dapat mengirimi Anda pesan, melihat info profil lengkap Anda, atau menghubungi Anda.</p>
                  </div>
                )}
              </div>
              <div className="p-5">
                <button 
                  onClick={() => setActiveAlert('Untuk memblokir seseorang, buka profil pengguna tersebut, klik tiga titik di pojok kanan atas, lalu pilih "Blokir".')}
                  className="w-full py-3 bg-[#5288c1]/10 text-[#5288c1] font-semibold rounded-lg hover:bg-[#5288c1]/20 transition-colors cursor-pointer"
                >
                  Blokir Pengguna Baru
                </button>
              </div>
            </div>
          )}

          {/* BOT DENGAN AKSES BIOMETRIK (BOT BIOMETRICS) */}
          {subView === 'bot_biometrics' && (
            <div className="py-4 bg-[#0e1621] space-y-4 h-full flex flex-col">
              <div className="px-5">
                <span className="text-xs font-bold text-[#5288c1] tracking-wide uppercase">Akses Biometrik</span>
              </div>
              <div className="bg-[#17212b] p-8 border-y border-[#242f3d] flex-1 flex flex-col items-center justify-center text-center text-[#7f91a4]">
                <Sparkles className="w-16 h-16 mb-4 text-[#2b3543]" />
                <p>Tidak Ada Bot</p>
                <p className="text-sm mt-2">Anda belum mengizinkan bot mana pun untuk menggunakan akses biometrik perangkat Anda.</p>
              </div>
            </div>
          )}



          {/* NOTIFIKASI DAN SUARA */}
          {subView === 'notifications' && (
            <div className="py-4 bg-[#0e1621] space-y-4 h-full flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                
                {/* Tampilkan notifikasi dari */}
                <div>
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Tampilkan notifikasi dari</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50">
                    <div 
                      onClick={() => handleUpdatePrivacy('notifAllAccounts', currentUser.notifAllAccounts === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white">Semua Akun</span>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.notifAllAccounts !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.notifAllAccounts !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="px-5 py-2">
                    <p className="text-[13px] text-[#7f91a4] leading-relaxed">Matikan jika ingin menerima notifikasi hanya dari akun yang saat ini Anda gunakan.</p>
                  </div>
                </div>

                {/* Notifikasi obrolan */}
                <div className="mt-2">
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Notifikasi obrolan</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50 divide-y divide-[#242f3d]/50">
                    <div 
                      onClick={() => handleUpdatePrivacy('notifPrivateChats', currentUser.notifPrivateChats === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full border border-[#7f91a4] flex items-center justify-center text-[#7f91a4]">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <div>
                          <div className="text-[15px] text-white font-medium">Obrolan Pribadi</div>
                          <div className="text-[13px] text-[#7f91a4]">Ketuk untuk ganti</div>
                        </div>
                      </div>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.notifPrivateChats !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.notifPrivateChats !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    <div 
                      onClick={() => handleUpdatePrivacy('notifGroups', currentUser.notifGroups === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center text-[#7f91a4]">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </div>
                        <div>
                          <div className="text-[15px] text-white font-medium">Grup</div>
                          <div className="text-[13px] text-[#7f91a4]">{currentUser.notifGroups !== false ? 'Hidup' : 'Mati'}</div>
                        </div>
                      </div>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.notifGroups !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.notifGroups !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    <div 
                      onClick={() => handleUpdatePrivacy('notifChannels', currentUser.notifChannels === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center text-[#7f91a4]">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                        <div>
                          <div className="text-[15px] text-white font-medium">Channel</div>
                          <div className="text-[13px] text-[#7f91a4]">{currentUser.notifChannels !== false ? 'Hidup' : 'Mati'}</div>
                        </div>
                      </div>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.notifChannels !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.notifChannels !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    <div 
                      onClick={() => handleUpdatePrivacy('notifStories', currentUser.notifStories === true ? false : true)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center text-[#7f91a4]">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                        </div>
                        <div>
                          <div className="text-[15px] text-white font-medium">Cerita</div>
                          <div className="text-[13px] text-[#7f91a4]">{currentUser.notifStories === true ? 'Hidup' : 'Mati'}</div>
                        </div>
                      </div>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.notifStories === true ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.notifStories === true ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    <div 
                      onClick={() => handleUpdatePrivacy('notifReactions', currentUser.notifReactions === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center text-[#7f91a4]">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        </div>
                        <div>
                          <div className="text-[15px] text-white font-medium">Reaksi</div>
                          <div className="text-[13px] text-[#7f91a4]">Pesan, Cerita</div>
                        </div>
                      </div>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.notifReactions !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.notifReactions !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Panggilan */}
                <div className="mt-4">
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Panggilan</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50 divide-y divide-[#242f3d]/50">
                    <div 
                      onClick={() => {
                        const opts = ['Standar', 'Pendek', 'Panjang', 'Hanya Jika Tidak Bisu', 'Mati'];
                        const currIdx = opts.indexOf(currentUser.callsVibrate || 'Standar');
                        handleUpdatePrivacy('callsVibrate', opts[(currIdx + 1) % opts.length]);
                      }}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white font-medium">Getaran</span>
                      <span className="text-[15px] text-[#5288c1]">{currentUser.callsVibrate || 'Standar'}</span>
                    </div>
                    <div 
                      onClick={() => {
                        const opts = ['Standar', 'Telegram', 'Klasik', 'Mati'];
                        const currIdx = opts.indexOf(currentUser.callsRingtone || 'Standar');
                        handleUpdatePrivacy('callsRingtone', opts[(currIdx + 1) % opts.length]);
                      }}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white font-medium">Dering</span>
                      <span className="text-[15px] text-[#5288c1]">{currentUser.callsRingtone || 'Standar'}</span>
                    </div>
                  </div>
                </div>

                {/* Tanda Penghitung */}
                <div className="mt-4">
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Tanda Penghitung</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50 divide-y divide-[#242f3d]/50">
                    <div 
                      onClick={() => handleUpdatePrivacy('badgeShow', currentUser.badgeShow === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white font-medium">Tampilkan Tanda Penghitung</span>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.badgeShow !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.badgeShow !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    <div 
                      onClick={() => handleUpdatePrivacy('badgeIncludeMuted', currentUser.badgeIncludeMuted === true ? false : true)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white font-medium">Termasuk Obrolan Senyap</span>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.badgeIncludeMuted === true ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.badgeIncludeMuted === true ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    <div 
                      onClick={() => handleUpdatePrivacy('badgeCountUnread', currentUser.badgeCountUnread === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white font-medium">Hitung Pesan Belum Dibaca</span>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.badgeCountUnread !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.badgeCountUnread !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notifikasi Intra Apl */}
                <div className="mt-4">
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Notifikasi Intra Apl</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50 divide-y divide-[#242f3d]/50">
                    <div 
                      onClick={() => handleUpdatePrivacy('inAppSounds', currentUser.inAppSounds === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white font-medium">Suara Intra Apl</span>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.inAppSounds !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.inAppSounds !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    <div 
                      onClick={() => handleUpdatePrivacy('inAppVibrate', currentUser.inAppVibrate === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white font-medium">Getaran Intra Apl</span>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.inAppVibrate !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.inAppVibrate !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    <div 
                      onClick={() => handleUpdatePrivacy('inAppPreview', currentUser.inAppPreview === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white font-medium">Pratinjau Intra Apl</span>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.inAppPreview !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.inAppPreview !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    <div 
                      onClick={() => handleUpdatePrivacy('inChatSounds', currentUser.inChatSounds === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white font-medium">Suara Intra Obrolan</span>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.inChatSounds !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.inChatSounds !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    <div 
                      onClick={() => handleUpdatePrivacy('inAppPopup', currentUser.inAppPopup === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <div>
                        <div className="text-[15px] text-white font-medium">Pop-up Layar dalam Aplikasi</div>
                        <div className="text-[13px] text-[#7f91a4]">Tampilkan notifikasi pop-up dalam aplikasi.</div>
                      </div>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.inAppPopup !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.inAppPopup !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Peristiwa */}
                <div className="mt-4">
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Peristiwa</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50 divide-y divide-[#242f3d]/50">
                    <div 
                      onClick={() => handleUpdatePrivacy('eventContactJoined', currentUser.eventContactJoined === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white font-medium">Kontak bergabung dengan Telegram</span>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.eventContactJoined !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.eventContactJoined !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    <div 
                      onClick={() => handleUpdatePrivacy('eventPinnedMessage', currentUser.eventPinnedMessage === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white font-medium">Pesan Tersemat</span>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.eventPinnedMessage !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.eventPinnedMessage !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lainnya */}
                <div className="mt-4">
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Lainnya</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50 divide-y divide-[#242f3d]/50">
                    <div 
                      onClick={() => handleUpdatePrivacy('otherKeepAlive', currentUser.otherKeepAlive === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <div>
                        <div className="text-[15px] text-white font-medium">Biarkan Layanan Tetap Menyala</div>
                        <div className="text-[13px] text-[#7f91a4] max-w-[280px]">Luncurkan ulang aplikasi saat ditutup. Aktifkan untuk notifikasi lebih akurat.</div>
                      </div>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.otherKeepAlive !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.otherKeepAlive !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    <div 
                      onClick={() => handleUpdatePrivacy('otherBackgroundConn', currentUser.otherBackgroundConn === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <div>
                        <div className="text-[15px] text-white font-medium">Koneksi Latar</div>
                        <div className="text-[13px] text-[#7f91a4] max-w-[280px]">Pertahankan koneksi latar belakang berdampak rendah ke Telegram untuk notifikasi lebih akurat.</div>
                      </div>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.otherBackgroundConn !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.otherBackgroundConn !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    <div 
                      onClick={() => {
                        const opts = ['1 jam', '2 jam', '5 jam', 'Mati'];
                        const currIdx = opts.indexOf(currentUser.notifRepeat || '1 jam');
                        handleUpdatePrivacy('notifRepeat', opts[(currIdx + 1) % opts.length]);
                      }}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white font-medium">Notifikasi diulang</span>
                      <span className="text-[15px] text-[#5288c1]">{currentUser.notifRepeat || '1 jam'}</span>
                    </div>
                  </div>
                </div>

                {/* Reset */}
                <div className="mt-4 mb-8">
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Reset</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50">
                    <div 
                      onClick={() => setActiveAlert('Semua pengaturan notifikasi berhasil direset ke bawaan.')}
                      className="px-5 py-3.5 flex flex-col justify-center cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white font-medium">Reset Semua Notifikasi</span>
                      <span className="text-[13px] text-[#7f91a4]">Kembalikan semua pengaturan notifikasi untuk semua kontak, grup, dan channel.</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

                    {subView === 'power_saving' && (
            <div className="py-4 bg-[#0e1621] h-full flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                
                {/* Mode Hemat Daya */}
                <div>
                  <div className="px-5 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Mode Hemat Daya</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded font-bold bg-[#17212b] text-[#7f91a4] uppercase">
                        {(currentUser.powerSavingModePercent || 0) > 0 ? 'Nyala' : 'Mati'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50 px-5 py-4">
                    <div className="flex items-center justify-between text-[13px] text-[#7f91a4] mb-3">
                      <span>Mati</span>
                      <span className="text-[#5288c1]">
                        {currentUser.powerSavingModePercent === 100 
                          ? 'Selalu Nyala' 
                          : currentUser.powerSavingModePercent === 0 
                            ? 'Mati'
                            : `Saat di bawah ${currentUser.powerSavingModePercent || 0}%`}
                      </span>
                      <span>Nyala</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={currentUser.powerSavingModePercent || 0}
                      onChange={(e) => handleUpdatePrivacy('powerSavingModePercent', parseInt(e.target.value))}
                      className="w-full accent-[#5288c1]"
                    />
                  </div>
                  <div className="px-5 py-2">
                    <p className="text-[13px] text-[#7f91a4] leading-relaxed">
                      {currentUser.powerSavingModePercent === 100 
                        ? 'Selalu kurangi penggunaan daya terlepas dari angka baterai Anda.'
                        : currentUser.powerSavingModePercent === 0 
                          ? 'Tidak pernah secara otomatis mengurangi penggunaan daya.'
                          : `Secara otomatis mengurangi penggunaan daya dan animasi saat baterai di bawah ${currentUser.powerSavingModePercent || 0}%.`}
                    </p>
                  </div>
                </div>

                {/* Opsi Hemat Daya */}
                <div>
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Opsi hemat daya</span>
                  </div>
                  
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50 divide-y divide-[#242f3d]/50">
                    
                    {/* Animasi Stiker */}
                    <div>
                      <div 
                        onClick={() => setExpandedSticker(!expandedSticker)}
                        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 flex items-center justify-center text-[#7f91a4]">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] text-white">Animasi Stiker</span>
                            <span className="text-[13px] text-[#7f91a4]">
                              {(currentUser.animStickerKeyboard !== false ? 1 : 0) + (currentUser.animStickerChat !== false ? 1 : 0)}/2
                            </span>
                            <svg className={`w-4 h-4 text-[#7f91a4] transition-transform ${expandedSticker ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const anyOn = currentUser.animStickerKeyboard !== false || currentUser.animStickerChat !== false;
                            handleUpdatePrivacy('animStickerKeyboard', !anyOn);
                            handleUpdatePrivacy('animStickerChat', !anyOn);
                          }}
                          className={`w-10 h-5 rounded-full relative transition-colors ${(currentUser.animStickerKeyboard !== false || currentUser.animStickerChat !== false) ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${(currentUser.animStickerKeyboard !== false || currentUser.animStickerChat !== false) ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                      
                      {expandedSticker && (
                        <div className="pl-16 divide-y divide-[#242f3d]/50 bg-[#17212b]">
                          <div 
                            onClick={() => handleUpdatePrivacy('animStickerKeyboard', currentUser.animStickerKeyboard === false ? true : false)}
                            className="pr-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${currentUser.animStickerKeyboard !== false ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                              {currentUser.animStickerKeyboard !== false && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className="text-[15px] text-white">Putar otomatis dalam keyboard</span>
                          </div>
                          <div 
                            onClick={() => handleUpdatePrivacy('animStickerChat', currentUser.animStickerChat === false ? true : false)}
                            className="pr-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${currentUser.animStickerChat !== false ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                              {currentUser.animStickerChat !== false && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className="text-[15px] text-white">Putar otomatis dalam obrolan</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Animasi Emoji */}
                    <div>
                      <div 
                        onClick={() => setExpandedEmoji(!expandedEmoji)}
                        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 flex items-center justify-center text-[#7f91a4]">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] text-white">Animasi Emoji</span>
                            <span className="text-[13px] text-[#7f91a4]">
                              {(currentUser.animEmojiKeyboard !== false ? 1 : 0) + (currentUser.animEmojiReactions !== false ? 1 : 0) + (currentUser.animEmojiChat !== false ? 1 : 0)}/3
                            </span>
                            <svg className={`w-4 h-4 text-[#7f91a4] transition-transform ${expandedEmoji ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const anyOn = currentUser.animEmojiKeyboard !== false || currentUser.animEmojiReactions !== false || currentUser.animEmojiChat !== false;
                            handleUpdatePrivacy('animEmojiKeyboard', !anyOn);
                            handleUpdatePrivacy('animEmojiReactions', !anyOn);
                            handleUpdatePrivacy('animEmojiChat', !anyOn);
                          }}
                          className={`w-10 h-5 rounded-full relative transition-colors ${(currentUser.animEmojiKeyboard !== false || currentUser.animEmojiReactions !== false || currentUser.animEmojiChat !== false) ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${(currentUser.animEmojiKeyboard !== false || currentUser.animEmojiReactions !== false || currentUser.animEmojiChat !== false) ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                      
                      {expandedEmoji && (
                        <div className="pl-16 divide-y divide-[#242f3d]/50 bg-[#17212b]">
                          <div 
                            onClick={() => handleUpdatePrivacy('animEmojiKeyboard', currentUser.animEmojiKeyboard === false ? true : false)}
                            className="pr-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${currentUser.animEmojiKeyboard !== false ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                              {currentUser.animEmojiKeyboard !== false && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className="text-[15px] text-white">Putar otomatis dalam keyboard</span>
                          </div>
                          <div 
                            onClick={() => handleUpdatePrivacy('animEmojiReactions', currentUser.animEmojiReactions === false ? true : false)}
                            className="pr-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${currentUser.animEmojiReactions !== false ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                              {currentUser.animEmojiReactions !== false && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className="text-[15px] text-white">Putar otomatis dalam menu reaksi</span>
                          </div>
                          <div 
                            onClick={() => handleUpdatePrivacy('animEmojiChat', currentUser.animEmojiChat === false ? true : false)}
                            className="pr-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${currentUser.animEmojiChat !== false ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                              {currentUser.animEmojiChat !== false && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className="text-[15px] text-white">Putar otomatis dalam obrolan</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Efek dalam Obrolan */}
                    <div>
                      <div 
                        onClick={() => setExpandedEffect(!expandedEffect)}
                        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 flex items-center justify-center text-[#7f91a4]">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] text-white">Efek dalam Obrolan</span>
                            <span className="text-[13px] text-[#7f91a4]">
                              {(currentUser.effectChatRotation !== false ? 1 : 0) + (currentUser.effectChatTopic !== false ? 1 : 0) + (currentUser.effectChatSpoiler !== false ? 1 : 0) + (currentUser.effectChatBlur !== false ? 1 : 0) + (currentUser.effectChatLiquid !== false ? 1 : 0) + (currentUser.effectChatZoom !== false ? 1 : 0) + (currentUser.effectChatDust !== false ? 1 : 0)}/7
                            </span>
                            <svg className={`w-4 h-4 text-[#7f91a4] transition-transform ${expandedEffect ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const anyOn = currentUser.effectChatRotation !== false || currentUser.effectChatTopic !== false || currentUser.effectChatSpoiler !== false || currentUser.effectChatBlur !== false || currentUser.effectChatLiquid !== false || currentUser.effectChatZoom !== false || currentUser.effectChatDust !== false;
                            handleUpdatePrivacy('effectChatRotation', !anyOn);
                            handleUpdatePrivacy('effectChatTopic', !anyOn);
                            handleUpdatePrivacy('effectChatSpoiler', !anyOn);
                            handleUpdatePrivacy('effectChatBlur', !anyOn);
                            handleUpdatePrivacy('effectChatLiquid', !anyOn);
                            handleUpdatePrivacy('effectChatZoom', !anyOn);
                            handleUpdatePrivacy('effectChatDust', !anyOn);
                          }}
                          className={`w-10 h-5 rounded-full relative transition-colors ${(currentUser.effectChatRotation !== false || currentUser.effectChatTopic !== false || currentUser.effectChatSpoiler !== false || currentUser.effectChatBlur !== false || currentUser.effectChatLiquid !== false || currentUser.effectChatZoom !== false || currentUser.effectChatDust !== false) ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${(currentUser.effectChatRotation !== false || currentUser.effectChatTopic !== false || currentUser.effectChatSpoiler !== false || currentUser.effectChatBlur !== false || currentUser.effectChatLiquid !== false || currentUser.effectChatZoom !== false || currentUser.effectChatDust !== false) ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                      
                      {expandedEffect && (
                        <div className="pl-16 divide-y divide-[#242f3d]/50 bg-[#17212b]">
                          <div 
                            onClick={() => handleUpdatePrivacy('effectChatRotation', currentUser.effectChatRotation === false ? true : false)}
                            className="pr-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${currentUser.effectChatRotation !== false ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                              {currentUser.effectChatRotation !== false && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className="text-[15px] text-white">Rotasi latar</span>
                          </div>
                          <div 
                            onClick={() => handleUpdatePrivacy('effectChatTopic', currentUser.effectChatTopic === false ? true : false)}
                            className="pr-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${currentUser.effectChatTopic !== false ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                              {currentUser.effectChatTopic !== false && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className="text-[15px] text-white">Menu samping dalam topik</span>
                          </div>
                          <div 
                            onClick={() => handleUpdatePrivacy('effectChatSpoiler', currentUser.effectChatSpoiler === false ? true : false)}
                            className="pr-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${currentUser.effectChatSpoiler !== false ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                              {currentUser.effectChatSpoiler !== false && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className="text-[15px] text-white">Animasi efek spoiler</span>
                          </div>
                          <div 
                            onClick={() => handleUpdatePrivacy('effectChatBlur', currentUser.effectChatBlur === false ? true : false)}
                            className="pr-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${currentUser.effectChatBlur !== false ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                              {currentUser.effectChatBlur !== false && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className="text-[15px] text-white">Buram</span>
                          </div>
                          <div 
                            onClick={() => handleUpdatePrivacy('effectChatLiquid', currentUser.effectChatLiquid === false ? true : false)}
                            className="pr-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${currentUser.effectChatLiquid !== false ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                              {currentUser.effectChatLiquid !== false && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className="text-[15px] text-white">Liquid Glass</span>
                          </div>
                          <div 
                            onClick={() => handleUpdatePrivacy('effectChatZoom', currentUser.effectChatZoom === false ? true : false)}
                            className="pr-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${currentUser.effectChatZoom !== false ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                              {currentUser.effectChatZoom !== false && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className="text-[15px] text-white">Animasi zoom</span>
                          </div>
                          <div 
                            onClick={() => handleUpdatePrivacy('effectChatDust', currentUser.effectChatDust === false ? true : false)}
                            className="pr-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${currentUser.effectChatDust !== false ? 'border-[#5288c1] bg-[#5288c1]' : 'border-[#7f91a4]'}`}>
                              {currentUser.effectChatDust !== false && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className="text-[15px] text-white">Efek hapus debu</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Animasi dalam Panggilan */}
                    <div 
                      onClick={() => handleUpdatePrivacy('animCalls', currentUser.animCalls === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center text-[#7f91a4]">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        </div>
                        <span className="text-[15px] text-white">Animasi dalam Panggilan</span>
                      </div>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.animCalls !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.animCalls !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {/* Otomatis Putar Video */}
                    <div 
                      onClick={() => handleUpdatePrivacy('autoPlayVideo', currentUser.autoPlayVideo === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center text-[#7f91a4]">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                        </div>
                        <span className="text-[15px] text-white">Otomatis Putar Video</span>
                      </div>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.autoPlayVideo !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.autoPlayVideo !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {/* Otomatis Putar GIF */}
                    <div 
                      onClick={() => handleUpdatePrivacy('autoPlayGIF', currentUser.autoPlayGIF === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center text-[#7f91a4] font-bold text-sm tracking-wider">
                          GIF
                        </div>
                        <span className="text-[15px] text-white">Otomatis Putar GIF</span>
                      </div>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.autoPlayGIF !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.autoPlayGIF !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {/* Partikel */}
                    <div 
                      onClick={() => handleUpdatePrivacy('effectParticles', currentUser.effectParticles === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center text-[#7f91a4]">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        </div>
                        <span className="text-[15px] text-white">Partikel</span>
                      </div>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.effectParticles !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.effectParticles !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Aktifkan Transisi Halus */}
                <div className="mb-8">
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50">
                    <div 
                      onClick={() => handleUpdatePrivacy('smoothTransitions', currentUser.smoothTransitions === false ? true : false)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white">Aktifkan Transisi Halus</span>
                      <button className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.smoothTransitions !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.smoothTransitions !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="px-5 py-2">
                    <p className="text-[13px] text-[#7f91a4] leading-relaxed">Anda dapat menonaktifkan animasi transisi saat berpindah halaman dalam aplikasi.</p>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        
          {subView === 'data_and_storage' && (
            <div className="py-4 bg-[#0e1621] h-full flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                
                {/* Penggunaan jaringan dan penyimpanan */}
                <div>
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Penggunaan jaringan dan penyimpanan</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50 divide-y divide-[#242f3d]/50">
                    <div 
                      onClick={() => setSubView('storage_usage')}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-[#5288c1] flex items-center justify-center text-white">
                          <PieChart className="w-5 h-5" />
                        </div>
                        <span className="text-[15px] text-white">Pemakaian Penyimpanan</span>
                      </div>
                      <span className="text-[15px] text-[#5288c1]">111,1 MB</span>
                    </div>
                    <div 
                      onClick={() => setSubView('data_usage')}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-[#40a7e3] flex items-center justify-center text-white">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>
                        </div>
                        <span className="text-[15px] text-white">Penggunaan Data</span>
                      </div>
                      <span className="text-[15px] text-[#5288c1]">11,77 GB</span>
                    </div>
                  </div>
                </div>

                {/* Kualitas Media Unggahan & Unduhan */}
                <div className="px-3">
                  <MediaQualitySettingsSection 
                    currentUser={currentUser} 
                    onUpdateProfile={onUpdateProfile} 
                  />
                </div>

                {/* Pengunduhan media otomatis */}
                <div>
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Pengunduhan media otomatis</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50 divide-y divide-[#242f3d]/50">
                    
                    <div className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                      <div className="pr-4">
                        <div className="text-[15px] text-white">Saat menggunakan data seluler</div>
                        <div className="text-[13px] text-[#7f91a4] mt-0.5">Foto, Video (10 MB), Berkas (1 MB)</div>
                      </div>
                      <button 
                        onClick={() => handleUpdatePrivacy('autoDownloadCellular', currentUser.autoDownloadCellular === false ? true : false)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.autoDownloadCellular !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.autoDownloadCellular !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    <div className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                      <div className="pr-4">
                        <div className="text-[15px] text-white">Saat terhubung Wi-Fi</div>
                        <div className="text-[13px] text-[#7f91a4] mt-0.5">Foto, Video (15 MB), Berkas (3 MB)</div>
                      </div>
                      <button 
                        onClick={() => handleUpdatePrivacy('autoDownloadWiFi', currentUser.autoDownloadWiFi === false ? true : false)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.autoDownloadWiFi !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.autoDownloadWiFi !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    <div className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                      <div className="pr-4">
                        <div className="text-[15px] text-white">Saat roaming</div>
                        <div className="text-[13px] text-[#7f91a4] mt-0.5">Foto</div>
                      </div>
                      <button 
                        onClick={() => handleUpdatePrivacy('autoDownloadRoaming', currentUser.autoDownloadRoaming === false ? true : false)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.autoDownloadRoaming !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.autoDownloadRoaming !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    <div className="px-5 py-3.5 cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                      <span className="text-[15px] text-[#e53935]">Reset Pengaturan Unduh Otomatis</span>
                    </div>

                  </div>
                </div>

                {/* Simpan ke Galeri */}
                <div>
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Simpan ke Galeri</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50 divide-y divide-[#242f3d]/50">
                    
                    <div className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                      <div className="pr-4">
                        <div className="text-[15px] text-white">Obrolan Pribadi</div>
                        <div className="text-[13px] text-[#7f91a4] mt-0.5">{currentUser.saveToGalleryPrivate ? 'Nyala' : 'Mati'}</div>
                      </div>
                      <button 
                        onClick={() => handleUpdatePrivacy('saveToGalleryPrivate', !currentUser.saveToGalleryPrivate)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.saveToGalleryPrivate ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.saveToGalleryPrivate ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    <div className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                      <div className="pr-4">
                        <div className="text-[15px] text-white">Grup</div>
                        <div className="text-[13px] text-[#7f91a4] mt-0.5">{currentUser.saveToGalleryGroups ? 'Nyala' : 'Mati'}</div>
                      </div>
                      <button 
                        onClick={() => handleUpdatePrivacy('saveToGalleryGroups', !currentUser.saveToGalleryGroups)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.saveToGalleryGroups ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.saveToGalleryGroups ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    <div className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                      <div className="pr-4">
                        <div className="text-[15px] text-white">Channel</div>
                        <div className="text-[13px] text-[#7f91a4] mt-0.5">{currentUser.saveToGalleryChannels ? 'Nyala' : 'Mati'}</div>
                      </div>
                      <button 
                        onClick={() => handleUpdatePrivacy('saveToGalleryChannels', !currentUser.saveToGalleryChannels)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.saveToGalleryChannels ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.saveToGalleryChannels ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>

                  </div>
                </div>

                {/* Aliran */}
                <div>
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Aliran</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50">
                    <div className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                      <span className="text-[15px] text-white">Aliran Musik dan Video</span>
                      <button 
                        onClick={() => handleUpdatePrivacy('streamMedia', currentUser.streamMedia === false ? true : false)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.streamMedia !== false ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.streamMedia !== false ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="px-5 py-2">
                    <p className="text-[13px] text-[#7f91a4] leading-relaxed">Apabila mungkin, Telegram akan langsung memutar video dan musik tanpa menunggu pengunduhan berkas untuk selesai.</p>
                  </div>
                </div>

                {/* Panggilan */}
                <div>
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Panggilan</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50">
                    <div 
                      onClick={() => setShowLessDataCallsPopup(true)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white">Hemat Data untuk Panggilan</span>
                      <span className="text-[15px] text-[#5288c1]">{currentUser.lessDataForCalls || 'Hanya saat roaming'}</span>
                    </div>
                  </div>
                </div>

                {/* Proxy */}
                <div>
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Proxy</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50">
                    <div 
                      onClick={() => setSubView('proxy_settings')}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <span className="text-[15px] text-white">Pengaturan Proxy</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 pb-6">
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50">
                    <div className="px-5 py-3.5 cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                      <span className="text-[15px] text-white">Hapus Semua Draf Awan</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {subView === 'proxy_settings' && (
            <div className="py-4 bg-[#0e1621] h-full flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                <div className="bg-[#17212b] border-y border-[#242f3d]/50 mt-2">
                  <div className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                    <span className="text-[15px] text-white">Gunakan pengaturan proxy</span>
                    <button 
                      onClick={() => handleUpdatePrivacy('useProxy', !currentUser.useProxy)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.useProxy ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.useProxy ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Koneksi</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50">
                    <div className="px-5 py-3.5 cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                      <span className="text-[15px] text-white">Tambah Proxy</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50">
                    <div className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                      <span className="text-[15px] text-white">Gunakan Proxy untuk Panggilan</span>
                      <button 
                        onClick={() => handleUpdatePrivacy('useProxyForCalls', !currentUser.useProxyForCalls)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${currentUser.useProxyForCalls ? 'bg-[#5288c1]' : 'bg-[#2b3543]'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${currentUser.useProxyForCalls ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="px-5 py-2">
                    <p className="text-[13px] text-[#7f91a4] leading-relaxed">Server proxy mungkin membuat kualitas panggilan Anda menurun.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          
                    {subView === 'storage_usage' && (() => {
            const rawItems = [
              { id: 'sticker', name: 'Stiker & Emoji', defaultVal: 51.9, color: '#f57c00', pct: 45, unit: 'MB' },
              { id: 'photo', name: 'Foto', defaultVal: 29.8, color: '#2196f3', pct: 26, unit: 'MB' },
              { id: 'video', name: 'Video', defaultVal: 21.1, color: '#42a5f5', pct: 19, unit: 'MB' },
              { id: 'profile', name: 'Foto Profil', defaultVal: 10.7, color: '#00bfa5', pct: 9, unit: 'MB' },
              { id: 'other', name: 'Lainnya', defaultVal: 0.77, color: '#fbc02d', pct: 1, isMinor: true, unit: 'KB', displayVal: '769,7 KB' }
            ];

            const storageMap = rawItems.map(item => ({
              ...item,
              val: cacheSizes[item.id] ?? item.defaultVal
            }));

            const totalAll = storageMap.reduce((acc, item) => acc + item.val, 0);
            const activeItems = storageMap.filter(item => storageItems[item.id] && item.val > 0);
            const totalSelected = activeItems.reduce((acc, item) => acc + item.val, 0);

            // Compute SVG pie chart slices
            const circumference = 2 * Math.PI * 38; // ~238.76
            let accumulatedOffset = 0;
            const slices = activeItems.map(item => {
              const itemFraction = item.val / (totalSelected || 1);
              const strokeLength = itemFraction * circumference;
              const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
              const strokeDashoffset = -accumulatedOffset;
              accumulatedOffset += strokeLength;
              return {
                ...item,
                strokeDasharray,
                strokeDashoffset
              };
            });

            const toggleItem = (id: string) => {
              setStorageItems(prev => ({
                ...prev,
                [id]: !prev[id]
              }));
            };

            const handleClearCache = () => {
              if (totalSelected === 0) return;
              const clearedMB = totalSelected.toFixed(1).replace('.', ',');
              
              setCacheSizes(prev => {
                const next = { ...prev };
                storageMap.forEach(item => {
                  if (storageItems[item.id]) {
                    next[item.id] = 0;
                  }
                });
                return next;
              });

              setActiveAlert(`Cache berhasil dibersihkan (${clearedMB} MB dibebaskan)`);
            };

            const handleResetCache = () => {
              setCacheSizes({
                sticker: 51.9,
                photo: 29.8,
                video: 21.1,
                profile: 10.7,
                other: 0.77
              });
              setStorageItems({
                sticker: true,
                photo: true,
                video: true,
                profile: true,
                other: true
              });
              setActiveAlert('Data cache simulasi dimuat ulang');
            };

            return (
            <div className="py-0 bg-black h-full flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                
                {/* Chart Area */}
                <div className="py-8 flex flex-col items-center justify-center border-b border-[#242f3d]/50 bg-black select-none">
                  <div className="relative w-40 h-40 mb-4 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      {totalSelected === 0 ? (
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#242f3d" strokeWidth="18" />
                      ) : (
                        slices.map((slice) => (
                          <circle
                            key={slice.id}
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth="18"
                            strokeDasharray={slice.strokeDasharray}
                            strokeDashoffset={slice.strokeDashoffset}
                            className="transition-all duration-300"
                          />
                        ))
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black rounded-full m-[18px]">
                      <span className="text-white text-3xl font-bold tracking-tight">
                        {totalSelected === 0 ? '0' : totalSelected.toFixed(1).replace('.', ',')}
                      </span>
                      <span className="text-[#7f91a4] text-xs font-medium">
                        {totalSelected === 0 ? 'KB' : 'MB'}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-white font-medium text-lg mb-1">Pemakaian Penyimpanan</h3>
                  <p className="text-[#7f91a4] text-sm">
                    {totalAll === 0 
                      ? 'Cache penyimpanan bersih.' 
                      : 'Telegram memakai <1% penyimpanan perangkat Anda.'}
                  </p>
                  
                  {/* Custom progress bar */}
                  <div className="w-48 h-1 bg-[#242f3d] rounded-full mt-4 overflow-hidden">
                    <div 
                      className="h-full bg-[#5288c1] transition-all duration-300"
                      style={{ width: totalAll === 0 ? '0%' : `${Math.min(100, Math.max(10, (totalSelected / 114.2) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Storage Items List */}
                <div className="bg-[#17212b] border-y border-[#242f3d]/50 divide-y divide-[#242f3d]/50 mt-4">
                  {storageMap.map(item => {
                    const isChecked = storageItems[item.id] && item.val > 0;
                    const isOther = item.id === 'other';
                    const isZero = item.val === 0;

                    let itemPct = '0%';
                    if (totalAll > 0 && item.val > 0) {
                      itemPct = isOther ? '<1,0%' : `${Math.round((item.val / totalAll) * 100)}%`;
                    }

                    return (
                      <div key={item.id}>
                        <div 
                          onClick={() => {
                            if (!isZero) toggleItem(item.id);
                          }}
                          className={`px-5 py-3.5 flex items-center justify-between transition-colors select-none ${
                            isZero ? 'opacity-60 cursor-default' : 'cursor-pointer hover:bg-[#242f3d]/50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div 
                              onClick={(e) => {
                                if (!isZero) {
                                  e.stopPropagation();
                                  toggleItem(item.id);
                                }
                              }}
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                isChecked 
                                  ? 'shadow-sm' 
                                  : isZero 
                                    ? 'border-2 border-[#3d4d5e] bg-transparent' 
                                    : 'border-2 border-[#526375] bg-transparent'
                              }`}
                              style={isChecked ? { backgroundColor: item.color } : {}}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />}
                            </div>

                            <span className="text-[15px] text-white flex items-center gap-1.5">
                              {item.name} 
                              <span className="text-[#7f91a4] text-xs font-normal">
                                {isZero ? '0%' : itemPct}
                              </span>
                              {isOther && !isZero && (
                                <ChevronDown 
                                  className={`w-4 h-4 text-[#7f91a4] transition-transform ${expandedDataCategories['other_cache'] ? 'rotate-180' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedDataCategories(prev => ({ ...prev, other_cache: !prev.other_cache }));
                                  }}
                                />
                              )}
                            </span>
                          </div>

                          <span className={`text-[15px] font-medium ${isZero ? 'text-[#7f91a4]' : 'text-[#5288c1]'}`}>
                            {isZero 
                              ? '0 B' 
                              : isOther 
                                ? '769,7 KB' 
                                : `${item.val.toFixed(1).replace('.', ',')} MB`}
                          </span>
                        </div>

                        {/* Expandable sub-items for Lainnya */}
                        {isOther && !isZero && expandedDataCategories['other_cache'] && (
                          <div className="bg-[#0e1621] px-5 py-2 pl-14 space-y-1.5 text-xs text-[#7f91a4] border-t border-[#242f3d]/30">
                            <div className="flex justify-between py-1">
                              <span>Berkas Cache Aplikasi</span>
                              <span className="text-white/80">420,0 KB</span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span>Database Obrolan Lokal</span>
                              <span className="text-white/80">349,7 KB</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <div className="p-4 space-y-2">
                    <button 
                      onClick={handleClearCache}
                      disabled={totalSelected === 0}
                      className={`w-full font-medium py-3 rounded-lg transition-all ${
                        totalSelected === 0 
                          ? 'bg-[#242f3d] text-[#7f91a4] cursor-not-allowed' 
                          : 'bg-[#40a7e3] hover:bg-[#3996cc] text-white shadow-md active:scale-[0.99] cursor-pointer'
                      }`}
                    >
                      {totalSelected === 0 ? 'Cache Sudah Bersih' : (
                        <>Bersihkan Cache <span className="text-white/80 font-normal ml-1">{totalSelected.toFixed(1).replace('.', ',')} MB</span></>
                      )}
                    </button>

                    {totalAll === 0 && (
                      <button
                        onClick={handleResetCache}
                        className="w-full text-center text-xs text-[#5288c1] hover:underline py-1 cursor-pointer transition-colors"
                      >
                        Muat Ulang Data Cache (Simulasi)
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="px-5 py-3">
                  <p className="text-[13px] text-[#7f91a4] leading-relaxed">Semua media akan tetap ada di awan Telegram dan dapat diunduh ulang jika diperlukan.</p>
                </div>

                <div>
                  <div className="px-5 py-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Hapus otomatis cache media</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50 divide-y divide-[#242f3d]/50">
                    <div onClick={() => setShowCachePopup('private')} className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-[#5288c1] flex items-center justify-center text-white">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <span className="text-[15px] text-white">Obrolan Pribadi</span>
                      </div>
                      <span className="text-[15px] text-[#5288c1]">{currentUser.keepMediaPrivate || '1 bulan'}</span>
                    </div>
                    <div onClick={() => setShowCachePopup('groups')} className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-[#4caf50] flex items-center justify-center text-white">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </div>
                        <span className="text-[15px] text-white">Obrolan Grup</span>
                      </div>
                      <span className="text-[15px] text-[#5288c1]">{currentUser.keepMediaGroups || '1 hari'}</span>
                    </div>
                    <div onClick={() => setShowCachePopup('channels')} className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-[#ffb74d] flex items-center justify-center text-white">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                        <span className="text-[15px] text-white">Channel</span>
                      </div>
                      <span className="text-[15px] text-[#5288c1]">{currentUser.keepMediaChannels || '1 hari'}</span>
                    </div>
                    <div onClick={() => setShowCachePopup('stories')} className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-[#e53935] flex items-center justify-center text-white">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                        </div>
                        <span className="text-[15px] text-white">Cerita</span>
                      </div>
                      <span className="text-[15px] text-[#5288c1]">{currentUser.keepMediaStories || '1 hari'}</span>
                    </div>
                  </div>
                  <div className="px-5 py-3 pb-8">
                    <p className="text-[13px] text-[#7f91a4] leading-relaxed">Foto, video, dan berkas lain dari obrolan awan yang <strong>tidak diakses</strong> selama periode ini akan dihapus dari perangkat ini untuk menghemat ruang penyimpanan.</p>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}


          {subView === 'data_usage' && (() => {
            const currentStats = dataUsageStats[dataUsageTab];
            const totalData = currentStats.video + currentStats.pesan + currentStats.foto + currentStats.dokumen;
            
            const formatDataSize = (mb: number) => {
              if (mb <= 0) return '0 KB';
              if (mb >= 1024) return `${(mb / 1024).toFixed(2).replace('.', ',')} GB`;
              if (mb >= 1) return `${mb.toFixed(1).replace('.', ',')} MB`;
              return `${(mb * 1024).toFixed(1).replace('.', ',')} KB`;
            };

            let centerVal = '0';
            let centerUnit = 'KB';
            if (totalData > 0) {
              if (totalData >= 1024) {
                centerVal = (totalData / 1024).toFixed(1).replace('.', ',');
                centerUnit = 'GB';
              } else {
                centerVal = totalData.toFixed(1).replace('.', ',');
                centerUnit = 'MB';
              }
            }

            const items = [
              { id: 'video', name: 'Video', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>, color: '#29b6f6', val: currentStats.video, sentVal: currentStats.video > 0 ? (currentStats.video * 0.05) : 0 },
              { id: 'pesan', name: 'Pesan', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>, color: '#ffb74d', val: currentStats.pesan, sentVal: currentStats.pesan > 0 ? (currentStats.pesan * 0.15) : 0 },
              { id: 'foto', name: 'Foto', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>, color: '#42a5f5', val: currentStats.foto, sentVal: currentStats.foto > 0 ? (currentStats.foto * 0.08) : 0 },
              { id: 'dokumen', name: 'Dokumen', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>, color: '#66bb6a', val: currentStats.dokumen, sentVal: currentStats.dokumen > 0 ? (currentStats.dokumen * 0.02) : 0 }
            ];

            const circumference = 2 * Math.PI * 38;
            let accumulatedOffset = 0;
            const slices = items.filter(item => item.val > 0).map(item => {
              const itemFraction = item.val / (totalData || 1);
              const strokeLength = itemFraction * circumference;
              const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
              const strokeDashoffset = -accumulatedOffset;
              accumulatedOffset += strokeLength;
              return {
                ...item,
                strokeDasharray,
                strokeDashoffset
              };
            });

            const handleResetConfirm = () => {
              const now = new Date();
              const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
              const formattedDate = `Hari ini, ${timeStr}`;

              setDataUsageStats(prev => {
                if (dataUsageTab === 'Semua') {
                  return {
                    Semua: { video: 0, pesan: 0, foto: 0, dokumen: 0, sent: 0, received: 0, resetDate: formattedDate },
                    Ponsel: { video: 0, pesan: 0, foto: 0, dokumen: 0, sent: 0, received: 0, resetDate: formattedDate },
                    'Wi-Fi': { video: 0, pesan: 0, foto: 0, dokumen: 0, sent: 0, received: 0, resetDate: formattedDate },
                    Roaming: { video: 0, pesan: 0, foto: 0, dokumen: 0, sent: 0, received: 0, resetDate: formattedDate },
                  };
                } else {
                  return {
                    ...prev,
                    [dataUsageTab]: {
                      video: 0,
                      pesan: 0,
                      foto: 0,
                      dokumen: 0,
                      sent: 0,
                      received: 0,
                      resetDate: formattedDate
                    }
                  };
                }
              });
              setShowResetDataConfirm(false);
              setActiveAlert(`Statistik penggunaan data (${dataUsageTab}) berhasil direset`);
            };

            const handleReloadSampleData = () => {
              setDataUsageStats({
                Semua: {
                  video: 7434.24,
                  pesan: 2406.4,
                  foto: 2027.52,
                  dokumen: 169.5,
                  sent: 386.7,
                  received: 11653.12,
                  resetDate: '28 Jan 2026, 22:13'
                },
                Ponsel: {
                  video: 7410.34,
                  pesan: 2330.5,
                  foto: 1990.52,
                  dokumen: 167.4,
                  sent: 377.5,
                  received: 11523.62,
                  resetDate: '28 Jan 2026, 22:13'
                },
                'Wi-Fi': {
                  video: 23.9,
                  pesan: 75.9,
                  foto: 37.0,
                  dokumen: 2.1,
                  sent: 9.2,
                  received: 129.5,
                  resetDate: '28 Jan 2026, 22:13'
                },
                Roaming: {
                  video: 0,
                  pesan: 0,
                  foto: 0,
                  dokumen: 0,
                  sent: 0,
                  received: 0,
                  resetDate: '28 Jan 2026, 22:13'
                }
              });
              setActiveAlert('Statistik penggunaan data dimuat ulang');
            };

            return (
            <div className="py-0 bg-black h-full flex flex-col">
              
              {/* Tabs */}
              <div className="flex bg-[#17212b] border-b border-[#242f3d]/50">
                {(['Semua', 'Ponsel', 'Wi-Fi', 'Roaming'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDataUsageTab(tab)}
                    className={`flex-1 py-3 text-[14px] font-medium transition-colors relative ${dataUsageTab === tab ? 'text-[#5288c1]' : 'text-[#7f91a4] hover:text-white'}`}
                  >
                    {tab}
                    {dataUsageTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5288c1] rounded-t-full" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                
                {/* Chart Area */}
                <div className="py-8 flex flex-col items-center justify-center bg-black select-none">
                  <div className="relative w-40 h-40 mb-4 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      {totalData === 0 ? (
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#242f3d" strokeWidth="18" />
                      ) : (
                        slices.map((slice) => (
                          <circle
                            key={slice.id}
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth="18"
                            strokeDasharray={slice.strokeDasharray}
                            strokeDashoffset={slice.strokeDashoffset}
                            className="transition-all duration-300"
                          />
                        ))
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black rounded-full m-[18px]">
                      <span className="text-white text-3xl font-bold tracking-tight">{centerVal}</span>
                      <span className="text-[#7f91a4] text-xs font-medium">{centerUnit}</span>
                    </div>
                  </div>
                  <p className="text-[#7f91a4] text-[13px]">
                    {totalData === 0 
                      ? `Tidak ada pemakaian jaringan sejak ${currentStats.resetDate}` 
                      : `Pemakaian jaringan Anda sejak ${currentStats.resetDate}`}
                  </p>
                </div>

                <div className="bg-[#17212b] border-y border-[#242f3d]/50 divide-y divide-[#242f3d]/50">
                  {items.map(item => {
                    const isZero = item.val === 0;
                    let pctStr = '0%';
                    if (totalData > 0 && item.val > 0) {
                      pctStr = `${Math.round((item.val / totalData) * 100)}%`;
                    }

                    return (
                      <div key={item.id}>
                        <div 
                          onClick={() => setExpandedDataCategories(prev => ({...prev, [item.id]: !prev[item.id]}))}
                          className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#242f3d]/50 transition-colors select-none"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{backgroundColor: item.color}}>
                              {item.icon}
                            </div>
                            <span className="text-[15px] text-white flex items-center gap-2">
                              {item.name} {totalData > 0 && !isZero && <span className="text-[#7f91a4] text-xs">{pctStr}</span>}
                              <ChevronRight className={`w-4 h-4 text-[#7f91a4] transition-transform ${expandedDataCategories[item.id] ? 'rotate-90' : ''}`} />
                            </span>
                          </div>
                          <span className={`text-[15px] font-medium ${isZero ? 'text-[#7f91a4]' : 'text-[#5288c1]'}`}>
                            {formatDataSize(item.val)}
                          </span>
                        </div>
                        
                        {/* Expanded content */}
                        {expandedDataCategories[item.id] && (
                          <div className="bg-[#0e1621] px-5 py-2 pl-16 space-y-1 text-xs border-t border-[#242f3d]/30">
                            <div className="text-[#7f91a4] flex justify-between py-1">
                              <span>Terkirim</span>
                              <span className={item.sentVal === 0 ? 'text-[#7f91a4]' : 'text-white/80'}>{formatDataSize(item.sentVal)}</span>
                            </div>
                            <div className="text-[#7f91a4] flex justify-between py-1">
                              <span>Diterima</span>
                              <span className={item.val === 0 ? 'text-[#7f91a4]' : 'text-white/80'}>{formatDataSize(item.val)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="px-5 py-2">
                  <span className="text-[13px] text-[#7f91a4]">Ketuk setiap bagian untuk perincian.</span>
                </div>

                <div>
                  <div className="px-5 py-2 mt-2">
                    <span className="text-[13px] font-bold text-[#5288c1] tracking-wide">Total pemakaian jaringan</span>
                  </div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50 divide-y divide-[#242f3d]/50">
                    <div className="px-5 py-3.5 flex items-center justify-between hover:bg-[#242f3d]/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-[#5288c1] flex items-center justify-center text-white">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                        </div>
                        <span className="text-[15px] text-white">Data terkirim</span>
                      </div>
                      <span className={`text-[15px] font-medium ${currentStats.sent === 0 ? 'text-[#7f91a4]' : 'text-[#5288c1]'}`}>
                        {formatDataSize(currentStats.sent)}
                      </span>
                    </div>
                    <div className="px-5 py-3.5 flex items-center justify-between hover:bg-[#242f3d]/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-[#4caf50] flex items-center justify-center text-white">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                        </div>
                        <span className="text-[15px] text-white">Data diterima</span>
                      </div>
                      <span className={`text-[15px] font-medium ${currentStats.received === 0 ? 'text-[#7f91a4]' : 'text-[#5288c1]'}`}>
                        {formatDataSize(currentStats.received)}
                      </span>
                    </div>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-[13px] text-[#7f91a4] leading-relaxed">
                      Pemakaian jaringan Anda sejak {currentStats.resetDate}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50">
                    <div 
                      onClick={() => setSubView('data_and_storage')}
                      className="px-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-[#242f3d]/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#5288c1] flex items-center justify-center text-white">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
                      </div>
                      <span className="text-[15px] text-white">Pengaturan Unduh Otomatis</span>
                    </div>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-[13px] text-[#7f91a4] leading-relaxed">
                      Anda dapat mengubah pengaturan unduh otomatis untuk mengurangi pemakaian data {dataUsageTab === 'Wi-Fi' ? 'saat tersambung ke Wi-Fi' : (dataUsageTab === 'Roaming' ? 'saat roaming' : 'seluler')}.
                    </p>
                  </div>
                </div>

                <div className="pb-8 space-y-2">
                  <div className="bg-[#17212b] border-y border-[#242f3d]/50">
                    <div 
                      onClick={() => setShowResetDataConfirm(true)}
                      className="px-5 py-3.5 cursor-pointer hover:bg-[#242f3d]/50 transition-colors active:bg-[#242f3d]"
                    >
                      <span className="text-[15px] text-[#e53935] font-medium">Reset Statistik</span>
                    </div>
                  </div>

                  {totalData === 0 && (
                    <div className="px-5 text-center">
                      <button
                        onClick={handleReloadSampleData}
                        className="text-xs text-[#5288c1] hover:underline py-1 cursor-pointer transition-colors"
                      >
                        Muat Ulang Statistik (Simulasi)
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Confirmation Dialog for Reset Statistik */}
              {showResetDataConfirm && (
                <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowResetDataConfirm(false)}>
                  <div 
                    className="w-full max-w-xs bg-[#242f3d] rounded-xl shadow-2xl p-5 animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-white font-semibold text-lg mb-2">Reset Statistik</h3>
                    <p className="text-[#7f91a4] text-sm mb-5 leading-relaxed">
                      Apakah Anda yakin ingin mereset statistik penggunaan data {dataUsageTab === 'Semua' ? 'semua jaringan' : `jaringan ${dataUsageTab}`}?
                    </p>
                    <div className="flex justify-end gap-3 font-medium text-sm">
                      <button
                        onClick={() => setShowResetDataConfirm(false)}
                        className="px-4 py-2 text-[#5288c1] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleResetConfirm}
                        className="px-4 py-2 text-[#e53935] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
            );
          })()}


          
          {/* Popup Hapus otomatis cache media */}
          {showCachePopup && (
            <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCachePopup(null)}>
              <div 
                className="w-64 bg-[#242f3d] rounded-lg shadow-2xl py-2 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {[
                  { label: '1 hari', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7f91a4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
                  { label: '1 minggu', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7f91a4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 12l-4-4-4 4"></path><path d="M12 16V8"></path></svg> },
                  { label: '1 bulan', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7f91a4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> },
                  { label: 'Tidak pernah', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7f91a4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> }
                ].map(opt => {
                  let currentValue = '1 bulan';
                  if (showCachePopup === 'private') currentValue = currentUser.keepMediaPrivate || '1 bulan';
                  if (showCachePopup === 'groups') currentValue = currentUser.keepMediaGroups || '1 hari';
                  if (showCachePopup === 'channels') currentValue = currentUser.keepMediaChannels || '1 hari';
                  if (showCachePopup === 'stories') currentValue = currentUser.keepMediaStories || '1 hari';
                  
                  const isSelected = currentValue === opt.label;
                  
                  return (
                    <button 
                      key={opt.label}
                      onClick={() => {
                        const fieldName = showCachePopup === 'private' ? 'keepMediaPrivate' : 
                                          showCachePopup === 'groups' ? 'keepMediaGroups' : 
                                          showCachePopup === 'channels' ? 'keepMediaChannels' : 'keepMediaStories';
                        handleUpdatePrivacy(fieldName, opt.label);
                        setShowCachePopup(null);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-4 hover:bg-[#17212b] transition-colors"
                    >
                      {opt.icon}
                      <span className="text-[16px] text-white flex-1 text-left">{opt.label}</span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full border-[5px] border-[#5288c1]"></div>
                      )}
                    </button>
                  );
                })}
                <div className="h-[1px] bg-black/40 my-1"></div>
                <button 
                  onClick={() => {
                    setActiveAlert("Fitur ini belum tersedia di web");
                    setShowCachePopup(null);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-[#17212b] transition-colors"
                >
                  <span className="text-[16px] text-white ml-9 text-left">Tambah pengecualian</span>
                </button>
              </div>
            </div>
          )}


          {/* Popup Hemat Data untuk Panggilan */}
          {showLessDataCallsPopup && (
            <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-sm bg-[#17212b] rounded-md shadow-2xl p-6 text-slate-100">
                <h3 className="text-[19px] font-medium text-white mb-4">Hemat Data untuk Panggilan</h3>
                <div className="space-y-4 mb-6">
                  {['Matikan', 'Hanya saat roaming', 'Hanya dengan data seluler', 'Selalu'].map((option) => (
                    <label key={option} className="flex items-center gap-4 cursor-pointer">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${(currentUser.lessDataForCalls || 'Hanya saat roaming') === option ? 'border-[#5288c1]' : 'border-[#7f91a4]'}`}>
                        {(currentUser.lessDataForCalls || 'Hanya saat roaming') === option && <div className="w-2.5 h-2.5 rounded-full bg-[#5288c1]" />}
                      </div>
                      <span className="text-[16px] text-white">{option}</span>
                      <input 
                        type="radio" 
                        name="lessDataForCalls" 
                        value={option} 
                        className="hidden" 
                        checked={(currentUser.lessDataForCalls || 'Hanya saat roaming') === option}
                        onChange={() => {
                          handleUpdatePrivacy('lessDataForCalls', option as any);
                          setShowLessDataCallsPopup(false);
                        }}
                      />
                    </label>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button 
                    onClick={() => setShowLessDataCallsPopup(false)}
                    className="text-[#5288c1] font-medium px-2 py-1 uppercase text-sm hover:bg-[#5288c1]/10 rounded transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          )}


        {/* Telegram-style Photo Selection Bottom Sheet / Modal */}
        {showPhotoPicker && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-[#17212b] border-t md:border border-[#242f3d] rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
              
              <div className="flex items-center justify-between pb-2 border-b border-[#242f3d]">
                <h3 className="text-base font-bold text-white">Foto Profil</h3>
                <button 
                  onClick={() => setShowPhotoPicker(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Button: Choose from Device / Gallery */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-[#5288c1] hover:bg-[#437ca8] active:scale-[0.99] transition-all text-white shadow-lg shadow-[#5288c1]/25 cursor-pointer font-semibold text-sm"
                >
                  <ImageIcon className="w-5 h-5 text-white" />
                  <span>Pilih Foto dari Galeri</span>
                </button>

                {currentUser.avatar && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleRemovePhoto}
                    className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-[#242f3d] hover:bg-rose-950/40 hover:border-rose-700/50 border border-[#374558] text-rose-400 active:scale-[0.99] transition-all cursor-pointer font-semibold text-xs"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Hapus Foto Profil</span>
                  </button>
                )}
              </div>

              {loading && (
                <p className="text-xs text-center text-[#5288c1] animate-pulse">
                  Menyimpan foto profil...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Modal Editor Popup for Text Fields (Name, Phone, Username, Bio) */}
        {editingField && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-[#17212b] border border-[#242f3d] rounded-2xl shadow-2xl overflow-hidden p-5 text-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-[#242f3d] pb-3">
                <h4 className="text-sm font-bold text-white capitalize">
                  {editingField === 'name' && 'Ubah Nama'}
                  {editingField === 'phone' && 'Ganti Nomor Telepon'}
                  {editingField === 'username' && 'Ubah Username'}
                  {editingField === 'bio' && 'Ubah Bio Profil'}
                </h4>
                <button 
                  onClick={() => setEditingField(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                {editingField === 'bio' ? (
                  <textarea
                    rows={3}
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    placeholder="Tulis bio profil Anda..."
                    className="w-full bg-[#242f3d] text-white px-3.5 py-2.5 rounded-xl border border-[#313d4f] text-sm focus:outline-none focus:border-[#5288c1] placeholder-[#7f91a4]"
                    autoFocus
                  />
                ) : (
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    placeholder={`Masukkan ${editingField}...`}
                    className="w-full bg-[#242f3d] text-white px-3.5 py-2.5 rounded-xl border border-[#313d4f] text-sm focus:outline-none focus:border-[#5288c1] placeholder-[#7f91a4]"
                    autoFocus
                  />
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingField(null)}
                  className="flex-1 py-2.5 bg-[#242f3d] text-xs font-bold rounded-xl text-slate-300 hover:bg-[#313d4f] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={saveEditing}
                  className="flex-1 py-2.5 bg-[#5288c1] text-xs font-bold rounded-xl text-white hover:bg-[#437ca8] shadow-md shadow-[#5288c1]/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Informational Alert Popup only for external links/placeholders */}
        {activeAlert && activeAlert === 'telegram_premium' ? (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-[#17212b] border border-[#242f3d] rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-blue-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-lg font-extrabold text-white tracking-tight">Telegram Premium</h3>
                <p className="text-xs text-[#7f91a4]">Dapatkan lencana centang verifikasi eksklusif pilihan Anda</p>
              </div>

              {/* Verified Badges Catalog */}
              <div className="bg-[#0e1621] border border-[#242f3d] rounded-xl p-4 space-y-4">
                <div className="text-xs font-semibold text-purple-400 tracking-wider uppercase">Pilihan Lencana Verifikasi</div>
                
                <div className="space-y-3">
                  {/* Biru */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#17212b]/40 border border-[#242f3d]/50">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-sky-500/10 flex items-center justify-center">
                        <VerifiedBadge isVerified={true} badgeColor="blue" size="md" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100">Biru Klasik</div>
                        <div className="text-[10px] text-[#7f91a4]">Lencana resmi Telegram</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-sky-400 bg-sky-400/10 px-2.5 py-0.5 rounded-full">Tersedia</span>
                  </div>

                  {/* Hitam */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#17212b]/40 border border-[#242f3d]/50">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-400/10 flex items-center justify-center">
                        <VerifiedBadge isVerified={true} badgeColor="black" size="md" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100">Hitam Premium</div>
                        <div className="text-[10px] text-[#7f91a4]">Lencana eksklusif Admin</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-300 bg-slate-300/10 px-2.5 py-0.5 rounded-full">Eksklusif</span>
                  </div>

                  {/* Hijau */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#17212b]/40 border border-[#242f3d]/50">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <VerifiedBadge isVerified={true} badgeColor="green" size="md" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100">Hijau Keamanan</div>
                        <div className="text-[10px] text-[#7f91a4]">Lencana moderasi tepercaya</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded-full">Populer</span>
                  </div>
                </div>
              </div>

              {/* Premium Perks */}
              <div className="text-[11px] text-[#7f91a4] space-y-1.5 px-1">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Batas ganda untuk folder obrolan, grup, dan akun</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Status emoji khusus di sebelah nama Anda</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Kecepatan download tak terbatas & prioritas penuh</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    if (onStartChatWithUsername) {
                      onStartChatWithUsername('nabilassihidiqi');
                    }
                    setActiveAlert(null);
                    onClose();
                  }}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer text-center"
                >
                  Beli Verifikasi Sekarang
                </button>
                <button
                  onClick={() => setActiveAlert(null)}
                  className="w-full py-2.5 bg-transparent hover:bg-white/5 text-xs font-medium text-[#7f91a4] hover:text-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        ) : activeAlert && (
          <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-xs bg-[#17212b] border border-[#242f3d] rounded-2xl shadow-2xl p-5 text-slate-100 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#5288c1]/20 text-[#5288c1] flex items-center justify-center mx-auto">
                <Check className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                {activeAlert}
              </p>
              <button
                onClick={() => setActiveAlert(null)}
                className="w-full py-2 bg-[#5288c1] text-xs font-bold text-white rounded-xl hover:bg-[#437ca8] transition-colors cursor-pointer mt-2"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Blokir Pengguna (Admin Only) */}
        {targetUserForBlock && (
          <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#17212b] rounded-2xl border border-[#242f3d] p-6 text-slate-100 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white">Blokir Pengguna: @{targetUserForBlock.username}</h3>
              <p className="text-xs text-[#7f91a4]">Tentukan jenis penangguhan dan alasan pelanggaran (nyepam, bot, kata tidak pantas, dll).</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#7f91a4] uppercase block mb-1">Jenis Blokir</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBlockIsPermanent(true)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${blockIsPermanent ? 'bg-[#5288c1] border-[#5288c1] text-white' : 'bg-[#0e1621] border-[#242f3d] text-[#7f91a4]'}`}
                    >
                      Permanen
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlockIsPermanent(false)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${!blockIsPermanent ? 'bg-[#5288c1] border-[#5288c1] text-white' : 'bg-[#0e1621] border-[#242f3d] text-[#7f91a4]'}`}
                    >
                      Sementara (Durasi)
                    </button>
                  </div>
                </div>

                {!blockIsPermanent && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-[#7f91a4] block">Tahun</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={blockYears}
                        onChange={e => setBlockYears(Number(e.target.value))}
                        className="w-full bg-[#0e1621] border border-[#242f3d] rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#7f91a4] block">Bulan</label>
                      <input
                        type="number"
                        min={0}
                        max={12}
                        value={blockMonths}
                        onChange={e => setBlockMonths(Number(e.target.value))}
                        className="w-full bg-[#0e1621] border border-[#242f3d] rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#7f91a4] block">Hari</label>
                      <input
                        type="number"
                        min={0}
                        max={365}
                        value={blockDays}
                        onChange={e => setBlockDays(Number(e.target.value))}
                        className="w-full bg-[#0e1621] border border-[#242f3d] rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-[#7f91a4] uppercase block mb-1">Alasan / Keterangan Pelanggaran</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      'Nyepam berlebihan di chat/grup',
                      'Aktivitas tidak wajar / Terindikasi Bot',
                      'Kata-kata tidak pantas / SARA',
                      'Ujian coba / Penangguhan sementara admin'
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBlockReason(preset)}
                        className={`px-2 py-1 rounded-lg text-[10px] border transition-colors cursor-pointer ${
                          blockReason === preset
                            ? 'bg-[#5288c1]/30 border-[#5288c1] text-white font-bold'
                            : 'bg-[#0e1621] border-[#242f3d] text-[#7f91a4] hover:text-white'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={blockReason}
                    onChange={e => setBlockReason(e.target.value)}
                    placeholder="Tulis alasan pemblokiran..."
                    className="w-full bg-[#0e1621] border border-[#242f3d] rounded-xl px-3 py-2 text-xs text-white font-medium focus:border-[#5288c1] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetUserForBlock(null)}
                  className="flex-1 py-2.5 bg-[#242f3d] hover:bg-[#2b3543] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleBlockUserAction}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {loading ? 'Memproses...' : 'Konfirmasi Blokir'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Manajemen Centang Verifikasi Akun */}
        {targetUserForVerification && (
          <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-[#17212b] border border-[#242f3d] rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5 animate-in zoom-in-95">
              <div className="flex items-center gap-3 border-b border-[#242f3d] pb-3">
                <div className="w-10 h-10 rounded-full bg-[#5288c1]/20 text-[#5288c1] font-bold flex items-center justify-center shrink-0">
                  {targetUserForVerification.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Kelola Lencana Verifikasi: {targetUserForVerification.name}
                    <VerifiedBadge isVerified={verifyIsVerified} badgeColor={verifyBadgeColor} size="sm" />
                  </h3>
                  <p className="text-[11px] text-[#7f91a4]">@{targetUserForVerification.username} • {targetUserForVerification.phone || '-'}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* 1. Status Verifikasi */}
                <div className="flex items-center justify-between bg-[#0e1621] p-3 rounded-xl border border-[#242f3d]">
                  <div>
                    <label className="text-xs font-bold text-white block">Status Centang Verifikasi</label>
                    <span className="text-[10px] text-[#7f91a4] block">Aktifkan atau nonaktifkan centang verifikasi</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVerifyIsVerified(!verifyIsVerified)}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                      verifyIsVerified ? 'bg-[#5288c1]' : 'bg-[#242f3d]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-md transform duration-200 ${
                        verifyIsVerified ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {verifyIsVerified && (
                  <>
                    {/* 2. Pilihan Warna Centang */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#7f91a4] uppercase block">Pilih Gaya Warna Centang</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'blue', label: 'Biru Resmi', colorClass: 'bg-[#0095f6]', text: 'Biru' },
                          { id: 'black', label: 'Hitam Elit', colorClass: 'bg-[#0f1419] border border-slate-700', text: 'Hitam' },
                          { id: 'green', label: 'Hijau Bisnis', colorClass: 'bg-[#25d366]', text: 'Hijau' }
                        ].map((badgeOpt) => (
                          <button
                            key={badgeOpt.id}
                            type="button"
                            onClick={() => setVerifyBadgeColor(badgeOpt.id as any)}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              verifyBadgeColor === badgeOpt.id
                                ? 'bg-[#5288c1]/20 border-[#5288c1] text-white font-bold'
                                : 'bg-[#0e1621] border-[#242f3d] text-[#7f91a4] hover:border-slate-500'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white ${badgeOpt.colorClass}`}>
                              ✓
                            </span>
                            <span className="text-[10px]">{badgeOpt.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3. Pilihan Durasi Aktif */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#7f91a4] uppercase block">Durasi Masa Berlaku Centang</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: '1d', label: '1 Hari' },
                          { id: '1w', label: '1 Minggu' },
                          { id: '1m', label: '1 Bulan' },
                          { id: '1y', label: '1 Tahun' },
                          { id: '2y', label: '2 Tahun' },
                          { id: 'permanent', label: 'Permanen (Selamanya)' }
                        ].map((dur) => (
                          <button
                            key={dur.id}
                            type="button"
                            onClick={() => setVerifyDuration(dur.id as any)}
                            className={`px-3 py-2 text-xs font-medium rounded-xl border text-center transition-all cursor-pointer ${
                              verifyDuration === dur.id
                                ? 'bg-[#5288c1]/30 border-[#5288c1] text-white font-bold'
                                : 'bg-[#0e1621] border-[#242f3d] text-[#7f91a4] hover:text-white'
                            }`}
                          >
                            {dur.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetUserForVerification(null)}
                  className="flex-1 py-2.5 bg-[#242f3d] hover:bg-[#2b3543] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveVerificationAction}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-[#5288c1] hover:bg-[#5288c1]/90 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Verifikasi'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Hapus Akun Secara Permanen */}
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-[#17212b] border border-red-500/40 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-bold text-white">Hapus Akun Permanen?</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Apakah Anda benar-benar yakin ingin menghapus akun <strong className="text-red-400">@{currentUser.username}</strong> secara permanen?
                </p>
                <p className="text-[11px] text-[#7f91a4] leading-relaxed">
                  Semua chat, foto, video, kontak, dan pesan tersimpan Anda akan langsung dihapus selamanya dari server. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  id="btn-final-execute-delete-account"
                  disabled={isDeletingAccount}
                  onClick={handleExecuteDeleteAccount}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingAccount ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menghapus Akun Permanen...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Ya, Hapus Akun Sekarang</span>
                    </>
                  )}
                </button>

                <button
                  disabled={isDeletingAccount}
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="w-full py-2.5 bg-[#242f3d] text-xs font-bold rounded-xl text-slate-300 hover:bg-[#313d4f] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
