import React, { useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, X, History } from 'lucide-react';
import { User } from '../types';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, currentUser }) => {
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

  return (
    <div 
      id="wallet-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-[#17212b] border border-[#242f3d] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="p-4 bg-[#17212b] flex items-center justify-between border-b border-[#242f3d]">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <Wallet className="w-5 h-5 text-[#5288c1]" />
            <span>Telegram Wallet (TON)</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-[#242f3d] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Card */}
        <div className="p-6 text-center space-y-6">
          <div>
            <span className="text-xs text-[#7f91a4] uppercase tracking-wider block font-bold">Total Saldo</span>
            <div className="text-3xl font-black text-white mt-1">
              $1,420.50 <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60">+4.2%</span>
            </div>
            <div className="text-xs text-[#7f91a4] mt-0.5">≈ 284.1 TON / 1,420 USDT</div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => alert('Fitur Top Up TON Wallet')}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#242f3d] hover:bg-[#2e3b4d] border border-[#313d4f] transition-all cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-full bg-[#5288c1] flex items-center justify-center text-white mb-1.5 shadow-md shadow-[#5288c1]/20 group-hover:scale-105 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-200">Isi Saldo</span>
            </button>

            <button 
              onClick={() => alert('Fitur Kirim Kripto / TON ke kontak Telegram')}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#242f3d] hover:bg-[#2e3b4d] border border-[#313d4f] transition-all cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center text-white mb-1.5 shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-200">Kirim</span>
            </button>

            <button 
              onClick={() => alert('Fitur Terima Kripto dengan alamat TON wallet')}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#242f3d] hover:bg-[#2e3b4d] border border-[#313d4f] transition-all cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-full bg-purple-600 flex items-center justify-center text-white mb-1.5 shadow-md shadow-purple-600/20 group-hover:scale-105 transition-transform">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-200">Terima</span>
            </button>
          </div>

          {/* Recent transactions */}
          <div className="text-left bg-[#242f3d] rounded-2xl p-4 border border-[#313d4f]">
            <div className="flex items-center justify-between text-xs text-[#7f91a4] font-bold uppercase tracking-wider mb-2.5">
              <span>Riwayat Transaksi</span>
              <History className="w-3.5 h-3.5 text-[#7f91a4]" />
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#313d4f]">
                <div>
                  <span className="text-slate-100 font-semibold block">Diterima dari @lafavela</span>
                  <span className="text-[10px] text-[#7f91a4]">Hari ini, 23:10</span>
                </div>
                <span className="text-emerald-400 font-bold">+50.0 TON</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <div>
                  <span className="text-slate-100 font-semibold block">Langganan Telegram Premium</span>
                  <span className="text-[10px] text-[#7f91a4]">Kemarin</span>
                </div>
                <span className="text-red-400 font-bold">-4.99 USDT</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
