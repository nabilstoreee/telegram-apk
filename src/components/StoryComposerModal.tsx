import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Image as ImageIcon, Type, Send, Smile, 
  AlignLeft, AlignCenter, AlignRight, Shield,
  Volume2, VolumeX, Music, Crop, Pencil, Trash2, Plus,
  Undo2, Redo2, Check
} from 'lucide-react';
import { User, Story } from '../types';
import { StoryPrivacyModal } from './StoryPrivacyModal';

export interface StoryComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onStoryCreated?: (newStory: Story) => void;
  onOpenPrivacyModal?: () => void;

  // Chat mode props
  isChatMode?: boolean;
  initialFiles?: File[];
  onSendToChat?: (payload: {
    files: File[];
    caption: string;
    isHD: boolean;
    type: 'photo' | 'video';
    mediaUrl: string;
    drawingDataUrl?: string;
  }) => void;
}

interface TextOverlayItem {
  id: string;
  text: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  color: string;
  fillStyle: 'none' | 'white-box' | 'dark-box';
  font: 'sans' | 'serif' | 'mono' | 'cursive' | 'caps' | 'neon';
  align: 'left' | 'center' | 'right';
}

interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  url: string;
  file?: File;
  name: string;
  size?: string;
  duration?: number;
  caption: string;
  textOverlays: TextOverlayItem[];
  drawingDataUrl?: string;
}

const COLOR_SPECTRUM = [
  '#ffffff', '#000000', '#ff2d55', '#ff9500', '#ffcc00', 
  '#4cd964', '#5ac8fa', '#007aff', '#5856d6', '#e040fb'
];

const FONT_OPTIONS: Array<{ id: TextOverlayItem['font']; label: string; className: string }> = [
  { id: 'sans', label: 'Aa', className: 'font-sans font-bold' },
  { id: 'serif', label: 'Aa', className: 'font-serif font-bold' },
  { id: 'mono', label: 'Aa', className: 'font-mono' },
  { id: 'cursive', label: 'Aa', className: 'italic font-serif' },
  { id: 'caps', label: 'AA', className: 'font-sans uppercase font-black tracking-widest' },
  { id: 'neon', label: 'Aa', className: 'font-sans font-bold tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]' },
];

const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
  'linear-gradient(135deg, #243949 0%, #517fa4 100%)',
];

