import React, { useEffect } from 'react';
import { SmilePlus, X } from 'lucide-react';
import { User } from '../types';

interface StatusEmojiModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSelectEmoji: (emoji: string) => void;
}

export const StatusEmojiModal: React.FC<StatusEmojiModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectEmoji,
}) => {
  // Close on Escape
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

  const emojiList = [
    { emoji: '⚡', name: 'Energi / Online' },
    { emoji: '🔥', name: 'Hot / Sibuk' },
    { emoji: '👑', name: 'VIP / Boss' },
    { emoji: '💎', name: 'Premium' },
    { emoji: '🚀', name: 'Fokus Kerja' },
    { emoji: '💻', name: 'Coding' },
    { emoji: '🎧', name: 'Musik' },
    { emoji: '🎮', name: 'Gaming' },
    { emoji: '☕', name: 'Santai' },
    { emoji: '🏖️', name: 'Liburan' },
    { emoji: '❤️', name: 'Bahagia' },
    { emoji: '⭐', name: 'Bintang' },
    { emoji: '🌙', name: 'Istirahat' },
    { emoji: '✈️', name: 'Perjalanan' },
  ];

  return (
    <div 
      id="status-emoji-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-sm bg-[#17212b] border border-[#242f3d] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="p-4 bg-[#17212b] flex items-center justify-between border-b border-[#242f3d]">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <SmilePlus className="w-4 h-4 text-[#5288c1]" />
            <span>Pasang Status Emoji</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-[#242f3d] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-xs text-[#7f91a4] text-center">
            Pilih status emoji Telegram yang akan tampil di samping nama profil Anda.
          </p>

          <div className="grid grid-cols-4 gap-2.5">
            {emojiList.map((item) => {
              const isSelected = currentUser.statusEmoji === item.emoji;
              return (
                <button
                  key={item.emoji}
                  onClick={() => {
                    onSelectEmoji(item.emoji);
                    onClose();
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#5288c1]/25 border-[#5288c1] scale-105 shadow-sm'
                      : 'bg-[#242f3d] border-[#313d4f] hover:border-[#5288c1]'
                  }`}
                >
                  <span className="text-2xl mb-1">{item.emoji}</span>
                  <span className="text-[9px] text-[#7f91a4] text-center truncate max-w-full font-semibold">
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>

          {currentUser.statusEmoji && (
            <button
              onClick={() => {
                onSelectEmoji('');
                onClose();
              }}
              className="w-full py-2 bg-[#242f3d] text-xs font-semibold text-red-400 hover:bg-red-950/40 rounded-xl transition-colors border border-red-900/40"
            >
              Hapus Status Emoji
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
