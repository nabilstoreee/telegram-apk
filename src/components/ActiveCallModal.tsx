import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, 
  Minimize2, Maximize2, Shield, Lock, Sparkles, User, Video, VideoOff,
  MoreHorizontal, Share2, MessageSquare, Info, Check, Copy, UserPlus,
  Send, X, SwitchCamera, Wand2, RefreshCcw, Eye, Sliders
} from 'lucide-react';
import { User as UserType } from '../types';
import { UserAvatar, getAvatarLetter } from './UserAvatar';
import { playTelegramSound } from '../utils/sound';

export interface ActiveCallState {
  callId: string;
  targetUser: UserType;
  isCaller: boolean;
  status: 'outgoing' | 'incoming' | 'connected' | 'ended';
  callType: 'audio' | 'video';
  offer?: any;
  startTime?: number;
}

interface ActiveCallModalProps {
  callState: ActiveCallState | null;
  currentUser: UserType;
  onEndCall: (durationSec: number, status?: string) => void;
  onAnswerCall?: () => void;
  onRejectCall?: (reason?: string) => void;
  isMinimized: boolean;
  onToggleMinimize: (minimized: boolean) => void;
  // Signaling triggers from parent SSE
  incomingAnswer?: any;
  incomingIceCandidate?: any;
  incomingRenegotiateOffer?: any;
  incomingRenegotiateAnswer?: any;
  incomingMediaUpdate?: any;
  remoteEnded?: boolean;
  remoteRejected?: boolean;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
};

// 4 Telegram end-to-end encryption key emojis
const ENCRYPTION_EMOJIS = ['🍇', '🍋', '🍒', '🥑'];

const QUICK_REPLY_TEMPLATES = [
  'Maaf, saya sedang tidak bisa bicara sekarang.',
  'Saya akan menelepon Anda kembali nanti.',
  'Sedang di jalan, ada apa?',
  'Bisa kirim pesan saja?',
];

// Video filter styles
const VIDEO_FILTERS = [
  { id: 'normal', name: 'Normal', css: 'none' },
  { id: 'beauty', name: 'Beauty Glow', css: 'brightness(1.08) contrast(1.02) saturate(1.1)' },
  { id: 'warm', name: 'Warm Sun', css: 'sepia(0.2) saturate(1.2) brightness(1.05)' },
  { id: 'vivid', name: 'Vivid', css: 'contrast(1.15) saturate(1.3)' },
  { id: 'noir', name: 'B&W Noir', css: 'grayscale(1) contrast(1.2)' },
];

// Helper to generate simulated fallback audio track when microphone permission is denied
const createFallbackAudioTrack = (): MediaStreamTrack => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const dst = ctx.createMediaStreamDestination();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime); // silent baseline
      osc.connect(gain);
      gain.connect(dst);
      osc.start();
      const track = dst.stream.getAudioTracks()[0];
      if (track) return track;
    }
  } catch (e) {
    console.warn('Fallback audio track creation failed:', e);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const stream = (canvas as any).captureStream ? (canvas as any).captureStream() : new MediaStream();
  return stream.getAudioTracks()[0] || new MediaStream().getTracks()[0];
};