export const StoryComposerModal: React.FC<StoryComposerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStoryCreated,
  onOpenPrivacyModal,
  isChatMode,
  initialFiles,
  onSendToChat,
}) => {
  const [mode, setMode] = useState<'media' | 'text'>('media');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  
  // Media items
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  
  // Video audio & HD control
  const [isMuted, setIsMuted] = useState(false);
  const [isHDQuality, setIsHDQuality] = useState(true);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handlePauseVideoOnPress = () => {
    if (isEditingOverlay || isDrawingMode) return;
    if (videoRef.current && currentMedia?.type === 'video') {
      videoRef.current.pause();
    }
  };

  const handleResumeVideoOnRelease = () => {
    if (videoRef.current && currentMedia?.type === 'video') {
      videoRef.current.play().catch(() => {});
    }
  };
  
  // Text Overlay Mode (`Aa`)
  const [isEditingOverlay, setIsEditingOverlay] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [currentOverlayText, setCurrentOverlayText] = useState('');
  const [currentOverlayColor, setCurrentOverlayColor] = useState('#ffffff');
  const [currentOverlayFill, setCurrentOverlayFill] = useState<'none' | 'white-box' | 'dark-box'>('white-box');
  const [currentOverlayFont, setCurrentOverlayFont] = useState<TextOverlayItem['font']>('sans');
  const [currentOverlayAlign, setCurrentOverlayAlign] = useState<'left' | 'center' | 'right'>('center');
  
  // Dragging text overlay state
  const [draggingOverlayId, setDraggingOverlayId] = useState<string | null>(null);
  const [isHoveringTrash, setIsHoveringTrash] = useState(false);

  // Drawing Canvas Mode (`✏️`)
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#4cd964');
  const [drawingPenStyle, setDrawingPenStyle] = useState<'solid' | 'neon' | 'dotted'>('solid');
  const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);
  const [drawRedoStack, setDrawRedoStack] = useState<ImageData[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Text status mode states
  const [textContent, setTextContent] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0]);
  const [selectedFont, setSelectedFont] = useState<TextOverlayItem['font']>('sans');

  // Quick Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);

  // Auto trigger file picker or load initialFiles
  useEffect(() => {
    if (!isOpen) {
      setMediaItems([]);
      setActiveIndex(0);
      setIsDrawingMode(false);
      setIsEditingOverlay(false);
      setShowEmojiPicker(false);
      setErrorMsg(null);
      return;
    }

    if (isOpen && initialFiles && initialFiles.length > 0) {
      const newItems: MediaItem[] = [];
      const fileList = Array.from(initialFiles) as File[];
      for (const file of fileList) {
        const isVideo = file.type.startsWith('video/');
        const url = URL.createObjectURL(file);
        const formattedSize = file.size > 1024 * 1024 
          ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' 
          : Math.round(file.size / 1024) + ' KB';

        const newItem: MediaItem = {
          id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          type: isVideo ? 'video' : 'photo',
          url,
          file,
          name: file.name,
          size: formattedSize,
          duration: isVideo ? 14 : undefined,
          caption: '',
          textOverlays: [],
        };

        if (isVideo) {
          const tempVideo = document.createElement('video');
          tempVideo.preload = 'metadata';
          tempVideo.src = url;
          tempVideo.onloadedmetadata = () => {
            newItem.duration = Math.round(tempVideo.duration) || 14;
            setMediaItems(prev => [...prev]);
          };
        }

        newItems.push(newItem);
      }
      setMediaItems(newItems);
      setActiveIndex(0);
      setMode('media');
    } else if (isOpen && mode === 'media' && mediaItems.length === 0 && (!initialFiles || initialFiles.length === 0)) {
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 150);
    }
  }, [isOpen, initialFiles]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentMedia = mediaItems[activeIndex] || null;

  // File Selection
  const handleMediaFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const newItems: MediaItem[] = [];

    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? 50 * 1024 * 1024 : 25 * 1024 * 1024;

      if (file.size > maxSize) {
        setErrorMsg(`File ${file.name} melebihi batas (${isVideo ? '50MB' : '25MB'}).`);
        continue;
      }

      const url = URL.createObjectURL(file);
      const formattedSize = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

      const newItem: MediaItem = {
        id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: isVideo ? 'video' : 'photo',
        url,
        file,
        name: file.name,
        size: formattedSize,
        duration: isVideo ? 14 : undefined,
        caption: '',
        textOverlays: [],
      };

      if (isVideo) {
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.src = url;
        tempVideo.onloadedmetadata = () => {
          newItem.duration = Math.round(tempVideo.duration) || 14;
          setMediaItems(prev => [...prev]);
        };
      }

      newItems.push(newItem);
    }

    if (newItems.length > 0) {
      setMediaItems(prev => {
        const updated = [...prev, ...newItems];
        if (prev.length === 0) setActiveIndex(0);
        return updated;
      });
      setMode('media');
      setErrorMsg(null);
    }

    e.target.value = '';
  };

  const handleRemoveMedia = (index: number) => {
    setMediaItems(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (activeIndex >= updated.length) {
        setActiveIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const updateCurrentCaption = (text: string) => {
    if (!currentMedia) return;
    setMediaItems(prev => prev.map((item, i) => i === activeIndex ? { ...item, caption: text } : item));
  };

  // Text Overlay Editing Functions
  const openOverlayEditor = (existingOverlay?: TextOverlayItem) => {
    if (existingOverlay) {
      setEditingTextId(existingOverlay.id);
      setCurrentOverlayText(existingOverlay.text);
      setCurrentOverlayColor(existingOverlay.color);
      setCurrentOverlayFill(existingOverlay.fillStyle);
      setCurrentOverlayFont(existingOverlay.font);
      setCurrentOverlayAlign(existingOverlay.align);
    } else {
      setEditingTextId(null);
      setCurrentOverlayText('');
      setCurrentOverlayColor('#ffffff');
      setCurrentOverlayFill('white-box');
      setCurrentOverlayFont('sans');
      setCurrentOverlayAlign('center');
    }
    setIsEditingOverlay(true);
  };

  const saveOverlayText = () => {
    if (!currentMedia) return;
    const textTrimmed = currentOverlayText.trim();
    
    if (!textTrimmed) {
      if (editingTextId) {
        // Delete if cleared
        setMediaItems(prev => prev.map((item, i) => i === activeIndex ? {
          ...item,
          textOverlays: item.textOverlays.filter(t => t.id !== editingTextId)
        } : item));
      }
      setIsEditingOverlay(false);
      return;
    }

    if (editingTextId) {
      // Update existing
      setMediaItems(prev => prev.map((item, i) => i === activeIndex ? {
        ...item,
        textOverlays: item.textOverlays.map(t => t.id === editingTextId ? {
          ...t,
          text: textTrimmed,
          color: currentOverlayColor,
          fillStyle: currentOverlayFill,
          font: currentOverlayFont,
          align: currentOverlayAlign,
        } : t)
      } : item));
    } else {
      // Create new
      const newOverlay: TextOverlayItem = {
        id: `txt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        text: textTrimmed,
        x: 50,
        y: 45,
        color: currentOverlayColor,
        fillStyle: currentOverlayFill,
        font: currentOverlayFont,
        align: currentOverlayAlign,
      };
      setMediaItems(prev => prev.map((item, i) => i === activeIndex ? {
        ...item,
        textOverlays: [...item.textOverlays, newOverlay]
      } : item));
    }

    setIsEditingOverlay(false);
  };

  // Dragging Text Overlays
  const handleOverlayPointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingOverlayId(id);
  };

  const handleOverlayPointerMove = (e: React.PointerEvent) => {
    if (!draggingOverlayId || !mediaContainerRef.current) return;
    const rect = mediaContainerRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(10, Math.min(90, ((e.clientY - rect.top) / rect.height) * 100));

    // Check if near top trash zone
    const isTrash = y < 18 && x > 35 && x < 65;
    setIsHoveringTrash(isTrash);

    setMediaItems(prev => prev.map((item, i) => i === activeIndex ? {
      ...item,
      textOverlays: item.textOverlays.map(t => t.id === draggingOverlayId ? { ...t, x, y } : t)
    } : item));
  };

  const handleOverlayPointerUp = () => {
    if (draggingOverlayId && isHoveringTrash) {
      // Delete text
      setMediaItems(prev => prev.map((item, i) => i === activeIndex ? {
        ...item,
        textOverlays: item.textOverlays.filter(t => t.id !== draggingOverlayId)
      } : item));
    }
    setDraggingOverlayId(null);
    setIsHoveringTrash(false);
  };

  // Drawing Canvas Functions
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Save history state
    setDrawHistory(prev => [...prev, ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height)]);
    setDrawRedoStack([]);

    isDrawingRef.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = drawingColor;
    ctx.lineWidth = drawingPenStyle === 'dotted' ? 6 : 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (drawingPenStyle === 'neon') {
      ctx.shadowColor = drawingColor;
      ctx.shadowBlur = 12;
    } else {
      ctx.shadowBlur = 0;
    }

    if (drawingPenStyle === 'dotted') {
      ctx.setLineDash([2, 12]);
    } else {
      ctx.setLineDash([]);
    }
  };

  const drawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleUndoDraw = () => {
    if (!canvasRef.current || drawHistory.length === 0) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const currentState = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setDrawRedoStack(prev => [...prev, currentState]);

    const previousState = drawHistory[drawHistory.length - 1];
    setDrawHistory(prev => prev.slice(0, -1));
    ctx.putImageData(previousState, 0, 0);
  };

  const handleRedoDraw = () => {
    if (!canvasRef.current || drawRedoStack.length === 0) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const currentState = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setDrawHistory(prev => [...prev, currentState]);

    const nextState = drawRedoStack[drawRedoStack.length - 1];
    setDrawRedoStack(prev => prev.slice(0, -1));
    ctx.putImageData(nextState, 0, 0);
  };

  const saveDrawingCanvas = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setMediaItems(prev => prev.map((item, i) => i === activeIndex ? { ...item, drawingDataUrl: dataUrl } : item));
    }
    setIsDrawingMode(false);
  };

  // Upload and publish
  const uploadFileToServer = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) return data.url;
      }
    } catch (e) {
      console.warn('Upload error:', e);
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        try {
          const res = await fetch('/api/upload/base64', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl, type: file.type.startsWith('video/') ? 'video' : 'photo', name: file.name }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.url) return resolve(data.url);
          }
        } catch (err) {
          console.warn('Base64 upload error:', err);
        }
        resolve(dataUrl);
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handlePublishStory = async () => {
    if (isSubmitting) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    if (isChatMode && onSendToChat) {
      if (mediaItems.length === 0) {
        setErrorMsg('Silakan pilih foto atau video terlebih dahulu.');
        setIsSubmitting(false);
        return;
      }

      const currentItem = mediaItems[activeIndex] || mediaItems[0];
      const overlayTexts = currentItem.textOverlays.map(t => t.text).join('\n');
      const combinedCaption = [overlayTexts, currentItem.caption.trim()].filter(Boolean).join('\n');

      let drawingDataUrl: string | undefined = undefined;
      if (canvasRef.current) {
        try {
          drawingDataUrl = canvasRef.current.toDataURL();
        } catch (err) {}
      }

      const filesToSend = mediaItems.map(m => m.file).filter(Boolean) as File[];

      onSendToChat({
        files: filesToSend.length > 0 ? filesToSend : (currentItem.file ? [currentItem.file] : []),
        type: currentItem.type === 'video' ? 'video' : 'photo',
        mediaUrl: currentItem.url,
        caption: combinedCaption,
        isHD: isHDQuality,
        drawingDataUrl,
      });

      setIsSubmitting(false);
      onClose();
      return;
    }

    const effectivePrivacyType = currentUser.storyPrivacy?.type || (currentUser.username?.toLowerCase() === 'nabilassihidiqi' ? 'all' : 'contacts');

    try {
      if (mode === 'media') {
        if (mediaItems.length === 0) {
          setErrorMsg('Silakan pilih foto atau video terlebih dahulu.');
          setIsSubmitting(false);
          return;
        }

        for (const item of mediaItems) {
          let mediaUrl = item.url;
          if (item.file) {
            mediaUrl = await uploadFileToServer(item.file);
          }

          // Combine overlay text with caption
          const overlayTexts = item.textOverlays.map(t => t.text).join('\n');
          const combinedText = [overlayTexts, item.caption.trim()].filter(Boolean).join('\n');

          const payload = {
            userId: currentUser.id,
            userName: currentUser.name,
            userAvatar: currentUser.avatar,
            userColor: currentUser.color || '#5288c1',
            type: item.type,
            mediaUrl,
            text: combinedText || undefined,
            videoDuration: item.duration,
            privacyType: effectivePrivacyType,
            whitelistUserIds: currentUser.storyPrivacy?.whitelistUserIds || [],
            blacklistUserIds: currentUser.storyPrivacy?.blacklistUserIds || [],
          };

          const res = await fetch('/api/stories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            const result = await res.json();
            if (result.story) {
              onStoryCreated(result.story);
            }
          }
        }

        onClose();
      } else if (mode === 'text') {
        if (!textContent.trim()) {
          setErrorMsg('Silakan tulis teks untuk status Anda.');
          setIsSubmitting(false);
          return;
        }

        const payload = {
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          userColor: currentUser.color || '#5288c1',
          type: 'text',
          text: textContent.trim(),
          backgroundGradient: selectedGradient,
          backgroundColor: selectedGradient,
          fontFamily: selectedFont,
          textAlign: 'center',
          privacyType: effectivePrivacyType,
          whitelistUserIds: currentUser.storyPrivacy?.whitelistUserIds || [],
          blacklistUserIds: currentUser.storyPrivacy?.blacklistUserIds || [],
        };

        const res = await fetch('/api/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Gagal mempublikasikan status');
        }

        const result = await res.json();
        if (result.story) {
          onStoryCreated(result.story);
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat membagikan status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const privacyLabel = currentUser.storyPrivacy?.type === 'all' 
    ? 'Status (Publik)' 
    : currentUser.storyPrivacy?.type === 'whitelist' 
    ? 'Status (Hanya Bagikan Ke...)' 
    : currentUser.storyPrivacy?.type === 'blacklist' 
    ? 'Status (Kecuali...)' 
    : 'Status (Kontak)';

  return (
    <div 
      id="story-composer-backdrop"
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between select-none overflow-hidden animate-in fade-in duration-150"
      onPointerMove={handleOverlayPointerMove}
      onPointerUp={handleOverlayPointerUp}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*,video/*" 
        multiple 
        onChange={handleMediaFilesSelect} 
        className="hidden" 
      />

      {/* ========================================================================= */}
      {/* FULLSCREEN PHOTO & VIDEO EDITOR VIEW (Exact WhatsApp/Telegram Style)       */}
      {/* ========================================================================= */}
      {mode === 'media' && currentMedia ? (
        <div className="relative w-full h-full bg-black text-white overflow-hidden">
          
          {/* TOP HEADER TOOLBAR */}
          <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 bg-linear-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between pointer-events-auto">
            {/* Close Button */}
            {!isEditingOverlay && !isDrawingMode && (
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-lg cursor-pointer transition-all active:scale-95"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Right Tools Icons Header (HD, Pencil & Volume) */}
            {!isEditingOverlay && !isDrawingMode && (
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-lg ml-auto">
                <button
                  type="button"
                  onClick={() => setIsHDQuality(!isHDQuality)}
                  className={`px-2.5 py-1 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    isHDQuality
                      ? 'bg-[#22c55e] text-black shadow-md scale-105'
                      : 'hover:bg-white/20 text-white'
                  }`}
                  title={isHDQuality ? "Kualitas HD Aktif" : "Kualitas Standar (Ketuk untuk HD)"}
                >
                  HD
                </button>

                <button
                  type="button"
                  onClick={() => setIsDrawingMode(true)}
                  className="w-9 h-9 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                  title="Coret / Gambar"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                {currentMedia.type === 'video' && (
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="w-9 h-9 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                    title={isMuted ? "Aktifkan Suara" : "Matikan Suara"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
            )}

            {/* Editing Overlay Header */}
            {isEditingOverlay && (
              <div className="flex items-center justify-between w-full pt-1">
                <button
                  type="button"
                  onClick={saveOverlayText}
                  className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full font-bold text-xs backdrop-blur-md cursor-pointer transition-all active:scale-95 shadow"
                >
                  Selesai
                </button>

                {/* Align & Fill Toggle */}
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md p-1 rounded-full border border-white/15">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentOverlayAlign(prev => prev === 'left' ? 'center' : prev === 'center' ? 'right' : 'left');
                    }}
                    className="p-1.5 text-white/80 hover:text-white rounded-full"
                  >
                    {currentOverlayAlign === 'left' ? <AlignLeft className="w-4 h-4" /> :
                     currentOverlayAlign === 'center' ? <AlignCenter className="w-4 h-4" /> :
                     <AlignRight className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentOverlayFill(prev => prev === 'none' ? 'white-box' : prev === 'white-box' ? 'dark-box' : 'none');
                    }}
                    className="px-2 py-0.5 text-xs font-black rounded border border-white/40 cursor-pointer"
                  >
                    A*
                  </button>
                </div>
              </div>
            )}

            {/* Drawing Canvas Header */}
            {isDrawingMode && (
              <div className="flex items-center justify-between w-full pt-1">
                <button
                  type="button"
                  onClick={saveDrawingCanvas}
                  className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full font-bold text-xs backdrop-blur-md cursor-pointer transition-all active:scale-95 shadow"
                >
                  Selesai
                </button>

                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-white/15">
                  <button
                    type="button"
                    onClick={handleUndoDraw}
                    disabled={drawHistory.length === 0}
                    className="p-1.5 text-white/80 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedoDraw}
                    disabled={drawRedoStack.length === 0}
                    className="p-1.5 text-white/80 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* MAIN MEDIA CANVAS & OVERLAYS */}
          <div 
            ref={mediaContainerRef}
            onPointerDown={handlePauseVideoOnPress}
            onPointerUp={handleResumeVideoOnRelease}
            onPointerCancel={handleResumeVideoOnRelease}
            onMouseLeave={handleResumeVideoOnRelease}
            className="absolute inset-0 z-0 w-full h-full flex items-center justify-center bg-black overflow-hidden cursor-pointer"
          >
            {currentMedia.type === 'video' ? (
              <div className="relative w-full h-full flex items-center justify-center">
                {isVideoLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-25 bg-black/60 backdrop-blur-xs pointer-events-none">
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
                <video 
                  ref={videoRef}
                  src={currentMedia.url} 
                  autoPlay 
                  loop 
                  muted={isMuted}
                  playsInline 
                  onLoadStart={() => setIsVideoLoading(true)}
                  onWaiting={() => setIsVideoLoading(true)}
                  onCanPlay={() => setIsVideoLoading(false)}
                  onPlaying={() => setIsVideoLoading(false)}
                  controls={false}
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              </div>
            ) : (
              <img 
                src={currentMedia.url} 
                alt="Status Preview" 
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            )}

            {/* Saved Drawing Canvas Layer */}
            {currentMedia.drawingDataUrl && (
              <img 
                src={currentMedia.drawingDataUrl} 
                alt="Draw Layer" 
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
              />
            )}

            {/* Interactive Drawing Mode Canvas */}
            {isDrawingMode && (
              <canvas
                ref={canvasRef}
                width={800}
                height={1200}
                onPointerDown={startDrawing}
                onPointerMove={drawMove}
                onPointerUp={stopDrawing}
                className="absolute inset-0 w-full h-full object-contain z-25 cursor-crosshair touch-none"
              />
            )}

            {/* Drag Trash Zone */}
            {draggingOverlayId && (
              <div 
                className={`absolute top-16 inset-x-0 mx-auto w-12 h-12 rounded-full flex items-center justify-center z-40 transition-all border shadow-2xl ${
                  isHoveringTrash ? 'bg-red-600 scale-125 border-white text-white' : 'bg-black/60 border-white/30 text-white/80'
                }`}
              >
                <Trash2 className="w-6 h-6" />
              </div>
            )}

            {/* Placed Text Overlays on Media Canvas */}
            {currentMedia.textOverlays.map((t) => {
              const isSelected = editingTextId === t.id && isEditingOverlay;
              if (isSelected) return null; // Hidden while editing in modal overlay

              const fillClasses = 
                t.fillStyle === 'white-box' ? 'bg-white text-black font-extrabold px-3 py-1.5 rounded-lg shadow-xl' :
                t.fillStyle === 'dark-box' ? 'bg-black/75 text-white font-extrabold px-3 py-1.5 rounded-lg shadow-xl' :
                'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] font-bold';

              const fontClass = FONT_OPTIONS.find(f => f.id === t.font)?.className || 'font-sans';

              return (
                <div
                  key={t.id}
                  onPointerDown={(e) => handleOverlayPointerDown(t.id, e)}
                  onClick={() => openOverlayEditor(t)}
                  style={{
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    transform: 'translate(-50%, -50%)',
                    color: t.fillStyle === 'white-box' ? '#000000' : t.color,
                  }}
                  className={`absolute z-20 max-w-[85%] text-center cursor-grab active:cursor-grabbing select-none transition-transform active:scale-105 ${fillClasses} ${fontClass}`}
                >
                  {t.text}
                </div>
              );
            })}

            {/* Active Text Overlay Input Modal Overlay */}
            {isEditingOverlay && (
              <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in">
                <textarea
                  autoFocus
                  value={currentOverlayText}
                  onChange={(e) => setCurrentOverlayText(e.target.value)}
                  placeholder="Tambah teks"
                  rows={3}
                  style={{ 
                    color: currentOverlayFill === 'white-box' ? '#000000' : currentOverlayColor,
                    textAlign: currentOverlayAlign,
                  }}
                  className={`w-full max-w-md bg-transparent border-none text-center font-bold text-2xl md:text-3xl focus:outline-hidden placeholder-white/50 resize-none drop-shadow-2xl ${
                    currentOverlayFill === 'white-box' ? 'bg-white px-4 py-2 rounded-xl text-black font-extrabold shadow-2xl' :
                    currentOverlayFill === 'dark-box' ? 'bg-black/80 px-4 py-2 rounded-xl text-white font-extrabold shadow-2xl' : ''
                  } ${FONT_OPTIONS.find(f => f.id === currentOverlayFont)?.className || 'font-sans'}`}
                />

                {/* Font Selector Pill Row at bottom */}
                <div className="absolute bottom-12 inset-x-0 mx-auto flex items-center justify-center gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setCurrentOverlayFont(f.id)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm border transition-all cursor-pointer ${
                        currentOverlayFont === f.id ? 'border-white bg-white/30 text-white scale-110 shadow-lg' : 'border-white/30 bg-black/40 text-white/70 hover:text-white'
                      } ${f.className}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Vertical Rainbow Color Slider Bar (Right Side) */}
            {(isEditingOverlay || isDrawingMode) && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 h-64 w-6 rounded-full bg-linear-to-b from-red-500 via-yellow-400 via-green-500 via-cyan-400 via-blue-600 to-purple-600 border border-white/40 shadow-2xl flex flex-col items-center justify-between p-1">
                {COLOR_SPECTRUM.map((col, idx) => (
                  <button
                    key={`${col}-${idx}`}
                    type="button"
                    onClick={() => {
                      if (isEditingOverlay) setCurrentOverlayColor(col);
                      if (isDrawingMode) setDrawingColor(col);
                    }}
                    style={{ backgroundColor: col }}
                    className="w-4 h-4 rounded-full border border-black/40 hover:scale-125 transition-transform cursor-pointer shadow"
                  />
                ))}
              </div>
            )}

          </div>

          {/* BOTTOM FLOATING CONTROLS & CAPTION BAR */}
          <div className="absolute bottom-0 inset-x-0 z-30 w-full flex flex-col bg-linear-to-t from-black via-black/90 to-transparent p-3 sm:p-4 gap-2.5 pointer-events-auto">
            
            {/* Error Message */}
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-600/90 text-white text-xs flex items-center justify-between shadow-lg">
                <span>{errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} className="p-1 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Floating Thumbnails Card Container (Shown only when 2+ media items exist) */}
            {mediaItems.length > 1 && (
              <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 px-1 no-scrollbar w-full">
                {mediaItems.map((item, idx) => (
                  <div 
                    key={item.id}
                    onClick={() => setActiveIndex(idx)}
                    className={`relative w-12 h-12 rounded-lg overflow-hidden cursor-pointer border-2 transition-all shrink-0 bg-neutral-900 ${
                      idx === activeIndex ? 'border-white scale-105 shadow-xl' : 'border-white/30 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {item.type === 'video' ? (
                      <video src={item.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={item.url} alt="Thumb" className="w-full h-full object-cover" />
                    )}
                    
                    {/* Trash Icon Overlay on Active Thumbnail */}
                    {idx === activeIndex && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveMedia(idx);
                        }}
                        className="absolute inset-0 m-auto w-7 h-7 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow"
                        title="Hapus foto/video ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Caption Input Field Bar (Gallery Icon + "Tambah keterangan...") */}
            {/* NO AI BUTTON, NO @ BUTTON */}
            <div className="w-full bg-[#1c242d]/90 backdrop-blur-md border border-white/20 rounded-2xl flex items-center px-3.5 py-2.5 gap-3 shadow-2xl">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title="Pilih foto/video lagi"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={currentMedia.caption}
                onChange={(e) => updateCurrentCaption(e.target.value)}
                placeholder="Tambah keterangan..."
                className="flex-1 bg-transparent text-sm text-white placeholder-white/60 focus:outline-hidden font-medium"
              />

              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Emoji Strip */}
            {showEmojiPicker && (
              <div className="flex items-center gap-2 overflow-x-auto py-1.5 px-3 bg-neutral-900/90 border border-white/20 rounded-2xl backdrop-blur-md">
                {['✨', '🔥', '❤️', '🙌', '🌟', '🎉', '☕', '💡', '🎵', '🚀'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => updateCurrentCaption(currentMedia.caption + emoji)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-lg transition-colors cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Bottom Row: Status Privacy Pill (Left, HIDDEN in Chat Mode) & Green Send Button (Right) */}
            <div className="w-full flex items-center justify-between pt-1">
              {!isChatMode && (
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="px-3.5 py-2 bg-[#202b36] hover:bg-[#2b394a] border border-white/15 rounded-full text-xs font-semibold text-white/90 flex items-center gap-2 cursor-pointer shadow-lg transition-all active:scale-95"
                >
                  <Shield className="w-3.5 h-3.5 text-[#5288c1]" />
                  <span>{privacyLabel}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePublishStory}
                disabled={isSubmitting}
                className={`w-12 h-12 bg-[#25d366] hover:bg-[#20bd5a] disabled:opacity-50 text-white rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer active:scale-95 shrink-0 ${
                  isChatMode ? 'ml-auto' : ''
                }`}
                title={isChatMode ? "Kirim Pesan" : "Bagikan Status"}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5 translate-x-0.5" />
                )}
              </button>
            </div>

          </div>

        </div>
      ) : (
        /* ========================================================================= */
        /* GALLERY DROPZONE & TEXT STATUS CREATOR                                   */
        /* ========================================================================= */
        <div className="relative w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] bg-[#17212b] text-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border-0 sm:border sm:border-[#2b394a] my-auto">
          
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-[#202b36] border-b border-[#101921] shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-white leading-tight">Buat Status Baru</h3>
              <p className="text-[11px] text-[#7f91a4]">Akan hilang otomatis setelah 24 jam</p>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="p-2 rounded-full text-[#7f91a4] hover:text-white hover:bg-[#17212b] transition-colors cursor-pointer"
                title="Opsi Privasi Status"
              >
                <Shield className="w-4 h-4 text-[#5288c1]" />
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-[#7f91a4] hover:text-white hover:bg-[#17212b] transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center p-2 bg-[#17212b] border-b border-[#242f3d] shrink-0 gap-2">
            <button
              onClick={() => {
                setMode('media');
                fileInputRef.current?.click();
              }}
              className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                mode === 'media' 
                  ? 'bg-[#5288c1] text-white shadow-md shadow-[#5288c1]/20' 
                  : 'text-[#7f91a4] hover:text-white hover:bg-[#202b36]'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Pilih Foto / Video</span>
            </button>

            <button
              onClick={() => {
                setMode('text');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                mode === 'text' 
                  ? 'bg-[#5288c1] text-white shadow-md shadow-[#5288c1]/20' 
                  : 'text-[#7f91a4] hover:text-white hover:bg-[#202b36]'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Teks Berwarna</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-center justify-between">
                <span>{errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} className="p-1 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {mode === 'media' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center border-2 border-dashed border-[#2b394a] hover:border-[#5288c1] rounded-2xl p-10 bg-[#202b36]/40 hover:bg-[#202b36] cursor-pointer transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-[#17212b] border border-[#2b394a] group-hover:border-[#5288c1] flex items-center justify-center text-[#5288c1] mb-3 transition-colors">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <div className="text-sm font-semibold text-white group-hover:text-[#5288c1] transition-colors">
                    Pilih Foto atau Video dari Galeri
                  </div>
                  <p className="text-xs text-[#7f91a4] mt-1 text-center max-w-xs">
                    Mendukung JPG, PNG, MP4, MOV hingga 50MB. Bisa pilih banyak foto/video sekaligus!
                  </p>
                </button>
              </div>
            )}

            {mode === 'text' && (
              <div className="space-y-4">
                <div 
                  className="relative rounded-2xl overflow-hidden aspect-4/3 flex items-center justify-center p-6 shadow-inner transition-all duration-300 border border-[#2b394a]"
                  style={{ background: selectedGradient }}
                >
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Ketik status Anda di sini..."
                    maxLength={300}
                    className="w-full bg-transparent border-0 text-white placeholder-white/60 focus:outline-hidden resize-none text-center font-bold text-lg md:text-xl drop-shadow-md custom-scrollbar"
                    rows={4}
                  />
                  <div className="absolute bottom-2.5 right-3 text-[10px] text-white/75 font-medium drop-shadow">
                    {textContent.length}/300
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#7f91a4] block">Pilih Tema Warna Latar</label>
                  <div className="grid grid-cols-4 gap-2">
                    {GRADIENT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedGradient(preset)}
                        className={`h-11 rounded-xl cursor-pointer relative transition-transform hover:scale-105 border-2 ${
                          selectedGradient === preset ? 'border-white scale-102 shadow-lg' : 'border-transparent'
                        }`}
                        style={{ background: preset }}
                      >
                        {selectedGradient === preset && (
                          <div className="absolute inset-0 flex items-center justify-center text-white drop-shadow">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-4 sm:px-5 py-3.5 bg-[#202b36] border-t border-[#101921] flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#7f91a4] hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>

            {mode === 'text' && (
              <button
                type="button"
                onClick={handlePublishStory}
                disabled={isSubmitting || !textContent.trim()}
                className="px-5 py-2.5 bg-[#25d366] hover:bg-[#20bd5a] disabled:opacity-40 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Mempublikasikan...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Bagikan Status</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      )}

      {/* Story Privacy Modal */}
      {isPrivacyModalOpen && (
        <StoryPrivacyModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
          currentUser={currentUser}
          onSave={(newSetting) => {
            currentUser.storyPrivacy = newSetting;
          }}
        />
      )}
    </div>
  );
};
