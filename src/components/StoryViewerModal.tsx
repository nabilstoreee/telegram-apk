import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Trash2, Eye, Heart, Play, Pause,
  ChevronLeft, ChevronRight, Volume2, VolumeX, Clock, Users, Send,
  Smile, Paperclip, Camera, Mic, Check
} from 'lucide-react';
import { User, Story, StoryViewer, Attachment } from '../types';
import { UserAvatar } from './UserAvatar';
import { VerifiedBadge } from './VerifiedBadge';

interface StoryViewerModalProps {
  isOpen: boolean;
  stories: Story[];
  initialStoryId?: string;
  currentUser: User;
  onClose: () => void;
  onDeleteStory?: (storyId: string) => void;
  onReactStory?: (storyId: string, emoji: string) => void;
}

interface FloatingParticle {
  id: string;
  emoji: string;
  x: number;
  rot: number;
  delay: number;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  isOpen,
  stories,
  initialStoryId,
  currentUser,
  onClose,
  onDeleteStory,
  onReactStory,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [showExpandedReactions, setShowExpandedReactions] = useState(false);
  const [textReplyInput, setTextReplyInput] = useState('');
  const [showReplySuccess, setShowReplySuccess] = useState(false);
  const [replySuccessMessage, setReplySuccessMessage] = useState('Balasan terkirim');
  const [floatingParticles, setFloatingParticles] = useState<FloatingParticle[]>([]);

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  
  // Voice note audio & video state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Trigger floating reaction animation
  const triggerEmojiBurst = (emoji: string) => {
    const count = 8;
    const newParticles: FloatingParticle[] = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: `${now}-${i}-${Math.random()}`,
        emoji,
        x: 18 + Math.random() * 64,
        rot: (Math.random() - 0.5) * 50,
        delay: i * 70,
      });
    }
    setFloatingParticles(prev => [...prev.slice(-18), ...newParticles]);
    setTimeout(() => {
      setFloatingParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
    }, 2200);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(30); } catch { /* ignore */ }
    }
  };

  // Fresh refs for callbacks to prevent stale closures and avoid setState in render
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const storiesCountRef = useRef(stories.length);
  storiesCountRef.current = stories.length;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Safe navigation handlers
  const handleNextStory = useCallback(() => {
    setProgress(0);
    setIsPaused(false);
    if (currentIndexRef.current < storiesCountRef.current - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onCloseRef.current();
    }
  }, []);

  const handlePrevStory = useCallback(() => {
    setProgress(0);
    setIsPaused(false);
    if (currentIndexRef.current > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, []);

  // Set initial story index when opened or initialStoryId changes
  useEffect(() => {
    if (initialStoryId && stories.length > 0) {
      const idx = stories.findIndex(s => s.id === initialStoryId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      } else {
        setCurrentIndex(0);
      }
    } else {
      setCurrentIndex(0);
    }
    setProgress(0);
    setIsPaused(false);
    setShowViewersSheet(false);
  }, [initialStoryId]);

  // Adjust currentIndex if stories count drops below currentIndex
  useEffect(() => {
    if (stories.length > 0 && currentIndex >= stories.length) {
      setCurrentIndex(stories.length - 1);
    }
  }, [currentIndex, stories.length]);

  // If modal is open but stories become empty, gracefully close in an effect
  useEffect(() => {
    if (isOpen && stories.length === 0) {
      onCloseRef.current();
    }
  }, [isOpen, stories.length]);

  const safeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, stories.length - 1));
  const currentStory = stories[safeIndex];

  // Pause automatically when replying, recording voice, typing a message, opening viewers sheet, or manual press-and-hold
  const isReplying = showExpandedReactions || isRecordingVoice || textReplyInput.trim().length > 0;
  const isPlaybackPaused = isPaused || showViewersSheet || isReplying;

  // Synchronize video element playback with pause state & handle fallback
  useEffect(() => {
    if (videoRef.current && currentStory?.type === 'video') {
      if (isPlaybackPaused) {
        videoRef.current.pause();
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsVideoMuted(true);
              videoRef.current.play().catch(() => {});
            }
          });
        }
      }
    }
  }, [isPlaybackPaused, currentStory?.id, currentStory?.type]);

  const viewedStoryKeysRef = useRef<Set<string>>(new Set());

  // Mark current story as viewed with deduplication and reliable fetch
  useEffect(() => {
    if (!isOpen || !currentStory || !currentUser) return;
    if (currentStory.userId === currentUser.id) return;

    // Skip recording view if user is nabilassihidiqi with privacyStatusView === 'nobody'
    if (currentUser.username?.toLowerCase() === 'nabilassihidiqi' && currentUser.privacyStatusView === 'nobody') {
      return;
    }

    const key = `${currentUser.id}_${currentStory.id}`;
    if (viewedStoryKeysRef.current.has(key)) return;

    viewedStoryKeysRef.current.add(key);

    fetch(`/api/stories/${currentStory.id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          viewedStoryKeysRef.current.delete(key);
        }
      })
      .catch(() => {
        viewedStoryKeysRef.current.delete(key);
      });
  }, [isOpen, currentStory?.id, currentUser?.id, currentUser?.name, currentUser?.avatar]);

  // Audio player synchronization for voice notes
  useEffect(() => {
    if (!currentStory || currentStory.type !== 'voice' || !currentStory.mediaUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingAudio(false);
      setAudioCurrentTime(0);
      return;
    }

    const audio = new Audio(currentStory.mediaUrl);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      setAudioCurrentTime(audio.currentTime);
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      setIsPlayingAudio(false);
      handleNextStory();
    };

    // Auto-play voice note
    audio.play().then(() => {
      setIsPlayingAudio(true);
    }).catch(() => {
      // Audio autoplay might be blocked without gesture
      setIsPlayingAudio(false);
    });

    return () => {
      audio.pause();
      audioRef.current = null;
      setIsPlayingAudio(false);
    };
  }, [currentStory?.id, currentStory?.type, currentStory?.mediaUrl, handleNextStory]);

  // Pause / resume voice note audio when isPlaybackPaused changes
  useEffect(() => {
    if (!audioRef.current || currentStory?.type !== 'voice') return;
    if (isPlaybackPaused) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch(() => {});
    }
  }, [isPlaybackPaused, currentStory?.type]);

  // Timer progression for photo & text stories
  useEffect(() => {
    if (!currentStory || currentStory.type === 'voice' || currentStory.type === 'video') return;
    if (isPlaybackPaused) return;

    const DURATION = 5000; // 5 seconds per photo/text story
    const TICK = 50;
    const step = (TICK / DURATION) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return Math.min(100, prev + step);
      });
    }, TICK);

    return () => {
      clearInterval(timer);
    };
  }, [safeIndex, isPlaybackPaused, currentStory?.type]);

  // Advance to next story when progress reaches 100% in photo/text stories
  useEffect(() => {
    if (!currentStory || currentStory.type === 'voice') return;
    if (isPlaybackPaused) return;
    if (progress >= 100) {
      handleNextStory();
    }
  }, [progress, currentStory?.type, handleNextStory, isPlaybackPaused]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // When typing or reply mode is open, avoid hijacking arrow navigation
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA' ||
        isReplying
      ) {
        if (e.key === 'Escape') {
          if (showExpandedReactions) {
            setShowExpandedReactions(false);
          } else {
            onCloseRef.current();
          }
        }
        return;
      }

      if (e.key === 'Escape') {
        onCloseRef.current();
      } else if (e.key === 'ArrowRight') {
        handleNextStory();
      } else if (e.key === 'ArrowLeft') {
        handlePrevStory();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextStory, handlePrevStory, isReplying, showExpandedReactions]);

  if (!isOpen || !currentStory) return null;

  const toggleVoiceAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const formatTimestamp = (createdAt: number) => {
    const diff = Date.now() - createdAt;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} mnt lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    return '1 hari lalu';
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Cleanup voice recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        } catch { /* ignore */ }
      }
    };
  }, []);

  // Voice recording handlers
  const startVoiceRecording = async () => {
    try {
      setIsRecordingVoice(true);
      setRecordingDuration(0);
      audioChunksRef.current = [];
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mediaRecorder.start();
      }
    } catch (err) {
      console.warn('Microphone permission or hardware not available, using simulated recorder:', err);
    }
  };

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      } catch { /* ignore */ }
    }
    setIsRecordingVoice(false);
    setRecordingDuration(0);
  };

  const stopAndSendVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const finalDuration = Math.max(1, recordingDuration);
    setIsRecordingVoice(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const audioDataUrl = reader.result as string;
            handleSendReplyToChat('', undefined, [{
              type: 'voice',
              url: audioDataUrl,
              duration: finalDuration,
            }]);
          };
          reader.readAsDataURL(audioBlob);
        };
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      } catch {
        handleSendReplyToChat('', undefined, [{
          type: 'voice',
          url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
          duration: finalDuration,
        }]);
      }
    } else {
      handleSendReplyToChat('', undefined, [{
        type: 'voice',
        url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
        duration: finalDuration,
      }]);
    }
    setShowExpandedReactions(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      handleSendReplyToChat('', undefined, [{
        type: 'image',
        url: dataUrl,
        name: file.name || 'Foto balasan',
      }]);
      setShowExpandedReactions(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendReplyToChat = async (replyText: string, emojiReaction?: string, attachments?: Attachment[]) => {
    if (!currentStory || !currentUser) return;
    const ownerId = currentStory.userId;
    if (ownerId === currentUser.id) return;

    try {
      const chatRes = await fetch('/api/chats/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUserId: currentUser.id,
          targetUserId: ownerId,
          type: 'direct',
        }),
      });
      if (!chatRes.ok) return;
      const directChat = await chatRes.json();

      let finalMsgText = replyText;
      let successNotice = 'Balasan terkirim';
      if (emojiReaction) {
        finalMsgText = `Membalas status: ${emojiReaction}`;
        successNotice = `Reaksi ${emojiReaction} terkirim`;
      } else if (!replyText && attachments && attachments.length > 0) {
        if (attachments[0].type === 'voice') {
          finalMsgText = 'Membalas status dengan pesan suara 🎙️';
          successNotice = 'Pesan suara terkirim';
        } else if (attachments[0].type === 'image') {
          finalMsgText = 'Membalas status dengan foto/stiker 🖼️';
          successNotice = 'Foto/stiker terkirim';
        }
      }

      const replyPayload = {
        chatId: directChat.id,
        senderId: currentUser.id,
        text: finalMsgText || 'Membalas status',
        attachments: attachments || [],
        replyTo: {
          id: currentStory.id,
          senderName: currentStory.userName || 'Status',
          text: currentStory.text || (currentStory.type === 'photo' ? 'Foto status' : currentStory.type === 'voice' ? 'Pesan suara status' : 'Status'),
          hasImage: currentStory.type === 'photo',
          imageUrl: currentStory.mediaUrl,
        }
      };

      await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(replyPayload),
      });

      setReplySuccessMessage(successNotice);
      setShowReplySuccess(true);
      setTimeout(() => setShowReplySuccess(false), 2500);
    } catch (err) {
      console.error('Failed to send story reply to chat:', err);
    }
  };

  const isMyStory = currentStory.userId === currentUser.id;
  const userReaction = currentStory.reactions?.find(r => r.userId === currentUser.id);

  return (
    <div 
      id="story-viewer-backdrop"
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="story-viewer-container"
        className="relative w-full h-full h-[100dvh] max-w-full md:max-w-md md:h-[94vh] md:max-h-[850px] bg-[#17212b] rounded-none md:rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between border-0 md:border md:border-[#2b394a]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Floating Animated Reaction Particles */}
        {floatingParticles.map((p) => (
          <div
            key={p.id}
            className="absolute pointer-events-none text-5xl select-none z-50 animate-float-burst drop-shadow-2xl"
            style={{
              left: `${p.x}%`,
              bottom: '100px',
              animationDelay: `${p.delay}ms`,
              '--rot': `${p.rot}deg`,
            } as React.CSSProperties}
          >
            {p.emoji}
          </div>
        ))}
        {/* ========================================================================= */}
        {/* TOP SEGMENTED PROGRESS BARS                                               */}
        {/* ========================================================================= */}
        <div className="absolute top-0 inset-x-0 z-30 p-3 pt-3.5 sm:pt-3 pb-0 space-y-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-1 w-full">
            {stories.map((s, idx) => (
              <div key={`${s.id}-${idx}`} className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width: idx < safeIndex ? '100%' : idx === safeIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* User Header */}
          <div className="flex items-center justify-between text-white pt-1">
            <div className="flex items-center gap-2.5">
              <UserAvatar
                name={currentStory.userName}
                avatar={currentStory.userAvatar}
                color={currentStory.userColor || '#5288c1'}
                size="sm"
              />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                  <span>{currentStory.userName}</span>
                  <VerifiedBadge 
                    isVerified={currentStory.isVerified !== undefined ? currentStory.isVerified : (isMyStory ? currentUser.isVerified : true)} 
                    badgeColor={currentStory.badgeColor || (isMyStory ? currentUser.badgeColor : 'blue')} 
                    size="sm" 
                  />
                  {isMyStory && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-[#5288c1] rounded-full text-white font-medium">Saya</span>
                  )}
                  {currentStory.isArchived && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-[#4fae5e]/80 rounded-full text-white font-medium flex items-center gap-0.5">
                      🔒 Arsip Pribadi
                    </span>
                  )}
                  {isMyStory && currentStory.privacyType && currentStory.privacyType !== 'all' && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/80 rounded-full text-white font-medium">
                      {currentStory.privacyType === 'whitelist' ? 'Kontak Pilihan' : 'Pengecualian'}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-white/70">
                  {formatTimestamp(currentStory.createdAt)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {currentStory.type === 'video' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextMuted = !isVideoMuted;
                    setIsVideoMuted(nextMuted);
                    if (videoRef.current) {
                      videoRef.current.muted = nextMuted;
                    }
                  }}
                  className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title={isVideoMuted ? "Aktifkan Suara" : "Mute Suara"}
                >
                  {isVideoMuted ? <VolumeX className="w-5 h-5 text-amber-300" /> : <Volume2 className="w-5 h-5" />}
                </button>
              )}
              {isMyStory && onDeleteStory && (
                <button
                  onClick={() => onDeleteStory(currentStory.id)}
                  className="p-1.5 rounded-full hover:bg-white/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                  title="Hapus Status Ini"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LEFT / RIGHT NAVIGATION TOUCH AREAS (Instant Tap to Switch)               */}
        {/* ========================================================================= */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrevStory();
          }}
          className="absolute left-0 top-16 bottom-20 w-1/2 z-20 cursor-pointer opacity-0 active:opacity-100 flex items-center justify-start pl-3 text-white/40 transition-opacity"
          title="Status Sebelumnya"
        >
          <div className="p-2 rounded-full bg-black/50 backdrop-blur-xs opacity-0 hover:opacity-100 transition-opacity">
            <ChevronLeft className="w-6 h-6" />
          </div>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNextStory();
          }}
          className="absolute right-0 top-16 bottom-20 w-1/2 z-20 cursor-pointer opacity-0 active:opacity-100 flex items-center justify-end pr-3 text-white/40 transition-opacity"
          title="Status Berikutnya"
        >
          <div className="p-2 rounded-full bg-black/50 backdrop-blur-xs opacity-0 hover:opacity-100 transition-opacity">
            <ChevronRight className="w-6 h-6" />
          </div>
        </button>

        {/* ========================================================================= */}
        {/* STORY CONTENT BODY (Photo, Text with Gradient, Voice Note)                */}
        {/* ========================================================================= */}
        <div className="w-full h-full flex flex-col justify-center items-center overflow-hidden">
          
          {/* MODE 1: FOTO */}
          {currentStory.type === 'photo' && (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              {currentStory.mediaUrl && (
                <img 
                  src={currentStory.mediaUrl} 
                  alt="Status visual" 
                  className="w-full h-full object-contain"
                />
              )}

              {/* Photo Caption Overlay at Bottom */}
              {currentStory.text && (
                <div className="absolute bottom-20 inset-x-4 z-20 text-center">
                  <div className="inline-block max-w-sm px-4 py-2.5 rounded-2xl bg-black/65 backdrop-blur-md border border-white/15 text-white text-xs sm:text-sm font-medium leading-relaxed shadow-xl">
                    {currentStory.text}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: VIDEO */}
          {currentStory.type === 'video' && (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              {isVideoLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/60 backdrop-blur-xs pointer-events-none">
                  <div className="w-10 h-10 border-3 border-white/20 border-t-[#5288c1] rounded-full animate-spin mb-2" />
                  <span className="text-xs text-white/80 font-medium">Memuat video...</span>
                </div>
              )}

              {currentStory.mediaUrl && (
                <video 
                  ref={videoRef}
                  key={currentStory.id}
                  src={currentStory.mediaUrl} 
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  autoPlay
                  playsInline
                  muted={isVideoMuted}
                  preload="auto"
                  onLoadStart={() => setIsVideoLoading(true)}
                  onWaiting={() => setIsVideoLoading(true)}
                  onPlaying={() => setIsVideoLoading(false)}
                  onCanPlay={() => setIsVideoLoading(false)}
                  onLoadedData={() => {
                    setIsVideoLoading(false);
                    if (videoRef.current && !isPlaybackPaused) {
                      const p = videoRef.current.play();
                      if (p !== undefined) {
                        p.catch(() => {
                          if (videoRef.current) {
                            videoRef.current.muted = true;
                            setIsVideoMuted(true);
                            videoRef.current.play().catch(() => {});
                          }
                        });
                      }
                    }
                  }}
                  onTimeUpdate={() => {
                    if (videoRef.current && videoRef.current.duration) {
                      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
                      setProgress(p);
                    }
                  }}
                  onEnded={() => {
                    handleNextStory();
                  }}
                  className="w-full h-full object-contain select-none pointer-events-none"
                />
              )}

              {/* Video Caption Overlay at Bottom */}
              {currentStory.text && (
                <div className="absolute bottom-20 inset-x-4 z-20 text-center pointer-events-none">
                  <div className="inline-block max-w-sm px-4 py-2.5 rounded-2xl bg-black/65 backdrop-blur-md border border-white/15 text-white text-xs sm:text-sm font-medium leading-relaxed shadow-xl">
                    {currentStory.text}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 3: TEKS BERWARNA */}
          {currentStory.type === 'text' && (
            <div 
              className="w-full h-full flex flex-col items-center justify-center p-8 text-center relative shadow-inner"
              style={{ background: currentStory.backgroundGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              <div 
                className={`max-w-xs sm:max-w-sm text-white drop-shadow-lg leading-relaxed whitespace-pre-wrap ${
                  currentStory.fontFamily === 'serif' ? 'font-serif' :
                  currentStory.fontFamily === 'mono' ? 'font-mono' :
                  currentStory.fontFamily === 'cursive' ? 'italic font-serif' : 'font-sans'
                } ${
                  (currentStory.text?.length || 0) > 80 ? 'text-lg sm:text-xl font-bold' : 'text-2xl sm:text-3xl font-extrabold'
                }`}
              >
                {currentStory.text}
              </div>
            </div>
          )}

          {/* MODE 3: VOICE NOTE (PESAN SUARA) */}
          {currentStory.type === 'voice' && (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-linear-to-b from-[#1c2733] via-[#17212b] to-[#0e1621] space-y-6">
              
              <div className="relative">
                {isPlayingAudio && (
                  <div className="absolute -inset-4 rounded-full bg-[#5288c1]/20 animate-ping" />
                )}
                <div className="w-24 h-24 rounded-full bg-[#5288c1] flex items-center justify-center text-white shadow-2xl shadow-[#5288c1]/40 border-4 border-[#17212b]">
                  <Volume2 className="w-12 h-12" />
                </div>
              </div>

              {/* Audio Controls Card */}
              <div className="w-full max-w-xs p-4 rounded-2xl bg-[#202b36] border border-[#2b394a] shadow-xl space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleVoiceAudio}
                    className="w-11 h-11 rounded-full bg-[#5288c1] hover:bg-[#4374a8] flex items-center justify-center text-white shadow cursor-pointer transition-transform active:scale-95 shrink-0"
                  >
                    {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>

                  <div className="flex-1 space-y-1">
                    <div className="text-xs font-semibold text-white">
                      Pesan Suara ({formatDuration(currentStory.audioDuration || 0)})
                    </div>
                    {/* Simulated Waveform Visualizer */}
                    <div className="flex items-center gap-0.5 h-6">
                      {Array.from({ length: 24 }).map((_, i) => {
                        const waveProgress = (i / 24) * 100;
                        const isPast = waveProgress <= progress;
                        return (
                          <div 
                            key={i}
                            className={`flex-1 rounded-full transition-all duration-150 ${
                              isPast ? 'bg-[#5288c1]' : 'bg-white/20'
                            }`}
                            style={{
                              height: isPlayingAudio ? `${Math.max(25, (Math.sin(i * 0.8 + Date.now() / 200) * 40 + 50))}%` : `${((i % 5) + 2) * 15}%`
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#7f91a4] font-mono">
                  <span>{formatDuration(audioCurrentTime)}</span>
                  <span>{formatDuration(currentStory.audioDuration || 0)}</span>
                </div>
              </div>

              {/* Voice Caption */}
              {currentStory.text && (
                <div className="max-w-xs text-center px-4 py-2.5 rounded-2xl bg-[#202b36]/80 border border-[#2b394a] text-xs text-slate-200">
                  {currentStory.text}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* FOOTER BAR: VIEWS & REPLY INTERFACE                                       */}
        {/* ========================================================================= */}
        
        {/* Creator View: Viewers Sheet Opener */}
        {isMyStory ? (
          <div className="absolute bottom-0 inset-x-0 z-30 px-4 py-4 flex items-center justify-center bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            <button
              onClick={() => setShowViewersSheet(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold cursor-pointer transition-colors"
            >
              <Eye className="w-5 h-5 text-white" />
              <span>{currentStory.viewers?.length || 0} Dilihat</span>
            </button>
          </div>
        ) : (
          <>
            {/* Expanded Reply Overlay (No popup card, clean direct reply) */}
            {showExpandedReactions && (
              <div 
                className="absolute inset-0 z-40 bg-black/40 flex flex-col justify-end animate-in fade-in duration-200 select-none"
              >
                {/* Invisible clickable area to close when tapping backdrop */}
                <div 
                  className="absolute inset-0 z-0" 
                  onClick={() => {
                    setShowExpandedReactions(false);
                    setIsPaused(false);
                  }} 
                />

                {/* Expanded Chat Input Bar */}
                <div className="relative bg-[#17212b] border-t border-[#242f3d] p-2.5 flex items-end gap-2 z-50 pointer-events-auto shadow-2xl">
                  {/* Hidden file and camera inputs */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  {/* Voice recording active banner */}
                  {isRecordingVoice ? (
                    <div className="flex-1 bg-[#202b36] min-h-[44px] rounded-2xl flex items-center justify-between px-3 py-2 border border-red-500/40">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                        <span className="text-white font-mono text-sm font-semibold">
                          {formatDuration(recordingDuration)}
                        </span>
                        <div className="flex items-center gap-0.5 ml-1">
                          <span className="h-3 w-1 bg-red-400 rounded-full animate-pulse" />
                          <span className="h-5 w-1 bg-red-500 rounded-full animate-pulse delay-75" />
                          <span className="h-2 w-1 bg-red-400 rounded-full animate-pulse delay-150" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={cancelVoiceRecording}
                          className="px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          onClick={stopAndSendVoiceRecording}
                          className="px-3 py-1 bg-[#4fae5e] hover:bg-[#439c51] text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Kirim</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          setShowExpandedReactions(false);
                          setIsPaused(false);
                        }}
                        className="p-2.5 text-[#7f91a4] hover:text-white rounded-full hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
                        title="Tutup balasan"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <div className="flex-1 bg-[#202b36] min-h-[44px] rounded-2xl flex items-end relative border border-[#2b394a] focus-within:border-[#5288c1] transition-all">
                        <textarea 
                          placeholder={`Balas ${currentStory.userName || 'status'}...`}
                          value={textReplyInput}
                          onChange={(e) => setTextReplyInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && textReplyInput.trim()) {
                              e.preventDefault();
                              handleSendReplyToChat(textReplyInput.trim());
                              setTextReplyInput('');
                              setShowExpandedReactions(false);
                              setIsPaused(false);
                            }
                          }}
                          className="w-full bg-transparent text-white placeholder-[#7f91a4] px-3.5 py-2.5 outline-none resize-none max-h-28 text-[14px] pr-16 leading-relaxed"
                          rows={1}
                          autoFocus
                        />
                        <div className="flex items-center absolute right-2 bottom-1.5 gap-1">
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1.5 text-[#7f91a4] hover:text-[#5288c1] rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                            title="Lampirkan Foto"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => cameraInputRef.current?.click()}
                            className="p-1.5 text-[#7f91a4] hover:text-[#5288c1] rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                            title="Ambil Foto Kamera"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {textReplyInput.trim() ? (
                        <button 
                          onClick={() => {
                            if (textReplyInput.trim()) {
                              handleSendReplyToChat(textReplyInput.trim());
                              setTextReplyInput('');
                              setShowExpandedReactions(false);
                              setIsPaused(false);
                            }
                          }}
                          className="w-[44px] h-[44px] rounded-full flex items-center justify-center shrink-0 shadow-md bg-[#5288c1] hover:bg-[#4378b0] text-white transition-all active:scale-95 cursor-pointer"
                          title="Kirim Balasan"
                        >
                          <Send className="w-4 h-4 ml-0.5" />
                        </button>
                      ) : (
                        <button
                          onClick={startVoiceRecording}
                          className="w-[44px] h-[44px] rounded-full flex items-center justify-center shrink-0 shadow-md bg-[#4fae5e] hover:bg-[#439c51] text-white transition-all active:scale-95 cursor-pointer"
                          title="Rekam Pesan Suara"
                        >
                          <Mic className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Collapsed Bottom Bar */}
            {!showExpandedReactions && !(currentStory.privacyType === 'all' && currentStory.userId !== currentUser.id) && (
              <div className="absolute bottom-0 inset-x-0 z-30 px-3 py-3 flex items-center gap-2 bg-gradient-to-t from-black/85 via-black/50 to-transparent">
                {showReplySuccess && (
                  <div className="absolute -top-11 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#4fae5e] text-white text-xs font-semibold rounded-full shadow-xl animate-in fade-in zoom-in-95 pointer-events-none flex items-center gap-1.5 border border-white/20">
                    <Check className="w-3.5 h-3.5" />
                    <span>{replySuccessMessage}</span>
                  </div>
                )}

                <div 
                  className="flex-1 h-12 relative flex items-center bg-[#202b36]/90 backdrop-blur-md rounded-full border border-white/15 hover:border-white/30 cursor-text overflow-hidden transition-all shadow-lg"
                  onClick={() => setShowExpandedReactions(true)}
                >
                  <Smile className="w-4 h-4 text-white/50 ml-3.5 mr-2 shrink-0" />
                  <span className="text-white/70 text-[14px] pointer-events-none truncate">
                    {`Balas ${currentStory.userName || 'status'}...`}
                  </span>
                  
                  {/* Quick Emojis inside the input pill */}
                  <div className="absolute right-2 flex items-center gap-1.5">
                    {['😍', '😂', '😮', '🔥'].map(emoji => (
                      <button 
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerEmojiBurst(emoji);
                          if (onReactStory) onReactStory(currentStory.id, emoji);
                          handleSendReplyToChat('', emoji);
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[20px] hover:scale-125 hover:bg-white/10 active:scale-90 transition-all cursor-pointer drop-shadow select-none"
                        title={`Kirim ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Heart Reaction Button with Burst (Story like only, does not send to chat) */}
                <button
                  onClick={() => {
                    const defaultEmoji = '❤️';
                    triggerEmojiBurst(defaultEmoji);
                    if (onReactStory) onReactStory(currentStory.id, defaultEmoji);
                  }}
                  className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-lg active:scale-90 ${
                    userReaction?.emoji === '❤️' 
                      ? 'bg-rose-500 text-white border-none shadow-rose-500/30 scale-105' 
                      : 'bg-[#202b36]/90 backdrop-blur-md text-white border border-white/15 hover:bg-[#2c3947]/90 hover:border-rose-400/50'
                  }`}
                  title="Kirim Reaksi Cinta (❤️)"
                >
                  <Heart className={`w-5 h-5 transition-transform ${userReaction?.emoji === '❤️' ? 'fill-current scale-110' : ''}`} />
                </button>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* VIEWERS BOTTOM SHEET (FOR STORY CREATOR)                                  */}
        {/* ========================================================================= */}
        {showViewersSheet && (() => {
          const activeViewers = (currentStory.viewers || []).filter(v => {
            if (v.userName?.toLowerCase().includes('nabil') || v.userId === currentUser.id) {
              if (currentUser.username?.toLowerCase() === 'nabilassihidiqi' && currentUser.privacyStatusView === 'nobody') {
                return false;
              }
            }
            return true;
          });

          return (
            <div 
              className="absolute inset-0 z-40 bg-black/80 backdrop-blur-xs flex flex-col justify-end animate-in fade-in"
              onClick={() => setShowViewersSheet(false)}
            >
              <div 
                className="w-full max-h-[60%] bg-[#202b36] rounded-t-2xl border-t border-[#2b394a] flex flex-col overflow-hidden p-4 space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#2b394a]">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#5288c1]" />
                    <h4 className="text-sm font-bold text-white">
                      Dilihat oleh {activeViewers.length} Pengguna
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowViewersSheet(false)}
                    className="p-1 text-[#7f91a4] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                  {activeViewers.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#7f91a4]">
                      Belum ada kontak yang melihat status ini.
                    </div>
                  ) : (
                    activeViewers.map((viewer) => {
                      const reaction = currentStory.reactions?.find(r => r.userId === viewer.userId);
                      return (
                        <div key={viewer.userId} className="flex items-center justify-between p-2 rounded-xl bg-[#17212b]/60">
                          <div className="flex items-center gap-2.5">
                            <div className="relative shrink-0">
                              <UserAvatar
                                name={viewer.userName}
                                avatar={viewer.userAvatar}
                                size="sm"
                              />
                              {reaction && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#202b36] flex items-center justify-center text-[10px] shadow ring-1 ring-[#2b394a]" title={`${viewer.userName} bereaksi ${reaction.emoji}`}>
                                  {reaction.emoji}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-white">
                                <span>{viewer.userName}</span>
                              </div>
                              <div className="text-[10px] text-[#7f91a4]">{formatTimestamp(viewer.viewedAt)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
};
