import React from 'react';
import { HelpCircle, MessageSquare, Users, Mic, Smile, X, Smartphone } from 'lucide-react';

interface FeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeaturesModal: React.FC<FeaturesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const features = [
    {
      icon: MessageSquare,
      title: 'Obrolan Antar Pengguna Real-Time',
      desc: 'Kirim dan terima pesan langsung ke sesama pengguna dengan tanda centang ganda dan status aktif.',
    },
    {
      icon: Smartphone,
      title: 'Multi-Akun Instan',
      desc: 'Beralih antar akun di Side Drawer tanpa logout, memudahkan pengujian chat antar user dalam satu layar.',
    },
    {
      icon: Mic,
      title: 'Pesan Suara (Voice Notes)',
      desc: 'Rekam dan dengarkan voice note langsung dengan visualisasi waveform audio yang interaktif.',
    },
    {
      icon: Smile,
      title: 'Reaksi Emoji & Stiker',
      desc: 'Beri reaksi cepat pada setiap pesan (👍, ❤️, 🔥, 😂) dan pasang status emoji di profil Telegram Anda.',
    },
    {
      icon: Users,
      title: 'Grup & Channel Komunitas',
      desc: 'Buat grup baru dengan banyak anggota atau kelola saluran siaran seperti di aplikasi Telegram asli.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#17212b] border border-[#242f3d] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 bg-[#17212b] flex items-center justify-between border-b border-[#242f3d]">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <HelpCircle className="w-5 h-5 text-[#5288c1]" />
            <span>Fitur Utama Telegram</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-[#242f3d] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature List */}
        <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
          {features.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#242f3d] border border-[#313d4f]">
                <div className="w-10 h-10 rounded-xl bg-[#17212b] text-[#5288c1] flex items-center justify-center shrink-0 mt-0.5 border border-[#313d4f]">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-0.5">{item.title}</h4>
                  <p className="text-xs text-[#7f91a4] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#17212b] border-t border-[#242f3d] text-center">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#5288c1] text-xs font-bold rounded-xl text-white hover:bg-[#4374a8] shadow-md shadow-[#5288c1]/25 transition-all cursor-pointer"
          >
            Mengerti & Lanjutkan Obrolan
          </button>
        </div>

      </div>
    </div>
  );
};
