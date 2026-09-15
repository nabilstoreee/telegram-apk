import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Archive, 
  Lock, 
  Eye, 
  Heart, 
  RotateCcw, 
  Trash2, 
  Calendar, 
  Play, 
  Volume2, 
  Image as ImageIcon, 
  FileText,
  Search,
  RefreshCw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { User, Story } from '../types';

interface StoryArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSelectStoryToView: (story: Story, allStories: Story[]) => void;
  onStoryReposted?: (story: Story) => void;
}

export const StoryArchiveModal: React.FC<StoryArchiveModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectStoryToView,
  onStoryReposted
}) => {
  const [archivedStories, setArchivedStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [repostingId, setRepostingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchArchive = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/stories/archive?userId=${currentUser.id}`);
      const data = await res.json();
      if (data.archivedStories && Array.isArray(data.archivedStories)) {
        setArchivedStories(data.archivedStories);
      }
    } catch (err) {
      console.error('Gagal mengambil arsip status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (isOpen) {
      fetchArchive();
      setActionFeedback(null);
    }
  }, [isOpen, fetchArchive]);

  if (!isOpen) return null;

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setActionFeedback({ text, type });
    setTimeout(() => {
      setActionFeedback(null);
    }, 2500);
  };

  const handleRepost = async (story: Story) => {
    setRepostingId(story.id);
    try {
      const res = await fetch(`/api/stories/${story.id}/repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      const data = await res.json();
      if (res.ok && data.story) {
        showNotification('Status berhasil dibagikan ulang ke pembaruan aktif (24 jam)!');
        if (onStoryReposted) onStoryReposted(data.story);
      } else {
        showNotification(data.error || 'Gagal membagikan ulang status', 'error');
      }
    } catch (err) {
      console.error('Gagal repost status:', err);
      showNotification('Terjadi kesalahan saat membagikan ulang', 'error');
    } finally {
      setRepostingId(null);
    }
  };

  const handleDelete = async (storyId: string) => {
    if (!window.confirm('Hapus status ini secara permanen dari arsip Anda?')) return;
    setDeletingId(storyId);
    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        setArchivedStories(prev => prev.filter(s => s.id !== storyId));
        showNotification('Status berhasil dihapus dari arsip');
      } else {
        showNotification('Gagal menghapus status', 'error');
      }
    } catch (err) {
      console.error('Gagal menghapus status arsip:', err);
      showNotification('Terjadi kesalahan saat menghapus status', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filtered = archivedStories.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (s.text && s.text.toLowerCase().includes(q)) return true;
    if (s.type.toLowerCase().includes(q)) return true;
    return false;
  });

  return (
    <div 
      id="story-archive-modal-backdrop" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div 
        id="story-archive-modal-container" 
        className="relative w-full h-full sm:h-[90vh] sm:max-h-[720px] sm:max-w-xl bg-[#17212b] text-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border-0 sm:border sm:border-[#242f3d]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#242f3d] border-b border-[#101921] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#5288c1]/20 border border-[#5288c1]/40 flex items-center justify-center text-[#5288c1]">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white leading-tight">Arsip Status Saya</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5288c1]/20 text-[#5288c1] font-semibold">
                  {archivedStories.length} Status
                </span>
              </div>
              <p className="text-[11px] text-[#7f91a4]">Riwayat status pribadi Anda</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchArchive}
              className={`p-2 rounded-full text-[#7f91a4] hover:text-white hover:bg-[#17212b] transition-colors cursor-pointer ${
                isLoading ? 'animate-spin text-[#5288c1]' : ''
              }`}
              title="Segarkan Arsip"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="btn-close-archive-modal"
              onClick={onClose}
              className="p-1.5 rounded-full text-[#7f91a4] hover:text-white hover:bg-[#17212b] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Private Privacy Notice Banner */}
        <div className="px-4 py-2.5 bg-[#1c2734] border-b border-[#242f3d] flex items-center gap-2.5 shrink-0 text-xs text-[#7f91a4]">
          <div className="w-5 h-5 rounded-full bg-[#5288c1]/20 flex items-center justify-center text-[#5288c1] shrink-0">
            <Lock className="w-3 h-3" />
          </div>
          <span className="leading-snug">
            <strong className="text-white font-medium">Hanya Anda yang dapat melihat arsip ini.</strong> Kontak lain tidak dapat melihat riwayat status lama Anda.
          </span>
        </div>

        {/* Search Bar */}
        {archivedStories.length > 0 && (
          <div className="p-3 bg-[#17212b] border-b border-[#242f3d] shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari dalam riwayat status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#242f3d] border border-[#2b394a] focus:border-[#5288c1] rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-hidden text-white placeholder-[#7f91a4] transition-all"
              />
              <Search className="w-4 h-4 text-[#7f91a4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Feedback Alert Toast */}
        {actionFeedback && (
          <div 
            className={`mx-4 mt-3 p-2.5 rounded-xl text-xs text-center font-medium animate-in fade-in transition-all ${
              actionFeedback.type === 'success' 
                ? 'bg-[#4fae5e]/20 border border-[#4fae5e]/40 text-[#4fae5e]' 
                : 'bg-[#e53935]/20 border border-[#e53935]/40 text-[#e53935]'
            }`}
          >
            {actionFeedback.text}
          </div>
        )}

        {/* Main Body / Archived Stories Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4">
          {isLoading && archivedStories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-[#7f91a4] gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#5288c1]" />
              <span className="text-xs">Memuat riwayat arsip status...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-[#7f91a4] space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[#202b36] border border-[#2b394a] flex items-center justify-center text-[#5288c1]">
                <Archive className="w-8 h-8 opacity-70" />
              </div>
              <div className="max-w-xs space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  {searchQuery ? 'Tidak Ada Status Ditemukan' : 'Belum Ada Arsip Status'}
                </h3>
                <p className="text-xs text-[#7f91a4] leading-relaxed">
                  {searchQuery 
                    ? `Tidak ada arsip yang cocok dengan "${searchQuery}"`
                    : 'Pembaruan status Anda yang telah lewat 24 jam akan otomatis tersimpan dengan aman di sini sebagai kenangan pribadi Anda.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((story, idx) => {
                const totalViews = story.viewers?.length || 0;
                const totalReactions = story.reactions?.length || 0;

                return (
                  <div
                    key={`${story.id}-${idx}`}
                    className="bg-[#202b36] rounded-2xl border border-[#2b394a] hover:border-[#5288c1]/50 overflow-hidden flex flex-col transition-all group shadow-sm"
                  >
                    {/* Story Preview Area */}
                    <div 
                      onClick={() => onSelectStoryToView(story, archivedStories)}
                      className="relative h-40 w-full cursor-pointer overflow-hidden flex items-center justify-center bg-black/40"
                    >
                      {/* Photo Type */}
                      {story.type === 'photo' && story.mediaUrl && (
                        <img
                          src={story.mediaUrl}
                          alt="Story"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}

                      {/* Text Type */}
                      {story.type === 'text' && (
                        <div className={`w-full h-full p-4 flex items-center justify-center text-center bg-linear-to-br ${story.backgroundGradient || 'from-purple-600 to-indigo-700'}`}>
                          <p className="text-white text-xs sm:text-sm font-medium line-clamp-4 select-none drop-shadow-sm px-2">
                            {story.text}
                          </p>
                        </div>
                      )}

                      {/* Voice Type */}
                      {story.type === 'voice' && (
                        <div className="w-full h-full p-4 flex flex-col items-center justify-center bg-linear-to-br from-[#243b55] to-[#141e30] text-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-[#5288c1]/30 border border-[#5288c1]/50 flex items-center justify-center text-white shadow-lg">
                            <Volume2 className="w-6 h-6 text-[#5288c1]" />
                          </div>
                          <span className="text-[11px] font-mono text-[#7f91a4] bg-black/40 px-2 py-0.5 rounded-full">
                            Pesan Suara • {story.audioDuration ? `${story.audioDuration}s` : 'Audio'}
                          </span>
                        </div>
                      )}

                      {/* Type Badge */}
                      <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-medium text-white flex items-center gap-1">
                        {story.type === 'photo' && <ImageIcon className="w-3 h-3 text-[#5288c1]" />}
                        {story.type === 'text' && <FileText className="w-3 h-3 text-[#f4a261]" />}
                        {story.type === 'voice' && <Volume2 className="w-3 h-3 text-[#4fae5e]" />}
                        <span className="capitalize">{story.type}</span>
                      </div>

                      {/* Hover Overlay "Lihat" */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-xs font-semibold text-white transition-opacity">
                        <ExternalLink className="w-4 h-4" />
                        <span>Buka Status</span>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                      <div>
                        {/* Timestamp */}
                        <div className="flex items-center gap-1 text-[11px] text-[#7f91a4]">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(story.createdAt)}</span>
                        </div>

                        {/* Text Caption for Photo/Voice */}
                        {story.type !== 'text' && story.text && (
                          <p className="text-xs text-white/90 mt-1 line-clamp-1 italic">
                            "{story.text}"
                          </p>
                        )}
                      </div>

                      {/* Stats & Controls */}
                      <div className="pt-2 border-t border-[#2b394a] flex items-center justify-between">
                        {/* Viewers & Reactions Count */}
                        <div className="flex items-center gap-3 text-xs text-[#7f91a4]">
                          <span className="flex items-center gap-1 hover:text-white transition-colors" title={`${totalViews} penonton`}>
                            <Eye className="w-3.5 h-3.5 text-[#5288c1]" />
                            <span>{totalViews}</span>
                          </span>
                          <span className="flex items-center gap-1 hover:text-white transition-colors" title={`${totalReactions} reaksi`}>
                            <Heart className="w-3.5 h-3.5 text-[#e53935]" />
                            <span>{totalReactions}</span>
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          {/* Repost Button */}
                          <button
                            type="button"
                            onClick={() => handleRepost(story)}
                            disabled={repostingId === story.id}
                            className="p-1.5 rounded-lg text-[#7f91a4] hover:text-[#5288c1] hover:bg-[#17212b] transition-colors cursor-pointer disabled:opacity-50"
                            title="Bagikan Ulang ke Pembaruan Aktif (24 Jam)"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${repostingId === story.id ? 'animate-spin' : ''}`} />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(story.id)}
                            disabled={deletingId === story.id}
                            className="p-1.5 rounded-lg text-[#7f91a4] hover:text-[#e53935] hover:bg-[#17212b] transition-colors cursor-pointer disabled:opacity-50"
                            title="Hapus Status dari Arsip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#242f3d] border-t border-[#101921] flex items-center justify-between text-xs text-[#7f91a4] shrink-0">
          <span>{archivedStories.length} total status dalam arsip</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#17212b] hover:bg-[#202b36] text-white transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
