import React, { useState, useEffect } from 'react';
import { X, Users, CheckCircle2, Shield, ArrowRight } from 'lucide-react';
import { User } from '../types';

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteLink: string;
  currentUser: User;
  onJoined: (chat: any) => void;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({
  isOpen,
  onClose,
  inviteLink,
  currentUser,
  onJoined,
}) => {
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !inviteLink) return;
    setLoading(true);
    setError(null);

    fetch(`/api/chats/by-link?link=${encodeURIComponent(inviteLink)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Tautan tidak valid atau grup tidak ditemukan');
        return res.json();
      })
      .then((data) => {
        setGroupInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Gagal memuat informasi grup');
        setLoading(false);
      });
  }, [isOpen, inviteLink]);

  if (!isOpen) return null;

  const handleJoin = async () => {
    if (!currentUser) return;
    setJoining(true);
    try {
      const res = await fetch('/api/chats/join-by-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link: inviteLink,
          userId: currentUser.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onJoined(data.chat);
        onClose();
      } else {
        const err = await res.json();
        setError(err.error || 'Gagal bergabung ke grup');
      }
    } catch (e) {
      setError('Terjadi kesalahan saat bergabung ke grup');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#17212b] border border-[#242f3d] rounded-2xl w-full max-w-sm p-6 text-white shadow-2xl space-y-4 text-center relative animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d]"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#5288c1] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[#7f91a4]">Memuat informasi grup...</span>
          </div>
        ) : error ? (
          <div className="py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
              <X className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base text-red-400">Tautan Kedaluwarsa</h3>
            <p className="text-xs text-[#7f91a4]">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-2xl font-bold shadow-lg overflow-hidden border border-white/10"
              style={{ backgroundColor: groupInfo?.color || '#4fae4e' }}
            >
              {groupInfo?.avatar ? (
                <img src={groupInfo.avatar} alt={groupInfo.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span>{(groupInfo?.name || 'Grup').slice(0, 2).toUpperCase()}</span>
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {groupInfo?.name || 'Grup'}
              </h2>
              <span className="text-xs text-[#7f91a4] mt-1 block">
                {groupInfo?.membersCount || 1} anggota • {groupInfo?.groupType === 'public' ? 'grup publik' : 'grup pribadi'}
              </span>
            </div>

            {groupInfo?.description && (
              <p className="text-xs text-slate-300 leading-relaxed bg-[#202b36] p-3 rounded-xl border border-[#2e3c4e]">
                {groupInfo.description}
              </p>
            )}

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3 bg-[#5288c1] hover:bg-[#4374a8] active:scale-98 text-white font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {joining ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Gabung Grup</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
