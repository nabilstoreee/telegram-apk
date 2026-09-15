import React, { useState, useEffect } from 'react';
import { UserPlus, LogIn, AtSign, X, User as UserIcon, Phone, Eye, EyeOff, CheckCircle2, ArrowRight, Zap, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { UserAvatar } from './UserAvatar';
import { db, collection, doc, setDoc, getDocs } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: User) => void;
  existingUsers: User[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  existingUsers = [],
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  
  // Password visibility toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Safe dismiss handler: If user closes without logging in, default to first available user
  const handleDismiss = () => {
    if (onClose) {
      onClose();
    } else if (existingUsers && existingUsers.length > 0) {
      const demo = existingUsers.find((u) => u.username === 'nabilassihidiqi') || existingUsers[0];
      onLoginSuccess(demo);
    }
  };

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, existingUsers]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError('Username dan password wajib diisi.');
      setLoading(false);
      return;
    }

    // 1. Admin shortcut (Nabil Assihidiqi)
    if (cleanUsername === 'nabilassihidiqi' && (cleanPassword === 'nabilassihidiqi' || cleanPassword.length >= 3)) {
      const adminUser: User = {
        id: 'user-admin',
        username: 'nabilassihidiqi',
        name: 'Nabil Assihidiqi',
        phone: '+62 812-3456-7890',
        color: '#5288c1',
        bio: 'Telegram Creator & Administrator',
        isOnline: true,
        lastSeen: 'online',
        isVerified: true,
        unreadTotal: 0
      };
      onLoginSuccess(adminUser);
      setLoading(false);
      return;
    }

    // 2. Check LocalStorage fallback first for instant zero-latency entry
    try {
      const localUsers = JSON.parse(localStorage.getItem('tg_local_users') || '[]');
      const localFound = localUsers.find((u: any) => u.username?.toLowerCase() === cleanUsername);
      if (localFound) {
        if (!localFound.password || localFound.password === cleanPassword) {
          const { password: _, ...cleanUser } = localFound;
          onLoginSuccess(cleanUser);
          setLoading(false);
          return;
        } else {
          setError('Password salah untuk akun @' + cleanUsername);
          setLoading(false);
          return;
        }
      }
    } catch {}

    // 3. Try Backend API (/api/auth/login) with timeout to prevent hanging on Vercel cold starts
    let apiUser: User | null = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.user) {
          apiUser = data.user;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.error && res.status !== 404) {
          // If server explicitly returned invalid password
          if (errData.error.toLowerCase().includes('password')) {
            setError(errData.error);
            setLoading(false);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('API login attempt bypassed to Firestore direct fallback:', e);
    }

    if (apiUser) {
      onLoginSuccess(apiUser);
      setLoading(false);
      return;
    }

    // 4. Try Direct Cloud Firestore fallback from client SDK
    if (db) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        let firestoreFound: any = null;
        snap.forEach((d: any) => {
          const u = d.data();
          if (u.username?.toLowerCase() === cleanUsername) {
            firestoreFound = u;
          }
        });

        if (firestoreFound) {
          if (!firestoreFound.password || firestoreFound.password === cleanPassword) {
            const { password: _, ...cleanUser } = firestoreFound;
            onLoginSuccess(cleanUser as User);
            setLoading(false);
            return;
          } else {
            setError('Password salah untuk akun @' + cleanUsername);
            setLoading(false);
            return;
          }
        }
      } catch (fErr) {
        console.warn('Firestore direct query warning:', fErr);
      }
    }

    // 5. If not found in any database, notify clearly with one-click creation
    setError(`Akun @${cleanUsername} belum ditemukan. Klik tombol tab 'Register' di atas untuk mendaftarkannya.`);
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError('Username dan password wajib diisi.');
      return;
    }

    if (cleanPassword.length < 3) {
      setError('Password minimal harus 3 karakter.');
      return;
    }

    setLoading(true);

    const colors = ['#5288c1', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser: User = {
      id: `user-${Date.now()}`,
      username: cleanUsername,
      name: name.trim() || cleanUsername,
      phone: phone.trim() || `+62 ${Math.floor(800000000 + Math.random() * 100000000)}`,
      avatar: '',
      color: randomColor,
      bio: bio.trim() || 'Hey there! I am using Telegram.',
      isOnline: true,
      lastSeen: 'online',
      unreadTotal: 0
    };

    // 1. Guaranteed local persistence immediately
    try {
      const localUsers = JSON.parse(localStorage.getItem('tg_local_users') || '[]');
      const filtered = localUsers.filter((u: any) => u.username?.toLowerCase() !== cleanUsername);
      filtered.push({ ...newUser, password: cleanPassword });
      localStorage.setItem('tg_local_users', JSON.stringify(filtered));
    } catch (lsErr) {
      console.warn('LocalStorage save error:', lsErr);
    }

    // 2. Direct Cloud Firestore save
    if (db) {
      try {
        await setDoc(doc(db, 'users', newUser.id), {
          ...newUser,
          password: cleanPassword
        });
        console.log('[Register] Saved to Firestore:', newUser.id);
      } catch (fsErr) {
        console.warn('[Register] Firestore save warning:', fsErr);
      }
    }

    // 3. Sync to backend API in parallel (won't block UI if sleeping)
    fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cleanUsername,
        password: cleanPassword,
        name: newUser.name,
        phone: newUser.phone,
        bio: newUser.bio,
      }),
    }).catch((apiErr) => {
      console.warn('[Register] Backend API sync note:', apiErr);
    });

    // 4. Instant successful registration and automatic login
    setSuccessMessage(`Selamat datang, @${cleanUsername}! Membuka Telegram...`);
    setTimeout(() => {
      onLoginSuccess(newUser);
      setLoading(false);
    }, 450);
  };

  return (
    <div 
      id="auth-modal-overlay" 
      onClick={(e) => { if (e.target === e.currentTarget) handleDismiss(); }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div 
        id="auth-modal-card" 
        className="w-full max-w-[420px] bg-[#17212b] rounded-[28px] p-6 sm:p-7 shadow-2xl border border-[#242f3d] flex flex-col items-center text-slate-100 relative max-h-[92vh] overflow-y-auto custom-scrollbar"
      >
        {/* Always visible Close Button */}
        <button
          id="btn-close-auth-modal"
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-[#7f91a4] hover:text-white p-2 rounded-full hover:bg-[#242f3d] transition-all cursor-pointer z-10"
          title="Tutup / Buka Telegram"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Telegram Icon */}
        <div className="w-16 h-16 bg-gradient-to-tr from-[#427db9] to-[#5ba0e0] rounded-full flex items-center justify-center mb-3 shadow-xl shadow-[#5288c1]/30 transition-transform hover:scale-105 shrink-0">
          <svg viewBox="0 0 24 24" width="38" height="38" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-0.5 tracking-tight">Telegram</h1>
        <p className="text-xs text-[#7f91a4] mb-4 text-center">
          {mode === 'login' ? 'Masuk ke akun Telegram Anda' : 'Buat akun Telegram baru'}
        </p>

        {/* Tab Toggle Pill */}
        <div className="w-full flex p-1 bg-[#0e1621] rounded-xl mb-4 border border-[#242f3d]">
          <button
            id="tab-btn-login"
            onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'login'
                ? 'bg-[#242f3d] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>
          <button
            id="tab-btn-register"
            onClick={() => { setMode('register'); setError(''); setSuccessMessage(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'register'
                ? 'bg-[#242f3d] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div id="auth-success-banner" className="w-full p-3 mb-4 text-xs bg-emerald-950/60 border border-emerald-700/80 text-emerald-300 rounded-xl flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div id="auth-error-banner" className="w-full p-3 mb-4 text-xs bg-red-950/50 border border-red-800/80 text-red-300 rounded-xl flex items-center gap-2 animate-in fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="w-full">
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Username (@handle)
                </label>
                <div className="relative">
                  <input
                    id="login-username-input"
                    type="text"
                    required
                    placeholder="misal: nabil"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full bg-[#242f3d] border border-[#313d4f] focus:border-[#5288c1] rounded-xl py-3 pl-4 pr-10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#5288c1] transition-all placeholder-slate-500"
                  />
                  <AtSign className="w-4 h-4 text-[#5288c1] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password-input"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan password Anda"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#242f3d] border border-[#313d4f] focus:border-[#5288c1] rounded-xl py-3 pl-4 pr-11 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#5288c1] transition-all placeholder-slate-500"
                  />
                  <button
                    id="toggle-login-password-visibility"
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md transition-colors"
                    title={showLoginPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4 text-[#5288c1]" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                id="submit-login-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-[#5288c1] hover:bg-[#4374a8] active:scale-[0.99] text-white font-bold py-3.5 rounded-xl text-sm tracking-wider uppercase shadow-md shadow-[#5288c1]/25 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Log In</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="w-full space-y-3.5">
              
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nama Lengkap / Tampilan *
                </label>
                <div className="relative">
                  <input
                    id="reg-name-input"
                    type="text"
                    required
                    placeholder="misal: Nabil Pratama"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#242f3d] border border-[#313d4f] focus:border-[#5288c1] rounded-xl py-2.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#5288c1] transition-all placeholder-slate-500"
                  />
                  <UserIcon className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Username (@handle) *
                </label>
                <div className="relative">
                  <input
                    id="reg-username-input"
                    type="text"
                    required
                    placeholder="misal: nabil"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full bg-[#242f3d] border border-[#313d4f] focus:border-[#5288c1] rounded-xl py-2.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#5288c1] transition-all placeholder-slate-500"
                  />
                  <AtSign className="w-4 h-4 text-[#5288c1] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Password *
                </label>
                <div className="relative">
                  <input
                    id="reg-password-input"
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimal 3 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#242f3d] border border-[#313d4f] focus:border-[#5288c1] rounded-xl py-2.5 pl-4 pr-11 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#5288c1] transition-all placeholder-slate-500"
                  />
                  <button
                    id="toggle-register-password-visibility"
                    type="button"
                    onClick={() => setShowRegisterPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md transition-colors"
                    title={showRegisterPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showRegisterPassword ? (
                      <EyeOff className="w-4 h-4 text-[#5288c1]" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nomor HP (Opsional)
                </label>
                <div className="relative">
                  <input
                    id="reg-phone-input"
                    type="text"
                    placeholder="+62 812 3456 7890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#242f3d] border border-[#313d4f] focus:border-[#5288c1] rounded-xl py-2.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#5288c1] transition-all placeholder-slate-500"
                  />
                  <Phone className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <button
                id="submit-register-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-[#5288c1] hover:bg-[#4374a8] active:scale-[0.99] text-white font-bold py-3.5 rounded-xl text-sm tracking-wider uppercase shadow-md shadow-[#5288c1]/25 transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Daftar Akun Baru</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Quick 1-Click Access for Vercel / Instant Demo */}
        <div className="w-full mt-5 pt-4 border-t border-[#242f3d]/80 flex flex-col gap-2">
          <div className="text-[11px] font-semibold text-[#7f91a4] uppercase tracking-wider text-center mb-0.5">
            ⚡ Akses Cepat (1-Klik Masuk)
          </div>
          <button
            type="button"
            onClick={() => {
              onLoginSuccess({
                id: 'user-admin',
                username: 'nabilassihidiqi',
                name: 'Nabil Assihidiqi',
                phone: '+62 812-3456-7890',
                color: '#5288c1',
                bio: 'Telegram Creator & Administrator',
                isOnline: true,
                lastSeen: 'online',
                isVerified: true,
                unreadTotal: 0
              });
            }}
            className="w-full py-2.5 px-3 bg-[#242f3d] hover:bg-[#2b394a] active:bg-[#1e2733] text-slate-200 hover:text-white rounded-xl text-xs font-medium transition-all flex items-center justify-between border border-[#313d4f]/60 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#5288c1]" />
              <span className="font-semibold">Masuk Akun Admin (@nabilassihidiqi)</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={() => {
              const guestId = `guest-${Date.now().toString().slice(-4)}`;
              onLoginSuccess({
                id: guestId,
                username: 'tamu_telegram',
                name: 'Pengguna Tamu',
                phone: '+62 888-0000-1234',
                color: '#10b981',
                bio: 'Telegram Web Guest Explorer',
                isOnline: true,
                lastSeen: 'online',
                unreadTotal: 0
              });
            }}
            className="w-full py-2 px-3 bg-transparent hover:bg-[#242f3d]/40 text-[#7f91a4] hover:text-slate-300 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Masuk Langsung sebagai Tamu</span>
          </button>
        </div>

      </div>
    </div>
  );
};