// Multi-tier helper to acquire REAL physical camera hardware for Front (user) and Rear (environment)
export const acquireRealCameraTrack = async (
  facing: 'user' | 'environment',
  retryCount: number = 0
): Promise<MediaStreamTrack | null> => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }

  // Delay so mobile OS camera drivers (Android Camera HAL & iOS AVFoundation) 
  // can release the previously active camera sensor cleanly without throwing NotReadableError
  await new Promise((resolve) => setTimeout(resolve, 350));

  const isRear = facing === 'environment';

  // Helper to attempt getUserMedia with error logging and retry on hardware lock
  const tryGetUserMedia = async (constraints: MediaStreamConstraints): Promise<MediaStreamTrack | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getVideoTracks()[0];
      if (track && track.readyState === 'live') {
        return track;
      }
    } catch (err: any) {
      console.warn('[ActiveCall] getUserMedia attempt failed:', err?.name || err?.message || err, constraints);
      // If camera hardware was locked by previous session (NotReadableError / TrackStartError / AbortError), retry once with backoff
      if ((err?.name === 'NotReadableError' || err?.name === 'TrackStartError' || err?.name === 'AbortError') && retryCount === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        try {
          const retryStream = await navigator.mediaDevices.getUserMedia(constraints);
          const retryTrack = retryStream.getVideoTracks()[0];
          if (retryTrack && retryTrack.readyState === 'live') {
            return retryTrack;
          }
        } catch {}
      }
    }
    return null;
  };

  if (isRear) {
    // =========================================================================
    // 1. REAR CAMERA (KAMERA BELAKANG FISIK ASLI)
    // =========================================================================

    // Tier 1: Check enumerated devices first for explicit rear labels (e.g. "kamera 0, menghadap belakang", "camera 0, facing back")
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      console.log('[ActiveCall] Videoinput terdeteksi:', videoDevices.length, videoDevices.map(d => ({ label: d.label, id: d.deviceId })));

      // Find devices with explicit rear keywords in Indonesian, English, etc.
      const explicitRearDevices = videoDevices.filter((d) => {
        const l = (d.label || '').toLowerCase();
        const hasRearKeyword = l.includes('belakang') || 
                               l.includes('back') || 
                               l.includes('rear') || 
                               l.includes('environment') || 
                               l.includes('world') || 
                               l.includes('facing back') || 
                               l.includes('menghadap belakang');
        const hasFrontKeyword = l.includes('depan') || 
                                l.includes('front') || 
                                l.includes('user') || 
                                l.includes('selfie') || 
                                l.includes('facing front') || 
                                l.includes('menghadap depan');
        return hasRearKeyword && !hasFrontKeyword;
      });

      for (const dev of explicitRearDevices) {
        if (dev.deviceId) {
          const t1 = await tryGetUserMedia({ video: { deviceId: { exact: dev.deviceId } }, audio: false });
          if (t1) {
            console.log('[ActiveCall] Berhasil mengakses kamera belakang fisik via exact deviceId:', dev.label || dev.deviceId);
            return t1;
          }

          const t2 = await tryGetUserMedia({ video: { deviceId: dev.deviceId }, audio: false });
          if (t2) {
            console.log('[ActiveCall] Berhasil mengakses kamera belakang fisik via deviceId:', dev.label || dev.deviceId);
            return t2;
          }

          const t3 = await tryGetUserMedia({ video: { deviceId: { ideal: dev.deviceId }, facingMode: { ideal: 'environment' } }, audio: false });
          if (t3) {
            console.log('[ActiveCall] Berhasil mengakses kamera belakang fisik via deviceId + facingMode:', dev.label || dev.deviceId);
            return t3;
          }
        }
      }

      // If multiple devices exist and some are non-front
      if (videoDevices.length > 1) {
        const nonFrontDevices = videoDevices.filter((d) => {
          const l = (d.label || '').toLowerCase();
          return !l.includes('depan') && !l.includes('front') && !l.includes('user') && !l.includes('selfie') && !l.includes('menghadap depan') && !l.includes('facing front');
        });

        for (const dev of nonFrontDevices) {
          if (dev.deviceId) {
            const t = await tryGetUserMedia({ video: { deviceId: { exact: dev.deviceId } }, audio: false }) ||
                      await tryGetUserMedia({ video: { deviceId: dev.deviceId }, audio: false });
            if (t) {
              console.log('[ActiveCall] Berhasil mengakses kamera belakang non-front candidate:', dev.label || dev.deviceId);
              return t;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[ActiveCall] Enumerate devices rear camera search error:', e);
    }

    // Tier 2: W3C standard facingMode constraints (Android Chrome, Samsung Internet & iOS Safari)
    const rearFacingConstraints: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: 'environment' as any,
        },
        audio: false,
      },
      {
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      },
      {
        video: {
          facingMode: { exact: 'environment' },
        },
        audio: false,
      },
      {
        video: {
          facingMode: 'environment' as any,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      {
        video: {
          facingMode: { exact: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
    ];

    for (const constraints of rearFacingConstraints) {
      const t = await tryGetUserMedia(constraints);
      if (t) {
        console.log('[ActiveCall] Berhasil mengakses kamera belakang hardware via facingMode:', t.label || constraints);
        return t;
      }
    }

    console.warn('[ActiveCall] Kamera belakang fisik tidak ditemukan pada perangkat ini');
    return null;
  } else {
    // =========================================================================
    // 2. FRONT CAMERA (KAMERA DEPAN FISIK ASLI)
    // =========================================================================

    // Tier 1: Check enumerated devices first for explicit front labels (e.g. "kamera 1, menghadap depan", "camera 1, facing front")
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      const frontDevices = videoDevices.filter((d) => {
        const l = (d.label || '').toLowerCase();
        return (l.includes('depan') || 
                l.includes('front') || 
                l.includes('user') || 
                l.includes('selfie') || 
                l.includes('facing front') || 
                l.includes('menghadap depan')) &&
               !l.includes('belakang') && !l.includes('back') && !l.includes('rear');
      });

      for (const dev of frontDevices) {
        if (dev.deviceId) {
          const t1 = await tryGetUserMedia({ video: { deviceId: { exact: dev.deviceId } }, audio: false });
          if (t1) {
            console.log('[ActiveCall] Berhasil mengakses kamera depan fisik via exact deviceId:', dev.label || dev.deviceId);
            return t1;
          }

          const t2 = await tryGetUserMedia({ video: { deviceId: dev.deviceId }, audio: false });
          if (t2) {
            console.log('[ActiveCall] Berhasil mengakses kamera depan fisik via ideal deviceId:', dev.label || dev.deviceId);
            return t2;
          }
        }
      }
    } catch (e) {
      console.warn('[ActiveCall] Enumerate devices front camera search error:', e);
    }

    // Tier 2: W3C standard constraints
    const frontAttempts: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: 'user' as any,
        },
        audio: false,
      },
      {
        video: {
          facingMode: { ideal: 'user' },
        },
        audio: false,
      },
      {
        video: {
          facingMode: { exact: 'user' },
        },
        audio: false,
      },
      {
        video: {
          facingMode: 'user' as any,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      {
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      {
        video: {
          facingMode: { exact: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
    ];

    for (const constraints of frontAttempts) {
      const t = await tryGetUserMedia(constraints);
      if (t) {
        console.log('[ActiveCall] Berhasil mengakses kamera depan hardware:', t.label || constraints);
        return t;
      }
    }

    // Ultimate fallback for front
    const fallbackTrack = await tryGetUserMedia({ video: true, audio: false });
    if (fallbackTrack) return fallbackTrack;

    return null;
  }
};

// Safe media stream acquirer that prioritizes real hardware audio and video
const acquireSafeMediaStream = async (
  wantVideo: boolean,
  cameraFacing: 'user' | 'environment'
): Promise<{ stream: MediaStream; isSimulated: boolean; hasVideo: boolean }> => {
  let audioTrack: MediaStreamTrack | null = null;
  let videoTrack: MediaStreamTrack | null = null;

  if (navigator?.mediaDevices?.getUserMedia) {
    // 1. Acquire real microphone audio
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioTrack = audioStream.getAudioTracks()[0] || null;
    } catch (audioErr) {
      console.warn('[ActiveCall] Audio acquisition failed:', audioErr);
    }

    // 2. Acquire real hardware camera video track (Front or Rear)
    if (wantVideo) {
      videoTrack = await acquireRealCameraTrack(cameraFacing);
    }
  }

  const finalStream = new MediaStream();
  if (audioTrack) {
    finalStream.addTrack(audioTrack);
  } else {
    const fallbackAudio = createFallbackAudioTrack();
    if (fallbackAudio) finalStream.addTrack(fallbackAudio);
  }

  if (videoTrack) {
    finalStream.addTrack(videoTrack);
  }

  return {
    stream: finalStream,
    isSimulated: false,
    hasVideo: !!videoTrack,
  };
};

export const ActiveCallModal: React.FC<ActiveCallModalProps> = ({
  callState,
  currentUser,
  onEndCall,
  onAnswerCall,
  onRejectCall,
  isMinimized,
  onToggleMinimize,
  incomingAnswer,
  incomingIceCandidate,
  incomingRenegotiateOffer,
  incomingRenegotiateAnswer,
  incomingMediaUpdate,
  remoteEnded,
  remoteRejected,
}) => {
  if (!callState) return null;

  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeaker, setIsSpeaker] = useState<boolean>(true);
  
  // Real-time camera & video states
  const [isLocalVideoEnabled, setIsLocalVideoEnabled] = useState<boolean>(callState.callType === 'video');
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState<boolean>(callState.callType === 'video');
  const [hasRemoteVideoStream, setHasRemoteVideoStream] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [activeFilter, setActiveFilter] = useState<string>('normal');
  const [showFilterPicker, setShowFilterPicker] = useState<boolean>(false);
  const [isPipSwapped, setIsPipSwapped] = useState<boolean>(false); // Tap to swap local & remote video windows

  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<string>(
    callState.isCaller ? 'Berdering ...' : 'Panggilan Masuk...'
  );
  const [isCallActive, setIsCallActive] = useState<boolean>(callState.status === 'connected');

  // Modals / Sheets
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [showQuickMessageSheet, setShowQuickMessageSheet] = useState<boolean>(false);
  const [customQuickMsg, setCustomQuickMsg] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showAddContactNotice, setShowAddContactNotice] = useState<boolean>(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<any>(null);
  const soundStopperRef = useRef<(() => void) | null>(null);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Stop active ringing sound
  const stopSounds = () => {
    if (soundStopperRef.current) {
      soundStopperRef.current();
      soundStopperRef.current = null;
    }
  };

  // -------------------------------------------------------------------
  // Setup Real Audio Visualizer
  // -------------------------------------------------------------------
  const setupAudioVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (e) {
      console.warn('Audio Visualizer could not start:', e);
    }
  };

  // -------------------------------------------------------------------
  // Cleanup Call Resources
  // -------------------------------------------------------------------
  const cleanupCall = () => {
    stopSounds();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    iceCandidatesQueueRef.current = [];
  };

  // -------------------------------------------------------------------
  // Initialize WebRTC as Caller
  // -------------------------------------------------------------------
  const startCallerFlow = async () => {
    try {
      setConnectionStatus('Berdering ...');
      stopSounds();
      soundStopperRef.current = playTelegramSound.startOutgoingRinging();

      const wantVideo = callState.callType === 'video';
      const { stream, isSimulated, hasVideo } = await acquireSafeMediaStream(wantVideo, cameraFacing);
      localStreamRef.current = stream;

      if (hasVideo) {
        setIsLocalVideoEnabled(true);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        if (pipVideoRef.current) pipVideoRef.current.srcObject = stream;
      }

      setupAudioVisualizer(stream);

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Add all tracks to PeerConnection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle Remote Tracks
      pc.ontrack = (event) => {
        if (event.track.kind === 'audio' && remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
        if (event.track.kind === 'video' && event.streams[0]) {
          setIsRemoteVideoEnabled(true);
          setHasRemoteVideoStream(true);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && callState) {
          fetch('/api/calls/ice-candidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callId: callState.callId,
              targetUserId: callState.targetUser.id,
              candidate: event.candidate,
            }),
          }).catch(console.error);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setConnectionStatus('Terhubung');
          stopSounds();
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setConnectionStatus('Panggilan terputus');
        }
      };

      // Create Offer SDP with audio and video support
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      // Send offer to server
      const res = await fetch('/api/calls/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: callState.callId,
          callerId: currentUser.id,
          targetUserId: callState.targetUser.id,
          offer,
          callType: callState.callType,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Gagal memanggil' }));
        setConnectionStatus(err.error || 'Pengguna tidak dapat dihubungi');
        stopSounds();
        playTelegramSound.callEnded();
        setTimeout(() => {
          onEndCall(0, 'cancelled');
        }, 2000);
      } else {
        setConnectionStatus('Berdering ...');
      }
    } catch (err) {
      console.error('Call initialization error:', err);
      setConnectionStatus('Berdering ...');
    }
  };

  // -------------------------------------------------------------------
  // Answer Call as Callee
  // -------------------------------------------------------------------
  const handleAnswer = async () => {
    try {
      stopSounds();
      setConnectionStatus('Menghubungkan...');

      const wantVideo = callState.callType === 'video';
      const { stream, isSimulated, hasVideo } = await acquireSafeMediaStream(wantVideo, cameraFacing);
      localStreamRef.current = stream;

      if (hasVideo) {
        setIsLocalVideoEnabled(true);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        if (pipVideoRef.current) pipVideoRef.current.srcObject = stream;
      }

      setupAudioVisualizer(stream);

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.track.kind === 'audio' && remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
        if (event.track.kind === 'video' && event.streams[0]) {
          setIsRemoteVideoEnabled(true);
          setHasRemoteVideoStream(true);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && callState) {
          fetch('/api/calls/ice-candidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callId: callState.callId,
              targetUserId: callState.targetUser.id,
              candidate: event.candidate,
            }),
          }).catch(console.error);
        }
      };

      if (callState.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(callState.offer));

        // Process queued ice candidates
        while (iceCandidatesQueueRef.current.length > 0) {
          const candidate = iceCandidatesQueueRef.current.shift();
          if (candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
          }
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer to server
      await fetch('/api/calls/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: callState.callId,
          callerId: callState.targetUser.id,
          targetUserId: currentUser.id,
          answer,
        }),
      });

      setIsCallActive(true);
      setConnectionStatus('Terhubung');
      playTelegramSound.callConnected();

      // Start duration counter
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      if (onAnswerCall) onAnswerCall();
    } catch (err) {
      console.error('Answer call error:', err);
      setConnectionStatus('Terhubung');
      setIsCallActive(true);
    }
  };

  // -------------------------------------------------------------------
  // Real-Time Video Upgrade & Renegotiation
  // -------------------------------------------------------------------
  const triggerRenegotiate = async (
    newStream: MediaStream, 
    hasVideo: boolean, 
    overrideFacing?: 'user' | 'environment'
  ) => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      // Replace or add video track to sender
      const videoTrack = newStream.getVideoTracks()[0];
      const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video') ||
        pc.getSenders().find((s) => (s as any).kind === 'video') ||
        pc.getSenders().find((s) => !s.track && pc.getSenders().indexOf(s) === 1);

      if (videoSender && videoTrack) {
        await videoSender.replaceTrack(videoTrack);
      } else if (videoTrack) {
        pc.addTrack(videoTrack, newStream);
      } else if (videoSender && !hasVideo) {
        pc.removeTrack(videoSender);
      }

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      await fetch('/api/calls/renegotiate-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: callState.callId,
          targetUserId: callState.targetUser.id,
          senderId: currentUser.id,
          offer,
          hasVideo,
        }),
      });

      // Broadcast media update with explicit facing mode
      await fetch('/api/calls/media-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: callState.callId,
          targetUserId: callState.targetUser.id,
          senderId: currentUser.id,
          isVideoEnabled: hasVideo,
          isMuted,
          cameraFacing: overrideFacing || cameraFacing,
        }),
      });
    } catch (e) {
      console.error('Error in renegotiation:', e);
    }
  };

  // Toggle Video On / Off
  const handleToggleVideo = async () => {
    if (isLocalVideoEnabled) {
      // Turn Off Video
      if (localStreamRef.current) {
        const videoTracks = localStreamRef.current.getVideoTracks();
        videoTracks.forEach((t) => {
          t.stop();
          localStreamRef.current?.removeTrack(t);
        });
      }
      setIsLocalVideoEnabled(false);
      triggerRenegotiate(localStreamRef.current || new MediaStream(), false);
    } else {
      // Turn On Real Video Camera
      try {
        const videoTrack = await acquireRealCameraTrack(cameraFacing);

        if (videoTrack) {
          if (localStreamRef.current) {
            localStreamRef.current.addTrack(videoTrack);
          } else {
            localStreamRef.current = new MediaStream([videoTrack]);
          }

          setIsLocalVideoEnabled(true);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
            localVideoRef.current.play().catch(() => {});
          }
          if (pipVideoRef.current) {
            pipVideoRef.current.srcObject = localStreamRef.current;
            pipVideoRef.current.play().catch(() => {});
          }

          triggerRenegotiate(localStreamRef.current, true, cameraFacing);
        }
      } catch (err) {
        console.error('Could not access camera:', err);
      }
    }
  };

  // Switch / Flip Camera (Front vs Back) - Real-time physical camera hardware switch
  const handleFlipCamera = async () => {
    const prevFacing = cameraFacing;
    const nextFacing = prevFacing === 'user' ? 'environment' : 'user';

    if (isLocalVideoEnabled) {
      try {
        // 1. Detach srcObject and stop video tracks so mobile OS camera drivers release the hardware
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (pipVideoRef.current) pipVideoRef.current.srcObject = null;

        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((t) => {
            t.stop();
            localStreamRef.current?.removeTrack(t);
          });
        }

        // 2. Acquire real hardware camera track (includes driver delay & automatic lock retry)
        const newTrack = await acquireRealCameraTrack(nextFacing);

        if (newTrack) {
          setCameraFacing(nextFacing);

          if (localStreamRef.current) {
            localStreamRef.current.addTrack(newTrack);
          } else {
            localStreamRef.current = new MediaStream([newTrack]);
          }

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
            localVideoRef.current.play().catch(() => {});
          }
          if (pipVideoRef.current) {
            pipVideoRef.current.srcObject = localStreamRef.current;
            pipVideoRef.current.play().catch(() => {});
          }

          triggerRenegotiate(localStreamRef.current, true, nextFacing);
        } else {
          // If the device does not have a second camera (e.g. device with only 1 webcam), recover previous
          console.warn('[ActiveCall] Failed to acquire camera with facing:', nextFacing);
          const recoverTrack = await acquireRealCameraTrack(prevFacing);
          if (recoverTrack) {
            setCameraFacing(prevFacing);
            if (localStreamRef.current) localStreamRef.current.addTrack(recoverTrack);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
              localVideoRef.current.play().catch(() => {});
            }
            if (pipVideoRef.current) {
              pipVideoRef.current.srcObject = localStreamRef.current;
              pipVideoRef.current.play().catch(() => {});
            }
          }
        }
      } catch (e) {
        console.error('Failed to flip camera:', e);
      }
    } else {
      setCameraFacing(nextFacing);
    }
  };

  // Handle incoming renegotiate offer
  useEffect(() => {
    if (incomingRenegotiateOffer && pcRef.current) {
      (async () => {
        try {
          const pc = pcRef.current;
          if (!pc) return;

          await pc.setRemoteDescription(new RTCSessionDescription(incomingRenegotiateOffer.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await fetch('/api/calls/renegotiate-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callId: callState.callId,
              targetUserId: incomingRenegotiateOffer.senderId,
              senderId: currentUser.id,
              answer,
            }),
          });

          if (incomingRenegotiateOffer.hasVideo) {
            setIsRemoteVideoEnabled(true);
          }
        } catch (e) {
          console.error('Failed to handle renegotiate offer:', e);
        }
      })();
    }
  }, [incomingRenegotiateOffer]);

  // Handle incoming renegotiate answer
  useEffect(() => {
    if (incomingRenegotiateAnswer && pcRef.current) {
      (async () => {
        try {
          await pcRef.current?.setRemoteDescription(
            new RTCSessionDescription(incomingRenegotiateAnswer.answer)
          );
        } catch (e) {
          console.error('Failed to apply renegotiate answer:', e);
        }
      })();
    }
  }, [incomingRenegotiateAnswer]);

  // Handle incoming media updates
  useEffect(() => {
    if (incomingMediaUpdate) {
      if (typeof incomingMediaUpdate.isVideoEnabled === 'boolean') {
        setIsRemoteVideoEnabled(incomingMediaUpdate.isVideoEnabled);
      }
    }
  }, [incomingMediaUpdate]);

  // -------------------------------------------------------------------
  // Lifecycle & Trigger Handling
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!callState) {
      cleanupCall();
      return;
    }

    let ringTimeout: any = null;

    if (callState.isCaller && callState.status === 'outgoing') {
      startCallerFlow();
      // Auto timeout after 45s if unanswered -> Mark as 'missed' (Panggilan tak terjawab)
      ringTimeout = setTimeout(() => {
        if (!isCallActive) {
          stopSounds();
          playTelegramSound.callEnded();
          setConnectionStatus('Tidak Ada Jawaban');
          const isVideo = isLocalVideoEnabled || isRemoteVideoEnabled || callState.callType === 'video';
          fetch('/api/calls/end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callId: callState.callId,
              callerId: currentUser.id,
              targetUserId: callState.targetUser.id,
              duration: 0,
              status: 'missed',
              callType: isVideo ? 'video' : 'audio',
            }),
          }).catch(console.error);
          setTimeout(() => {
            cleanupCall();
            onEndCall(0, 'missed');
          }, 1500);
        }
      }, 45000);
    } else if (!callState.isCaller && callState.status === 'incoming') {
      stopSounds();
      soundStopperRef.current = playTelegramSound.startIncomingRingtone();
      setConnectionStatus('Panggilan Masuk...');
      // Auto timeout on incoming side if user doesn't answer after 45s
      ringTimeout = setTimeout(() => {
        if (!isCallActive) {
          stopSounds();
          playTelegramSound.callEnded();
          setConnectionStatus('Panggilan Tak Terjawab');
          cleanupCall();
          onEndCall(0, 'missed');
        }
      }, 45000);
    }

    return () => {
      if (ringTimeout) clearTimeout(ringTimeout);
      cleanupCall();
    };
  }, [callState?.callId]);

  // Handle incoming answer on caller side
  useEffect(() => {
    if (incomingAnswer && pcRef.current && callState?.isCaller) {
      (async () => {
        try {
          stopSounds();
          await pcRef.current?.setRemoteDescription(new RTCSessionDescription(incomingAnswer));
          setIsCallActive(true);
          setConnectionStatus('Terhubung');
          playTelegramSound.callConnected();

          // Process queued ICE candidates
          while (iceCandidatesQueueRef.current.length > 0) {
            const candidate = iceCandidatesQueueRef.current.shift();
            if (candidate && pcRef.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
            }
          }

          // Start duration timer
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        } catch (e) {
          console.error('Error applying remote answer:', e);
        }
      })();
    }
  }, [incomingAnswer]);

  // Handle incoming ICE candidates
  useEffect(() => {
    if (incomingIceCandidate) {
      if (pcRef.current && pcRef.current.remoteDescription) {
        pcRef.current.addIceCandidate(new RTCIceCandidate(incomingIceCandidate)).catch(() => {});
      } else {
        iceCandidatesQueueRef.current.push(incomingIceCandidate);
      }
    }
  }, [incomingIceCandidate]);

  // Handle remote ended
  useEffect(() => {
    if (remoteEnded) {
      stopSounds();
      playTelegramSound.callEnded();
      setConnectionStatus('Panggilan Berakhir');
      setTimeout(() => {
        cleanupCall();
        onEndCall(callDuration, 'completed');
      }, 1200);
    }
  }, [remoteEnded]);

  // Handle remote rejected / busy
  useEffect(() => {
    if (remoteRejected) {
      stopSounds();
      playTelegramSound.callEnded();
      setConnectionStatus('Panggilan Ditolak / Sibuk');
      setTimeout(() => {
        cleanupCall();
        onEndCall(0, 'declined');
      }, 1500);
    }
  }, [remoteRejected]);

  // Handle Mute Toggle
  const handleToggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      });
    }
  };

  // Handle Speaker Toggle
  const handleToggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
      setIsSpeaker(!remoteAudioRef.current.muted);
    } else {
      setIsSpeaker(!isSpeaker);
    }
  };

  // End Call Handler
  const handleHangUp = () => {
    stopSounds();
    playTelegramSound.callEnded();
    cleanupCall();

    const isVideo = isLocalVideoEnabled || isRemoteVideoEnabled || callState.callType === 'video';
    const finalStatus = isCallActive ? 'completed' : (callState.isCaller ? 'cancelled' : 'missed');

    fetch('/api/calls/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId: callState.callId,
        callerId: callState.isCaller ? currentUser.id : callState.targetUser.id,
        targetUserId: callState.isCaller ? callState.targetUser.id : currentUser.id,
        duration: callDuration,
        status: finalStatus,
        callType: isVideo ? 'video' : 'audio',
      }),
    }).catch(console.error);

    onEndCall(callDuration, finalStatus);
  };

  // Reject Call Handler
  const handleReject = () => {
    stopSounds();
    playTelegramSound.callEnded();
    cleanupCall();

    const isVideo = isLocalVideoEnabled || isRemoteVideoEnabled || callState.callType === 'video';

    fetch('/api/calls/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId: callState.callId,
        callerId: callState.targetUser.id,
        targetUserId: currentUser.id,
        reason: 'declined',
        callType: isVideo ? 'video' : 'audio',
      }),
    }).catch(console.error);

    if (onRejectCall) onRejectCall('declined');
    onEndCall(0, 'declined');
  };

  // Send Quick Message & Reject
  const handleSendQuickMessage = async (msgText: string) => {
    if (!msgText.trim()) return;

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: callState.targetUser.id,
          text: msgText,
        }),
      });
    } catch (e) {
      console.error('Failed to send quick message:', e);
    }

    setShowQuickMessageSheet(false);
    handleReject();
  };

  // Copy Call Link
  const handleCopyCallLink = () => {
    const link = `${window.location.origin}/#call=${callState.callId}`;
    navigator.clipboard?.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}.${String(secs).padStart(2, '0')}`;
  };

  const targetLetter = getAvatarLetter(callState.targetUser.name, callState.targetUser.username);
  const targetColor = callState.targetUser.color || '#1e3c72';
  const targetPhone = callState.targetUser.phone || `+62 8${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Determine if video mode is currently active
  const isVideoMode = isLocalVideoEnabled || isRemoteVideoEnabled;
  const activeFilterCss = VIDEO_FILTERS.find((f) => f.id === activeFilter)?.css || 'none';

  // Handle keyboard Escape to end or exit call
  useEffect(() => {
    if (!callState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (callState.status === 'incoming' && !isCallActive) {
          handleReject();
        } else {
          handleHangUp();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callState, isCallActive]);

  // -------------------------------------------------------------------
  // MINIMIZED FLOATING PIP CALL WIDGET
  // -------------------------------------------------------------------
  if (isMinimized) {
    return (
      <div 
        id="minimized-call-pill" 
        onClick={() => onToggleMinimize(false)}
        className="fixed bottom-6 right-6 z-50 bg-[#17212b]/95 border border-[#5288c1]/40 rounded-full px-4 py-2.5 shadow-2xl backdrop-blur-md flex items-center gap-3 cursor-pointer hover:bg-[#242f3d] transition-all transform hover:scale-105 select-none animate-in fade-in slide-in-from-bottom-5 duration-200"
      >
        <audio ref={remoteAudioRef} autoPlay playsInline />

        <div className="relative">
          <UserAvatar
            name={callState.targetUser.name}
            username={callState.targetUser.username}
            avatar={callState.targetUser.avatar}
            color={targetColor}
            size="sm"
          />
          <span 
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#4fae4e] rounded-full border-2 border-[#17212b] animate-ping"
            style={{ animationDuration: `${Math.max(0.6, 2 - (audioLevel / 50))}s` }}
          />
        </div>

        <div className="flex flex-col min-w-0 pr-1">
          <span className="text-xs font-bold text-white truncate max-w-[120px]">
            {callState.targetUser.name}
          </span>
          <span className="text-[11px] text-[#4fae4e] font-medium font-mono">
            {isCallActive ? formatTimer(callDuration) : connectionStatus}
          </span>
        </div>

        <div className="flex items-center gap-1.5 pl-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleMute();
            }}
            className={`p-1.5 rounded-full transition-colors ${
              isMuted ? 'bg-red-500/20 text-red-400' : 'bg-[#242f3d] text-slate-300 hover:text-white'
            }`}
            title={isMuted ? 'Buka Suara' : 'Bisukan'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleHangUp();
            }}
            className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-md"
            title="Tutup Panggilan"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMinimize(false);
            }}
            className="p-1 text-slate-400 hover:text-white"
            title="Perbesar"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // MAIN MODAL VIEW
  // -------------------------------------------------------------------
  const isIncomingScreen = !callState.isCaller && !isCallActive && callState.status === 'incoming';

  return (
    <div 
      id="active-call-modal-overlay" 
      className="fixed inset-0 z-50 bg-[#0b141a] flex flex-col justify-between select-none font-sans overflow-hidden animate-in fade-in duration-200"
      style={{
        backgroundImage: !isVideoMode 
          ? `radial-gradient(circle at center, rgba(16, 29, 37, 0.92) 0%, rgba(11, 20, 26, 0.98) 100%)`
          : undefined,
      }}
    >
      {/* Remote Audio Track */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* ========================================================================= */}
      {/* VIDEO BACKGROUND LAYER (When Camera / VideoCall is ON - Screenshot 3)     */}
      {/* ========================================================================= */}
      {isVideoMode && (
        <div className="absolute inset-0 w-full h-full bg-black z-0 overflow-hidden">
          {/* Main Fullscreen Video Feed */}
          {hasRemoteVideoStream && !isPipSwapped ? (
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover" 
              style={{ filter: activeFilterCss }}
            />
          ) : isLocalVideoEnabled ? (
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`} 
              style={{ filter: activeFilterCss }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#111b21]">
              <UserAvatar
                name={callState.targetUser.name}
                username={callState.targetUser.username}
                avatar={callState.targetUser.avatar}
                color={targetColor}
                size="xl"
              />
              <span className="text-slate-400 text-sm mt-3">Kamera lawan bicara mati</span>
            </div>
          )}

          {/* Floating Picture-in-Picture Thumbnail Window */}
          {isLocalVideoEnabled && hasRemoteVideoStream && (
            <div 
              id="pip-video-preview"
              onClick={() => setIsPipSwapped(!isPipSwapped)}
              className="absolute top-20 right-4 w-28 sm:w-36 h-40 sm:h-48 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl z-20 cursor-pointer hover:border-[#5288c1] transition-all bg-black/80"
              title="Ketuk untuk tukar layar video"
            >
              {isPipSwapped ? (
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <video 
                  ref={pipVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                  style={{ filter: activeFilterCss }}
                />
              )}
              <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded text-[10px] text-white/90">
                {isPipSwapped ? 'Lawan' : 'Anda'}
              </div>
            </div>
          )}

          {/* Top and Bottom Dark Gradient Shadows for Readability */}
          <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-10" />
          <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />
        </div>
      )}

      {/* Telegram / WhatsApp Doodle Pattern Layer (Only in Audio Mode) */}
      {!isVideoMode && (
        <div 
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-rule='evenodd'%3E%3Cpath d='M20 20h8v8h-8zM70 25a5 5 0 1 1-10 0 5 5 0 0 1 10 0zm25 45c0 5.5-4.5 10-10 10s-10-4.5-10-10 4.5-10 10-10 10 4.5 10 10zm-65 30a7 7 0 1 1-14 0 7 7 0 0 1 14 0zm70-75l6 10H80l6-10zm-50 45a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm70 20h10v4H70v-4zm-40-60h6v6h-6z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '120px 120px',
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: INCOMING CALL SCREEN (TAMPILAN ORANG YANG DITELPON - FOTO 2)     */}
      {/* ========================================================================= */}
      {isIncomingScreen ? (
        <div className="relative z-10 flex flex-col items-center justify-between w-full h-full max-w-md mx-auto py-8 px-6">
          <button
            id="btn-close-incoming-call"
            onClick={handleReject}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md transition-colors cursor-pointer"
            title="Tolak Panggilan (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Top Status Bar & Contact Info */}
          <div className="flex flex-col items-center text-center mt-2 w-full">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
              {callState.targetUser.name}
            </h1>

            <div className="flex items-center gap-1.5 text-sm text-[#8696a0] mt-1.5 font-medium">
              <svg className="w-4 h-4 text-[#5288c1]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15.82-1.34 6.32-1.89 8.9-.23 1.09-.69 1.45-1.12 1.48-.94.07-1.65-.63-2.56-1.23-.74-.49-1.37-.8-2.15-1.33-.9-.61-.32-.95.2-.1.49 1.28 1.18 2.58 2.37 3.9.15.16.29.3.26.54-.03.24-.18.36-.37.4l-5.45 1.7c-.52.16-.99.07-1.13-.53-.29-1.23 1.15-7.69 1.63-9.97.23-1.07.69-1.45 1.12-1.48.94-.07 1.65.63 2.56 1.23.74.49 1.37.8 2.15 1.33.9.61.32.95-.2.1z" />
              </svg>
              <span>{callState.targetUser.username ? `@${callState.targetUser.username}` : targetPhone}</span>
            </div>

            <p className="text-xs text-[#5288c1] font-semibold mt-2 tracking-wide uppercase">
              {callState.callType === 'video' ? 'Panggilan Video Masuk' : 'Panggilan Suara Masuk'}
            </p>
          </div>

          {/* Center Avatar */}
          <div className="relative flex items-center justify-center my-auto">
            <div 
              className="absolute rounded-full pointer-events-none animate-ping opacity-20"
              style={{
                width: '180px',
                height: '180px',
                backgroundColor: targetColor,
                animationDuration: '2.5s',
              }}
            />
            <div 
              className="absolute rounded-full pointer-events-none transition-all duration-300 opacity-30"
              style={{
                width: `${160 + (audioLevel * 0.6)}px`,
                height: `${160 + (audioLevel * 0.6)}px`,
                backgroundColor: targetColor,
              }}
            />

            <div 
              className="w-40 h-40 sm:w-44 sm:h-44 rounded-full flex items-center justify-center shadow-2xl overflow-hidden border-2 border-white/10 relative z-10"
              style={{ backgroundColor: targetColor }}
            >
              {callState.targetUser.avatar ? (
                <img 
                  src={callState.targetUser.avatar} 
                  alt={callState.targetUser.name}
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-6xl font-bold text-white tracking-wider select-none">
                  {targetLetter}
                </span>
              )}
            </div>
          </div>

          {/* Bottom Actions Bar (Tolak, Terima, Kirim Pesan) */}
          <div className="w-full max-w-sm flex items-end justify-between px-4 pb-4">
            
            {/* Tolak */}
            <div className="flex flex-col items-center gap-2">
              <button
                id="btn-incoming-reject"
                onClick={handleReject}
                className="w-16 h-16 rounded-full bg-[#ea0038] hover:bg-[#d00030] text-white flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer"
                title="Tolak Panggilan"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              <span className="text-xs text-[#8696a0] font-medium">Tolak</span>
            </div>

            {/* Terima */}
            <div className="flex flex-col items-center gap-2">
              <button
                id="btn-incoming-accept"
                onClick={handleAnswer}
                className="w-16 h-16 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40 active:scale-90 transition-transform cursor-pointer animate-bounce"
                title="Terima Panggilan"
              >
                <Phone className="w-7 h-7" />
              </button>
              <span className="text-xs text-[#8696a0] font-medium text-center">
                Usap ke atas untuk menerima
              </span>
            </div>

            {/* Kirim Pesan */}
            <div className="flex flex-col items-center gap-2">
              <button
                id="btn-incoming-quick-msg"
                onClick={() => setShowQuickMessageSheet(true)}
                className="w-16 h-16 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-white flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer border border-[#374248]"
                title="Kirim Pesan Cepat"
              >
                <MessageSquare className="w-6 h-6 text-slate-200" />
              </button>
              <span className="text-xs text-[#8696a0] font-medium">Kirim pesan</span>
            </div>
          </div>

        </div>
      ) : (
        /* ========================================================================= */
        /* SCREEN 1 & 3: CALLER / ACTIVE CALL SCREEN (AUDIO & VIDEO REALTIME)        */
        /* ========================================================================= */
        <div className="relative z-10 flex flex-col justify-between w-full h-full py-4 px-2 sm:px-3">
          
          {/* Top Navigation Bar (Positioned nicely at the screen corners) */}
          <div className="w-full flex items-center justify-between text-white px-1 sm:px-2 pt-0.5">
            
            {/* Top-Left: Minimize Button (Pushed to left corner) */}
            <button
              id="btn-minimize-call"
              onClick={() => onToggleMinimize(true)}
              className="p-2 text-white/90 hover:text-white rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md transition-colors cursor-pointer shadow-md"
              title="Kecilkan Panggilan"
            >
              <Minimize2 className="w-5 h-5 transform rotate-90" />
            </button>

            {/* Top-Center: Contact Name & Status / Duration */}
            <div className="flex flex-col items-center text-center px-2">
              <span className="text-base font-bold text-white drop-shadow-md tracking-wide">
                {callState.targetUser.name}
              </span>
              <span className="text-xs font-medium text-slate-200 drop-shadow-sm font-mono mt-0.5">
                {isCallActive ? formatTimer(callDuration) : connectionStatus}
              </span>
            </div>

            {/* Top-Right Action Buttons (Pushed to right corner) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* If Video is Active: Show Flip Camera & Magic Wand buttons */}
              {isVideoMode && (
                <>
                  {/* Flip / Switch Camera Button */}
                  <button
                    id="btn-flip-camera"
                    onClick={handleFlipCamera}
                    className="p-2 text-white/90 hover:text-white rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-md"
                    title="Balik Kamera (Depan / Belakang)"
                  >
                    <RefreshCcw className="w-5 h-5" />
                  </button>

                  {/* Magic Wand / Filter Button */}
                  <button
                    id="btn-video-effects"
                    onClick={() => setShowFilterPicker(!showFilterPicker)}
                    className={`p-2 rounded-full backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-md ${
                      activeFilter !== 'normal' 
                        ? 'bg-[#5288c1] text-white' 
                        : 'bg-black/35 hover:bg-black/55 text-white/90 hover:text-white'
                    }`}
                    title="Efek & Filter Video"
                  >
                    <Wand2 className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Add Participant / Contact Button */}
              <button
                id="btn-add-participant-call"
                onClick={() => {
                  setShowAddContactNotice(true);
                  setTimeout(() => setShowAddContactNotice(false), 3000);
                }}
                className="p-2 text-white/90 hover:text-white rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md transition-colors cursor-pointer shadow-md"
                title="Tambah Peserta"
              >
                <UserPlus className="w-5 h-5" />
              </button>

              {/* End / Close Call Button */}
              <button
                id="btn-close-call-top"
                onClick={handleHangUp}
                className="p-2 text-red-300 hover:text-white rounded-full bg-red-500/30 hover:bg-red-500/70 backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-md"
                title="Tutup Panggilan (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Video Filter Picker Bar (Popup when Wand is tapped) */}
          {showFilterPicker && isVideoMode && (
            <div className="w-full bg-black/75 backdrop-blur-md border border-white/10 rounded-2xl p-3 my-2 flex items-center justify-around gap-2 animate-in fade-in slide-in-from-top-2 z-30">
              {VIDEO_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setActiveFilter(f.id);
                    setShowFilterPicker(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    activeFilter === f.id
                      ? 'bg-[#5288c1] text-white shadow-md'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}

          {/* Add Contact Toast Notice */}
          {showAddContactNotice && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-[#202c33] border border-[#374248] text-xs text-white px-4 py-2 rounded-full shadow-2xl animate-in fade-in z-30">
              Panggilan siap dibagikan melalui tombol Bagikan.
            </div>
          )}

          {/* Audio Mode Center Avatar (Only shown when not in full video mode) */}
          {!isVideoMode && (
            <div className="relative flex flex-col items-center justify-center my-auto">
              <div 
                className="absolute rounded-full pointer-events-none transition-all duration-150 opacity-15"
                style={{
                  width: `${170 + (audioLevel * 1.2)}px`,
                  height: `${170 + (audioLevel * 1.2)}px`,
                  backgroundColor: targetColor,
                }}
              />
              <div 
                className="absolute rounded-full pointer-events-none transition-all duration-200 opacity-25"
                style={{
                  width: `${150 + (audioLevel * 0.7)}px`,
                  height: `${150 + (audioLevel * 0.7)}px`,
                  backgroundColor: targetColor,
                }}
              />

              <div 
                className="w-40 h-40 sm:w-44 sm:h-44 rounded-full flex items-center justify-center shadow-2xl overflow-hidden border-2 border-white/10 relative z-10"
                style={{ backgroundColor: targetColor }}
              >
                {callState.targetUser.avatar ? (
                  <img 
                    src={callState.targetUser.avatar} 
                    alt={callState.targetUser.name}
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#2e2621]/90">
                    <User className="w-20 h-20 text-[#f59e0b]/80" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spacer when in video mode to keep bottom controls anchored */}
          {isVideoMode && <div className="flex-1" />}

          {/* Bottom Floating Control Bar */}
          {isVideoMode ? (
            /* Video Mode Bottom Bar (Screenshot 3: Sleek circular controls row) */
            <div className="w-full max-w-sm mx-auto flex items-center justify-between px-2 pb-3 z-30">
              
              {/* 1. More (...) */}
              <div className="relative">
                <button
                  id="btn-call-more-video"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-all active:scale-95 shadow-lg border border-white/10 cursor-pointer"
                  title="Opsi Lainnya"
                >
                  <MoreHorizontal className="w-6 h-6" />
                </button>

                {showMoreMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
                    <div className="absolute bottom-16 left-0 bg-[#202c33] border border-[#374248] rounded-2xl shadow-2xl py-2 w-56 z-40 text-left animate-in fade-in">
                      <div className="px-4 py-2 border-b border-[#374248]/60 flex items-center gap-2 text-xs font-semibold text-[#5288c1]">
                        <Lock className="w-3.5 h-3.5 text-[#4fae4e]" />
                        <span>Enkripsi E2E: {ENCRYPTION_EMOJIS.join(' ')}</span>
                      </div>
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          handleCopyCallLink();
                        }}
                        className="w-full px-4 py-2.5 text-xs text-slate-200 hover:bg-[#2a3942] flex items-center gap-2.5 cursor-pointer"
                      >
                        <Copy className="w-4 h-4 text-slate-400" />
                        <span>{copiedLink ? 'Tautan Disalin!' : 'Salin Tautan'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 2. Video Toggle */}
              <button
                id="btn-toggle-video-stream"
                onClick={handleToggleVideo}
                className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg cursor-pointer ${
                  isLocalVideoEnabled 
                    ? 'bg-white text-slate-900 hover:bg-slate-200' 
                    : 'bg-black/50 text-white hover:bg-black/70 border border-white/10 backdrop-blur-md'
                }`}
                title={isLocalVideoEnabled ? 'Matikan Kamera' : 'Nyalakan Kamera'}
              >
                {isLocalVideoEnabled ? <Video className="w-6 h-6 text-slate-900" /> : <VideoOff className="w-6 h-6" />}
              </button>

              {/* 3. Speaker Toggle */}
              <button
                id="btn-toggle-speaker-video"
                onClick={handleToggleSpeaker}
                className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg cursor-pointer ${
                  isSpeaker 
                    ? 'bg-white text-slate-900 hover:bg-slate-200' 
                    : 'bg-black/50 text-white hover:bg-black/70 border border-white/10 backdrop-blur-md'
                }`}
                title={isSpeaker ? 'Speaker Aktif' : 'Speaker Mati'}
              >
                {isSpeaker ? <Volume2 className="w-6 h-6 text-slate-900" /> : <VolumeX className="w-6 h-6" />}
              </button>

              {/* 4. Mic Mute Toggle */}
              <button
                id="btn-toggle-mute-video"
                onClick={handleToggleMute}
                className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg cursor-pointer ${
                  isMuted 
                    ? 'bg-red-500 text-white' 
                    : 'bg-black/50 text-white hover:bg-black/70 border border-white/10 backdrop-blur-md'
                }`}
                title={isMuted ? 'Nyalakan Mikrofon' : 'Bisukan Mikrofon'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* 5. Akhiri (Red Hangup Button) */}
              <button
                id="btn-hangup-video"
                onClick={handleHangUp}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#ea0038] hover:bg-[#d00030] text-white flex items-center justify-center shadow-2xl shadow-red-600/40 active:scale-95 transition-all cursor-pointer"
                title="Akhiri Panggilan"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

            </div>
          ) : (
            /* Audio Mode Bottom Bar (Screenshot 1: 2x3 Grid Container) */
            <div className="w-full bg-[#18222d]/90 backdrop-blur-md rounded-[28px] border border-white/5 p-5 shadow-2xl">
              <div className="grid grid-cols-3 gap-y-5 gap-x-3 items-center justify-items-center">
                
                {/* Row 1, Col 1: Speaker */}
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <button
                    id="btn-call-speaker"
                    onClick={handleToggleSpeaker}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isSpeaker 
                        ? 'bg-[#2a3942] text-white hover:bg-[#374248]' 
                        : 'bg-[#202c33] text-slate-400 hover:bg-[#2a3942]'
                    }`}
                    title={isSpeaker ? 'Speaker Aktif' : 'Speaker Mati'}
                  >
                    {isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                  </button>
                  <span className="text-xs text-slate-300 font-medium">Speaker</span>
                </div>

                {/* Row 1, Col 2: Video */}
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <button
                    id="btn-call-video"
                    onClick={handleToggleVideo}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isLocalVideoEnabled 
                        ? 'bg-[#5288c1] text-white hover:bg-[#4372a3]' 
                        : 'bg-[#2a3942] text-white hover:bg-[#374248]'
                    }`}
                    title={isLocalVideoEnabled ? 'Matikan Video' : 'Nyalakan Video'}
                  >
                    {isLocalVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6 text-slate-300" />}
                  </button>
                  <span className="text-xs text-slate-300 font-medium">Video</span>
                </div>

                {/* Row 1, Col 3: Bisukan */}
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <button
                    id="btn-call-mute"
                    onClick={handleToggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isMuted 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                        : 'bg-[#2a3942] text-white hover:bg-[#374248]'
                    }`}
                    title={isMuted ? 'Nyalakan Mikrofon' : 'Bisukan Mikrofon'}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                  <span className="text-xs text-slate-300 font-medium">Bisukan</span>
                </div>

                {/* Row 2, Col 1: Lainnya */}
                <div className="flex flex-col items-center gap-1.5 w-full relative">
                  <button
                    id="btn-call-more"
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="w-14 h-14 rounded-full bg-[#2a3942] text-white flex items-center justify-center hover:bg-[#374248] active:scale-95 transition-all cursor-pointer"
                    title="Opsi Lainnya"
                  >
                    <MoreHorizontal className="w-6 h-6" />
                  </button>
                  <span className="text-xs text-slate-300 font-medium">Lainnya</span>

                  {showMoreMenu && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
                      <div className="absolute bottom-20 left-0 bg-[#202c33] border border-[#374248] rounded-2xl shadow-2xl py-2 w-56 z-40 text-left animate-in fade-in zoom-in-95">
                        <div className="px-4 py-2 border-b border-[#374248]/60 flex items-center gap-2 text-xs font-semibold text-[#5288c1]">
                          <Lock className="w-3.5 h-3.5 text-[#4fae4e]" />
                          <span>Enkripsi E2E: {ENCRYPTION_EMOJIS.join(' ')}</span>
                        </div>
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            handleCopyCallLink();
                          }}
                          className="w-full px-4 py-2.5 text-xs text-slate-200 hover:bg-[#2a3942] flex items-center gap-2.5 cursor-pointer"
                        >
                          <Copy className="w-4 h-4 text-slate-400" />
                          <span>{copiedLink ? 'Tautan Disalin!' : 'Salin Tautan'}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Row 2, Col 2: Bagikan */}
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <button
                    id="btn-call-share"
                    onClick={handleCopyCallLink}
                    className="w-14 h-14 rounded-full bg-[#2a3942] text-white flex items-center justify-center hover:bg-[#374248] active:scale-95 transition-all cursor-pointer"
                    title="Bagikan Tautan Panggilan"
                  >
                    <Share2 className="w-6 h-6" />
                  </button>
                  <span className="text-xs text-slate-300 font-medium">
                    {copiedLink ? 'Disalin!' : 'Bagikan'}
                  </span>
                </div>

                {/* Row 2, Col 3: Akhiri */}
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <button
                    id="btn-call-hangup"
                    onClick={handleHangUp}
                    className="w-14 h-14 rounded-full bg-[#ea0038] hover:bg-[#d00030] text-white flex items-center justify-center shadow-lg shadow-red-600/30 active:scale-95 transition-all cursor-pointer"
                    title="Akhiri Panggilan"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                  <span className="text-xs text-slate-300 font-medium">Akhiri</span>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK MESSAGE BOTTOM SHEET MODAL                                          */}
      {/* ========================================================================= */}
      {showQuickMessageSheet && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#202c33] border border-[#374248] rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-5 text-white">
            <div className="flex items-center justify-between border-b border-[#374248] pb-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <MessageSquare className="w-4 h-4 text-[#5288c1]" />
                <span>Kirim Pesan & Tolak Panggilan</span>
              </div>
              <button 
                onClick={() => setShowQuickMessageSheet(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {QUICK_REPLY_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendQuickMessage(tmpl)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-[#111b21] hover:bg-[#2a3942] border border-[#2a3942] text-xs text-slate-200 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <span>{tmpl}</span>
                  <Send className="w-3.5 h-3.5 text-[#5288c1] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#374248]">
              <input
                type="text"
                placeholder="Tulis pesan kustom..."
                value={customQuickMsg}
                onChange={(e) => setCustomQuickMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendQuickMessage(customQuickMsg);
                }}
                className="flex-1 bg-[#111b21] border border-[#2a3942] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 outline-none"
              />
              <button
                onClick={() => handleSendQuickMessage(customQuickMsg)}
                disabled={!customQuickMsg.trim()}
                className="p-2.5 bg-[#5288c1] hover:bg-[#4372a3] disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
