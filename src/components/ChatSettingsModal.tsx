import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Moon, Globe, Play, Smile, Image as ImageIcon, 
  PaintBucket, Sun, Search, Volume2, Mic, Music, Smartphone, 
  Share2, Eye, Send, MapPin, Check, MoreVertical, Trash2, 
  BellOff, FolderMinus, Settings, Type, Camera, X 
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { MediaQualitySettingsSection } from './MediaQualitySettingsSection';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatSettingsModal({ isOpen, onClose }: ChatSettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  
  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
  
  // Dummy states for the UI to be interactive even if it doesn't do anything globally
  const [dummyStates, setDummyStates] = useState({
    autoDarkMode: false,
    appBrowser: true,
    animations: true,
    tapToNextMedia: true,
    raiseToListen: true,
    raiseToSpeak: false,
    pauseMusicRecord: true,
    pauseMusicMedia: false,
    directShare: true,
    show18Plus: true,
    chatListLayout: 'dua', // 'dua' | 'tiga'
  });

  const [activeGesture, setActiveGesture] = useState('hapus');
  const [nameColorIdx, setNameColorIdx] = useState(0);
  const nameColors = ['#5288c1', '#e55757', '#4fae4e', '#e8a838', '#8956e3', '#00bcd4'];
  const [showThemeSearch, setShowThemeSearch] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [stickerToggles, setStickerToggles] = useState({ largeEmoji: true, suggestStickers: true, loopAnimations: true });
  const [showBackgrounds, setShowBackgrounds] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const backgrounds = [
    { id: 'default', url: 'https://web.telegram.org/a/chat-bg-pattern-light.png', name: 'Bawaan' },
    { id: 'solid', url: 'none', name: 'Warna Solid' },
    { id: 'gradient', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600&auto=format&fit=crop', name: 'Gradien' },
    { id: 'dark-lines', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop', name: 'Garis Gelap' },
    { id: 'abstract', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop', name: 'Abstrak' }
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG to save localStorage quota
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
          updateSettings({ chatBackground: compressedDataUrl });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const getGestureIcon = () => {
    switch(activeGesture) {
      case 'senyap': return <BellOff className="w-6 h-6" />;
      case 'folder': return <FolderMinus className="w-6 h-6" />;
      case 'hapus': default: return <Trash2 className="w-6 h-6" />;
    }
  };
  
  const getGestureColor = () => {
    switch(activeGesture) {
      case 'senyap': return '#7f91a4';
      case 'folder': return '#5288c1';
      case 'hapus': default: return '#e55757';
    }
  };

  if (!isOpen) return null;

  const toggleDummy = (key: keyof typeof dummyStates) => {
    setDummyStates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const ToggleRow = ({ label, sublabel, checked, onChange, icon: Icon }: any) => (
    <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#2b3543] transition-colors" onClick={onChange}>
      <div className="flex items-center gap-4">
        {Icon && <Icon className="w-6 h-6 text-[#7f91a4]" />}
        <div>
          <div className="text-[15px] text-slate-200">{label}</div>
          {sublabel && <div className="text-xs text-[#7f91a4] mt-0.5">{sublabel}</div>}
        </div>
      </div>
      <div className={`w-10 h-3.5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${checked ? 'bg-[#5288c1]/50' : 'bg-[#7f91a4]/50'}`}>
        <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-4 bg-[#5288c1]' : '-translate-x-1'}`}></div>
      </div>
    </div>
  );

  const themes = [
    { name: 'Bawaan', id: 'default', color: '#17212b', accent: '#5288c1' },
    { name: 'Vintage', id: 'vintage', color: '#f5efe6', accent: '#d2b48c' },
    { name: 'Aqua', id: 'aqua', color: '#0f2027', accent: '#203a43' },
    { name: 'Premium', id: 'premium', color: '#1a1a2e', accent: '#16213e' },
    { name: 'Turbo', id: 'turbo', color: '#000000', accent: '#ff0000' },
    { name: 'Nox', id: 'nox', color: '#121212', accent: '#bb86fc' },
  ];

  return (
    <div 
      id="chat-settings-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4"
    >
      <div 
        id="chat-settings-card"
        className="w-full h-full md:w-[420px] md:h-[90vh] md:max-h-[820px] bg-[#0e1621] md:rounded-2xl md:border md:border-[#242f3d] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-200"
      >
        
        {/* Header */}
        <div className="flex items-center gap-3 p-3.5 bg-[#17212b] border-b border-[#0e1621] shrink-0">
          <button 
            id="btn-back-chat-settings"
            onClick={onClose} 
            className="p-2 hover:bg-[#2b3543] rounded-full transition-colors cursor-pointer text-[#7f91a4] hover:text-white"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-white flex-1 truncate">Pengaturan Obrolan</h2>
          <button 
            id="btn-close-chat-settings"
            onClick={onClose} 
            className="p-2 hover:bg-[#2b3543] rounded-full transition-colors cursor-pointer text-[#7f91a4] hover:text-white"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 custom-scrollbar">
          
          {/* Text Size Setting */}
          <div className="bg-[#17212b] p-4 shadow-sm mb-2">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[#5288c1] font-medium text-sm">Ukuran teks pesan</span>
              <span className="text-[#5288c1] font-medium text-sm">{settings.textSize}</span>
            </div>
            <input 
              type="range" min="12" max="30" value={settings.textSize}
              onChange={(e) => updateSettings({ textSize: Number(e.target.value) })}
              className="w-full h-1 bg-[#2b3543] rounded-lg appearance-none cursor-pointer accent-[#5288c1]"
            />

            {/* Chat Preview */}
            <div className="mt-6 -mx-4 pb-2" style={{
              backgroundImage: settings.chatBackground && settings.chatBackground !== 'none' ? `url('${settings.chatBackground}')` : 'none',
              backgroundSize: settings.chatBackground && (settings.chatBackground.includes('unsplash') || settings.chatBackground.startsWith('data:image')) ? 'cover' : '300px',
              backgroundPosition: settings.chatBackground && (settings.chatBackground.includes('unsplash') || settings.chatBackground.startsWith('data:image')) ? 'center' : 'auto',
              backgroundBlendMode: settings.chatBackground && (settings.chatBackground.includes('unsplash') || settings.chatBackground.startsWith('data:image')) ? 'normal' : 'overlay',
              backgroundColor: '#17212b'
            }}>
              <div className="px-4 space-y-2">
                <div className="max-w-[85%] mr-auto">
                  <div className="bg-[#2b3543] text-white px-3 py-2 shadow-sm relative"
                    style={{ borderRadius: `${settings.messageCorners}px ${settings.messageCorners}px ${settings.messageCorners}px 0`, fontSize: `${settings.textSize}px` }}>
                    <div className="text-[#5288c1] text-xs font-medium mb-0.5 leading-tight">Pengembang</div>
                    <div className="leading-tight break-words">Hai Diang! Selamat Pagi! 👋<br/>Kamu tahu sekarang jam berapa?</div>
                    <div className="flex justify-end mt-1"><span className="text-[10px] text-[#7f91a4] leading-none">09:21</span></div>
                  </div>
                </div>
                <div className="max-w-[85%] ml-auto">
                  <div className="bg-[#5288c1] text-white px-3 py-2 shadow-sm relative"
                    style={{ borderRadius: `${settings.messageCorners}px ${settings.messageCorners}px 0 ${settings.messageCorners}px`, fontSize: `${settings.textSize}px` }}>
                    <div className="leading-tight break-words">Sekarang masih pagi di Jakarta 😎</div>
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] text-blue-200 leading-none flex items-center gap-1">09:36 <Check className="w-3 h-3" /></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-2 flex flex-col gap-1">
              <button onClick={() => setShowBackgrounds(!showBackgrounds)} className="flex items-center gap-4 py-3 text-slate-200 hover:bg-[#2b3543] rounded-lg px-2 transition-colors">
                <ImageIcon className={`w-6 h-6 ${showBackgrounds ? 'text-[#5288c1]' : 'text-[#7f91a4]'}`} />
                <span className="text-[15px]">Ganti Latar Obrolan</span>
              </button>
              
              {showBackgrounds && (
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar px-2 mb-2">
                  <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0">
                    <div className="w-[60px] h-[80px] rounded-lg border-2 border-[#2b3543] relative overflow-hidden flex items-center justify-center bg-[#17212b] hover:bg-[#242f3d] transition-colors">
                      <Camera className="w-6 h-6 text-[#7f91a4]" />
                    </div>
                    <span className="text-[10px] text-center w-full truncate px-1 text-slate-300">Galeri</span>
                  </div>
                  <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
                  
                  {settings.chatBackground?.startsWith('data:image') && (
                    <div className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0">
                      <div 
                        className={`w-[60px] h-[80px] rounded-lg border-2 border-[#5288c1] relative overflow-hidden`}
                        style={{ backgroundColor: '#17212b', backgroundImage: `url('${settings.chatBackground}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      >
                        <div className="absolute inset-0 bg-[#5288c1]/20 flex items-center justify-center"><Check className="w-6 h-6 text-white" /></div>
                      </div>
                      <span className="text-[10px] text-center w-full truncate px-1 text-[#5288c1] font-medium">Kustom</span>
                    </div>
                  )}

                  {backgrounds.map(bg => (
                    <div key={bg.id} onClick={() => updateSettings({ chatBackground: bg.url })} className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0">
                      <div 
                        className={`w-[60px] h-[80px] rounded-lg border-2 ${settings.chatBackground === bg.url ? 'border-[#5288c1]' : 'border-[#2b3543]'} relative overflow-hidden`}
                        style={{ backgroundColor: '#17212b', backgroundImage: bg.url !== 'none' ? `url('${bg.url}')` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}
                      >
                        {settings.chatBackground === bg.url && <div className="absolute inset-0 bg-[#5288c1]/20 flex items-center justify-center"><Check className="w-6 h-6 text-white" /></div>}
                      </div>
                      <span className={`text-[10px] text-center w-full truncate px-1 ${settings.chatBackground === bg.url ? 'text-[#5288c1] font-medium' : 'text-slate-300'}`}>{bg.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => setNameColorIdx(prev => (prev + 1) % nameColors.length)} className="flex justify-between items-center py-3 text-slate-200 hover:bg-[#2b3543] rounded-lg px-2 transition-colors">
                <div className="flex items-center gap-4">
                  <PaintBucket className="w-6 h-6 text-[#7f91a4]" />
                  <span className="text-[15px]">Ubah Warna Nama</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 mr-2 opacity-50">
                    {nameColors.map((color, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${i === nameColorIdx ? 'ring-1 ring-white/50' : ''}`} style={{ backgroundColor: color }}></div>
                    ))}
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded" style={{ color: nameColors[nameColorIdx], backgroundColor: `${nameColors[nameColorIdx]}1A` }}>DEVELOPER</span>
                </div>
              </button>
            </div>
          </div>

          {/* Warna Tema Section */}
          <div className="bg-[#17212b] p-4 shadow-sm mb-2">
            <span className="text-[#5288c1] font-medium text-sm block mb-4">Warna Tema</span>
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar -mx-4 px-4">
              {themes.map(t => (
                <div key={t.id} onClick={() => updateSettings({ theme: t.id })} className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0">
                  <div className={`w-[70px] h-[90px] rounded-lg border-2 ${settings.theme === t.id ? 'border-[#5288c1]' : 'border-transparent'} relative flex items-center justify-center overflow-hidden`} style={{ backgroundColor: t.color }}>
                    <div className="absolute inset-0 opacity-20" style={{ 
                      backgroundImage: settings.chatBackground && settings.chatBackground !== 'none' ? `url('${settings.chatBackground}')` : 'none', 
                      backgroundSize: settings.chatBackground && (settings.chatBackground.includes('unsplash') || settings.chatBackground.startsWith('data:image')) ? 'cover' : '100px',
                      backgroundPosition: 'center'
                    }}></div>
                    <div className="w-[50px] h-[15px] rounded-full mb-10 z-10" style={{ backgroundColor: t.accent }}></div>
                    <div className="w-[40px] h-[10px] rounded-full absolute bottom-4 left-3 z-10" style={{ backgroundColor: '#2b3543' }}></div>
                  </div>
                  <span className={`text-xs ${settings.theme === t.id ? 'text-[#5288c1] font-medium' : 'text-slate-300'}`}>{t.name}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[#0e1621] mt-2 pt-2 -mx-4 px-2">
              <button onClick={() => updateSettings({ theme: settings.theme === 'vintage' ? 'default' : 'vintage' })} className="w-full flex items-center gap-4 py-3 text-slate-200 hover:bg-[#2b3543] rounded-lg px-2 transition-colors">
                {settings.theme === 'vintage' ? <Moon className="w-6 h-6 text-[#7f91a4]" /> : <Sun className="w-6 h-6 text-[#7f91a4]" />}
                <span className="text-[15px]">{settings.theme === 'vintage' ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang'}</span>
              </button>
              {showThemeSearch ? (
                <div className="flex items-center gap-4 py-2 px-2 transition-colors relative">
                  <Search className="w-5 h-5 text-[#7f91a4] absolute left-4" />
                  <input type="text" placeholder="Cari Tema..." autoFocus className="w-full bg-[#0e1621] text-slate-200 rounded-lg pl-10 pr-4 py-2 outline-none border border-[#2b3543] focus:border-[#5288c1] transition-colors" />
                  <button onClick={() => setShowThemeSearch(false)} className="text-[#5288c1] text-sm font-medium pr-2">Batal</button>
                </div>
              ) : (
                <button onClick={() => setShowThemeSearch(true)} className="w-full flex items-center gap-4 py-3 text-slate-200 hover:bg-[#2b3543] rounded-lg px-2 transition-colors">
                  <PaintBucket className="w-6 h-6 text-[#7f91a4]" />
                  <span className="text-[15px]">Cari Tema</span>
                </button>
              )}
            </div>
          </div>

          {/* Message Corners */}
          <div className="bg-[#17212b] p-4 shadow-sm mb-2">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[#5288c1] font-medium text-sm">Pojok pesan</span>
              <span className="text-[#5288c1] font-medium text-sm">{settings.messageCorners}</span>
            </div>
            <input 
              type="range" min="0" max="24" value={settings.messageCorners}
              onChange={(e) => updateSettings({ messageCorners: Number(e.target.value) })}
              className="w-full h-1 bg-[#2b3543] rounded-lg appearance-none cursor-pointer accent-[#5288c1]"
            />
          </div>

          {/* Chat List Display */}
          <div className="bg-[#17212b] p-4 shadow-sm mb-2">
            <span className="text-[#5288c1] font-medium text-sm block mb-4">Tampilan daftar obrolan</span>
            <div className="flex gap-4">
              <div 
                className="flex-1 flex flex-col items-center gap-3 cursor-pointer"
                onClick={() => updateSettings({chatListLayout: 'dua'})}
              >
                <div className={`w-full h-[60px] rounded-lg border-2 flex items-center px-3 gap-3 ${settings.chatListLayout === 'dua' ? 'border-[#5288c1] bg-[#2b3543]' : 'border-[#2b3543]'}`}>
                   <div className="w-8 h-8 rounded-full bg-[#3d4b5c]"></div>
                   <div className="flex-1 space-y-2">
                     <div className="h-2 bg-[#3d4b5c] rounded w-3/4"></div>
                     <div className="h-2 bg-[#3d4b5c] rounded w-full"></div>
                   </div>
                   {settings.chatListLayout === 'dua' && <div className="w-4 h-4 rounded-full border-4 border-[#5288c1] bg-[#17212b]"></div>}
                   {settings.chatListLayout !== 'dua' && <div className="w-4 h-4 rounded-full border-2 border-[#7f91a4]"></div>}
                </div>
                <span className="text-sm">Dua baris</span>
              </div>
              <div 
                className="flex-1 flex flex-col items-center gap-3 cursor-pointer"
                onClick={() => updateSettings({chatListLayout: 'tiga'})}
              >
                <div className={`w-full h-[60px] rounded-lg border-2 flex items-center px-3 gap-3 ${settings.chatListLayout === 'tiga' ? 'border-[#5288c1] bg-[#2b3543]' : 'border-[#2b3543]'}`}>
                   <div className="w-8 h-8 rounded-full bg-[#3d4b5c]"></div>
                   <div className="flex-1 space-y-1.5">
                     <div className="h-1.5 bg-[#3d4b5c] rounded w-3/4"></div>
                     <div className="h-1.5 bg-[#3d4b5c] rounded w-full"></div>
                     <div className="h-1.5 bg-[#3d4b5c] rounded w-1/2"></div>
                   </div>
                   {settings.chatListLayout === 'tiga' && <div className="w-4 h-4 rounded-full border-4 border-[#5288c1] bg-[#17212b]"></div>}
                   {settings.chatListLayout !== 'tiga' && <div className="w-4 h-4 rounded-full border-2 border-[#7f91a4]"></div>}
                </div>
                <span className="text-sm">Tiga baris</span>
              </div>
            </div>
          </div>

          {/* Swipe Gestures */}
          <div className="bg-[#17212b] p-4 shadow-sm mb-2">
            <span className="text-[#5288c1] font-medium text-sm block mb-4">Gestur geser untuk obrolan</span>
            <div className="flex mb-4">
               {/* Swipe visualization */}
               <div className="w-2/3 h-14 bg-[#2b3543] rounded-l-lg border border-[#3d4b5c] border-r-0 flex items-center px-3 gap-3 opacity-60">
                 <div className="w-8 h-8 rounded-full bg-[#3d4b5c]"></div>
                 <div className="flex-1 space-y-2">
                   <div className="h-2 bg-[#3d4b5c] rounded w-3/4"></div>
                   <div className="h-2 bg-[#3d4b5c] rounded w-full"></div>
                 </div>
               </div>
               <div className="w-16 h-14 flex flex-col items-center justify-center text-white transition-colors" style={{ backgroundColor: getGestureColor() }}>
                 {getGestureIcon()}
               </div>
               <div className="flex-1 flex flex-col pl-4 border-l border-[#2b3543]">
                 <span onClick={() => setActiveGesture('senyap')} className={`text-xs text-center mb-1 cursor-pointer transition-colors ${activeGesture === 'senyap' ? 'text-[#5288c1] font-medium border-b-2 border-[#5288c1] pb-1' : 'text-[#7f91a4]'}`}>Senyap</span>
                 <span onClick={() => setActiveGesture('hapus')} className={`text-sm text-center cursor-pointer transition-colors ${activeGesture === 'hapus' ? 'text-[#5288c1] font-medium border-b-2 border-[#5288c1] pb-1' : 'text-[#7f91a4]'}`}>Hapus</span>
                 <span onClick={() => setActiveGesture('folder')} className={`text-xs text-center mt-1 cursor-pointer transition-colors ${activeGesture === 'folder' ? 'text-[#5288c1] font-medium border-b-2 border-[#5288c1] pb-1' : 'text-[#7f91a4]'}`}>Ganti Folder</span>
               </div>
            </div>
            <p className="text-xs text-[#7f91a4]">Pilih tindakan yang ingin Anda lakukan ketika menggeser ke kiri dalam daftar obrolan.</p>
          </div>

          {/* Main Toggles */}
          <div className="bg-[#17212b] py-2 mb-2 shadow-sm">
            <ToggleRow icon={Moon} label="Mode Gelap Otomatis" sublabel="Mati" checked={dummyStates.autoDarkMode} onChange={() => toggleDummy('autoDarkMode')} />
            <ToggleRow icon={Globe} label="Peramban Aplikasi" sublabel="Buka tautan eksternal dalam aplikasi" checked={dummyStates.appBrowser} onChange={() => toggleDummy('appBrowser')} />
            <ToggleRow icon={Play} label="Animasi" sublabel="Kurangi efek gerak untuk menghemat daya" checked={dummyStates.animations} onChange={() => toggleDummy('animations')} />
            <div onClick={() => setShowStickers(!showStickers)} className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-[#2b3543] transition-colors">
              <Smile className={`w-6 h-6 ${showStickers ? 'text-[#5288c1]' : 'text-[#7f91a4]'}`} />
              <div>
                <div className="text-[15px] text-slate-200">Stiker dan Emoji</div>
                <div className="text-xs text-[#7f91a4] mt-0.5">Kelola stiker, emoji, dan reaksi</div>
              </div>
            </div>
            {showStickers && (
              <div className="bg-[#0e1621] py-2 pl-4 border-t border-[#17212b]">
                <ToggleRow label="Emoji Besar" checked={stickerToggles.largeEmoji} onChange={() => setStickerToggles(prev => ({...prev, largeEmoji: !prev.largeEmoji}))} />
                <ToggleRow label="Sarankan Stiker berdasarkan Emoji" checked={stickerToggles.suggestStickers} onChange={() => setStickerToggles(prev => ({...prev, suggestStickers: !prev.suggestStickers}))} />
                <ToggleRow label="Putar Ulang Stiker Animasi" checked={stickerToggles.loopAnimations} onChange={() => setStickerToggles(prev => ({...prev, loopAnimations: !prev.loopAnimations}))} />
              </div>
            )}
          </div>

          {/* Kualitas Media Unggahan & Unduhan */}
          <MediaQualitySettingsSection />

          {/* Media dan Suara */}
          <div className="bg-[#17212b] py-2 mb-2 shadow-sm">
            <div className="px-4 py-2"><span className="text-[#5288c1] font-medium text-sm">Media dan Suara</span></div>
            <ToggleRow label="Ketuk utk lihat media berikut" sublabel="Ketuk dekat pinggir layar ketika melihat media untuk navigasi" checked={dummyStates.tapToNextMedia} onChange={() => toggleDummy('tapToNextMedia')} />
            <ToggleRow label="Angkat untuk Dengar" sublabel="Pindah suara ke earphone dengan menaikkan ponsel ke telinga" checked={dummyStates.raiseToListen} onChange={() => toggleDummy('raiseToListen')} />
            <ToggleRow label="Angkat untuk Bicara" sublabel="Rekam pesan suara dengan mengangkat ponsel ke telinga" checked={dummyStates.raiseToSpeak} onChange={() => toggleDummy('raiseToSpeak')} />
            <ToggleRow label="Jeda musik saat merekam" sublabel="Jeda musik saat Anda mulai merekam pesan video" checked={dummyStates.pauseMusicRecord} onChange={() => toggleDummy('pauseMusicRecord')} />
            <ToggleRow label="Jeda musik saat memutar media" checked={dummyStates.pauseMusicMedia} onChange={() => toggleDummy('pauseMusicMedia')} />
            
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#2b3543] transition-colors">
              <span className="text-[15px] text-slate-200">Mikrofon untuk pesan suara</span>
              <span className="text-sm text-[#5288c1]">Bawaan</span>
            </div>
          </div>

          {/* Pengaturan Lainnya */}
          <div className="bg-[#17212b] py-2 mb-8 shadow-sm">
            <div className="px-4 py-2"><span className="text-[#5288c1] font-medium text-sm">Pengaturan Lainnya</span></div>
            
            <ToggleRow label="Bagikan Langsung" sublabel="Tampilkan obrolan terkini di menu berbagi" checked={dummyStates.directShare} onChange={() => toggleDummy('directShare')} />
            <ToggleRow label="Perlihatkan Konten 18+" sublabel="Jangan sembunyikan media yang berisi konten yang diperbolehkan" checked={dummyStates.show18Plus} onChange={() => toggleDummy('show18Plus')} />
            
            {/* The real Kirim dengan Enter */}
            <ToggleRow 
              label="Kirim dengan Enter" 
              checked={settings.sendWithEnter} 
              onChange={() => updateSettings({ sendWithEnter: !settings.sendWithEnter })} 
            />

            <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#2b3543] transition-colors">
              <span className="text-[15px] text-slate-200">Satuan Jarak</span>
              <span className="text-sm text-[#5288c1]">Otomatis</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

