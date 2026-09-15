import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';

interface TelegramVideoViewerProps {
  src: string;
  poster?: string;
  caption?: string;
  onClose?: () => void;
  showOverlay?: boolean;
  onToggleOverlay?: () => void;
}

// Format seconds into MM:SS (e.g., 00:10, 01:25)
const formatVideoTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const TelegramVideoViewer: React.FC<TelegramVideoViewerProps> = ({
  src,
  poster,
  caption,
  showOverlay = true,
  onToggleOverlay,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCenterFeedback, setShowCenterFeedback] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Sync duration and state on load
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.muted = isMuted;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleTimeUpdate = () => {
    if (!isDragging && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (isEnded) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
      setIsEnded(false);
      return;
    }
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setShowCenterFeedback(true);
    setTimeout(() => setShowCenterFeedback(false), 800);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const rates = [1.0, 1.5, 2.0, 0.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    videoRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  // Scrubber seeking calculations
  const seekToPosition = useCallback(
    (clientX: number) => {
      if (!progressTrackRef.current || !videoRef.current || duration <= 0) return;
      const rect = progressTrackRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;
      setCurrentTime(newTime);
      videoRef.current.currentTime = newTime;
    },
    [duration]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    seekToPosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    seekToPosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if not supported
    }
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  // Format playback speed string with Indonesian comma representation (e.g. 1,0x, 1,5x)
  const speedLabel = `${playbackRate.toString().replace('.', ',')}x`;

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none"
      onClick={() => {
        if (onToggleOverlay) onToggleOverlay();
      }}
    >
      {/* Video Media Surface */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        autoPlay
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        onLoadStart={() => setIsLoading(true)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onPlaying={() => setIsLoading(false)}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setIsPlaying(false);
          setIsEnded(true);
        }}
        className="w-full h-full max-h-full max-w-full object-contain select-none"
      />

      {/* Center Loading Spinner ("animasi muter-muter") */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-25 bg-black/50 backdrop-blur-xs pointer-events-none">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full animate-spin text-[#22c55e]" viewBox="0 0 50 50">
              <circle
                className="opacity-25"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
              <circle
                className="opacity-90"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray="80"
                strokeDashoffset="30"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="text-xs text-white/90 font-medium mt-2 drop-shadow-md">Memuat video...</span>
        </div>
      )}

      {/* Center Translucent Play/Pause Button */}
      <div 
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-200 z-20 ${
          showOverlay || !isPlaying || showCenterFeedback ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={togglePlay}
          className="w-16 h-16 rounded-full bg-black/60 hover:bg-black/80 active:scale-95 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl transition-all cursor-pointer pointer-events-auto"
          title={isPlaying ? 'Jeda' : 'Putar'}
        >
          {isEnded ? (
            <RotateCcw className="w-8 h-8 text-white" />
          ) : isPlaying ? (
            <Pause className="w-8 h-8 fill-white text-white" />
          ) : (
            <Play className="w-8 h-8 fill-white text-white ml-1" />
          )}
        </button>
      </div>

      {/* Caption display above the bottom control bar */}
      {caption && caption.trim() !== '' && (
        <div 
          className={`absolute bottom-20 inset-x-4 flex justify-center pointer-events-none z-20 transition-opacity duration-200 ${
            showOverlay ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="max-w-md sm:max-w-lg px-4 py-2 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 text-white text-xs sm:text-sm text-center leading-relaxed shadow-xl pointer-events-auto">
            {caption}
          </div>
        </div>
      )}

      {/* Bottom Telegram Custom Video Player Controls Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-8 pb-5 px-4 sm:px-6 flex items-center gap-3.5 z-30 transition-opacity duration-200 ${
          showOverlay ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Current Time Stamp (Left) */}
        <span className="text-xs sm:text-[13px] font-mono font-medium text-white tracking-wider select-none tabular-nums min-w-[40px]">
          {formatVideoTime(currentTime)}
        </span>

        {/* Telegram Green Progress Scrubber (Center) */}
        <div
          ref={progressTrackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative flex-1 flex items-center h-6 cursor-pointer group/scrub touch-none select-none"
        >
          {/* Background Track Rail */}
          <div className="h-1 group-hover/scrub:h-1.5 w-full bg-white/25 rounded-full relative transition-all overflow-hidden">
            {/* Filled Active Rail (Telegram Green #22c55e) */}
            <div
              className="h-full bg-[#22c55e] rounded-full transition-[width] duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Draggable Green Dot Thumb */}
          <div
            className="w-3.5 h-3.5 bg-[#22c55e] border-2 border-white rounded-full shadow-md absolute -translate-x-1/2 top-1/2 -translate-y-1/2 group-hover/scrub:scale-125 transition-transform pointer-events-none"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Total Duration Stamp (Right) */}
        <span className="text-xs sm:text-[13px] font-mono font-medium text-slate-300 tracking-wider select-none tabular-nums min-w-[40px]">
          {formatVideoTime(duration)}
        </span>

        {/* Playback Speed Selector (e.g., 1,0x, 1,5x, 2,0x) */}
        <button
          type="button"
          onClick={cyclePlaybackRate}
          className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-[11px] sm:text-xs font-bold text-white tracking-wide cursor-pointer transition-colors border border-white/15 select-none"
          title="Kecepatan Pemutaran"
        >
          {speedLabel}
        </button>

        {/* Audio Mute / Unmute Button */}
        <button
          type="button"
          onClick={toggleMute}
          className="p-1.5 rounded-full hover:bg-white/20 active:bg-white/30 text-white transition-colors cursor-pointer select-none"
          title={isMuted ? 'Nyalakan Suara' : 'Bisukan Suara'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
          ) : (
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          )}
        </button>
      </div>
    </div>
  );
};
