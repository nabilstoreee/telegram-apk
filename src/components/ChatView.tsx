import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Search, Phone, MoreVertical, Paperclip, 
  Smile, Mic, Send, Image as ImageIcon, FileText, CheckCheck, 
  Check, VolumeX, Shield, Play, Pause, Trash2, Reply, SmilePlus, 
  CheckCircle2, Sparkles, X, User, Copy, Bell, Share2, Info, CheckCheck as CheckIcon,
  Pin, PinOff, Forward, CornerUpLeft, CornerUpRight, ChevronDown, CircleSlash,
  Video, VideoOff, PhoneCall, PhoneMissed, ArrowUpRight, PhoneOutgoing, PhoneIncoming,
  Pencil, Download, Star, Film, Clock, Upload
} from 'lucide-react';
import { Chat, Message, User as UserType, Attachment } from '../types';
import { playTelegramSound } from '../utils/sound';
import { formatMessageTime } from '../utils/time';
import { UserAvatar } from './UserAvatar';
import { compressImage } from '../utils/image';
import { ContactProfileModal } from './ContactProfileModal';
import { ForwardModal } from './ForwardModal';
import { GroupProfileModal } from './GroupProfileModal';
import { JoinGroupModal } from './JoinGroupModal';
import { getMaskedContact } from '../utils/privacy';
import { VerifiedBadge } from './VerifiedBadge';
import { useSettings } from '../contexts/SettingsContext';
import { TelegramVideoViewer } from './TelegramVideoViewer';
import { DetailMediaModal } from './DetailMediaModal';
import { StoryComposerModal } from './StoryComposerModal';

// Helper to parse call messages and match Telegram call bubble styling
const parseCallMessage = (msg: Message) => {
  if (msg.callInfo) {
    const isVideo = msg.callInfo.type === 'video';
    const status = msg.callInfo.status;
    const duration = Number(msg.callInfo.duration) || 0;

    let subtitle = '0 dtk';
    if (status === 'declined') {
      subtitle = 'Panggilan ditolak';
    } else if (status === 'missed') {
      subtitle = 'Panggilan tak terjawab';
    } else if (status === 'cancelled') {
      subtitle = 'Panggilan dibatalkan';
    } else {
      const hours = Math.floor(duration / 3600);
      const remainingSecs = duration % 3600;
      const mins = Math.floor(remainingSecs / 60);
      const secs = remainingSecs % 60;
      if (hours > 0) {
        subtitle = mins > 0 ? `${hours} j, ${mins} mnt` : `${hours} j`;
      } else if (mins > 0) {
        subtitle = `${mins} mnt`;
      } else {
        subtitle = `${secs} dtk`;
      }
    }

    return {
      isCall: true,
      type: msg.callInfo.type,
      status,
      duration,
      subtitle,
      title: isVideo ? 'Telepon video' : 'Telepon suara',
    };
  }

  // Fallback for legacy / incoming text call notifications
  const text = msg.text || '';
  if (
    text.startsWith('📞') ||
    text.startsWith('📹') ||
    text.toLowerCase().startsWith('telepon suara') ||
    text.toLowerCase().startsWith('telepon video')
  ) {
    const isVideo = text.toLowerCase().includes('video') || text.startsWith('📹');
    let status: 'completed' | 'missed' | 'declined' | 'cancelled' = 'completed';
    let subtitle = '0 dtk';

    if (text.toLowerCase().includes('ditolak')) {
      status = 'declined';
      subtitle = 'Panggilan ditolak';
    } else if (text.toLowerCase().includes('tak terjawab') || text.toLowerCase().includes('missed')) {
      status = 'missed';
      subtitle = 'Panggilan tak terjawab';
    } else if (text.toLowerCase().includes('dibatalkan') || text.toLowerCase().includes('cancelled')) {
      status = 'cancelled';
      subtitle = 'Panggilan dibatalkan';
    } else {
      const match = text.match(/\((.*?)\)/) || text.match(/:\s*(.*)$/);
      if (match && match[1]) {
        subtitle = match[1].trim();
      }
    }

    return {
      isCall: true,
      type: (isVideo ? 'video' : 'audio') as 'video' | 'audio',
      status,
      duration: 0,
      subtitle,
      title: isVideo ? 'Telepon video' : 'Telepon suara',
    };
  }

  return null;
};

const formatCallTime = (createdAt?: number, fallbackStr?: string): string => {
  if (createdAt) {
    const d = new Date(createdAt);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}.${m}`;
  }
  if (fallbackStr && fallbackStr.includes(':')) {
    return fallbackStr.replace(':', '.');
  }
  return fallbackStr || '12.00';
};

interface ChatViewProps {
  chat: Chat;
  currentUser: UserType;
  allUsers?: UserType[];
  chats?: Chat[];
  onBack: () => void;
  onSendMessage: (text: string, replyTo?: Message, attachments?: any[]) => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onDeleteMessages?: (messageIds: string[]) => void;
  onForwardMessages?: (targetChatId: string, messages: Message[]) => void;
  onForwardToUser?: (targetUser: UserType, messages: Message[]) => void;
  onToggleBlockUser?: (targetUserId: string) => void;
  onUpdateGroup?: (chatId: string, updates: Partial<Chat>) => Promise<void>;
  onDeleteGroup?: (chatId: string) => Promise<void>;
  onAddMembers?: (chatId: string, participantIds: string[]) => Promise<void>;
  onLeaveGroup?: (chatId: string) => Promise<void>;
  onJoinedGroup?: (chat: any) => void;
  onDeleteChat?: (chatId: string, deleteForBoth?: boolean) => void;
  onStartCall?: (targetUser: UserType, callType?: 'audio' | 'video') => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  chat,
  currentUser,
  allUsers = [],
  chats = [],
  onBack,
  onSendMessage,
  onReactMessage,
  onDeleteMessage,
  onDeleteMessages,
  onForwardMessages,
  onForwardToUser,
  onToggleBlockUser,
  onUpdateGroup,
  onDeleteGroup,
  onAddMembers,
  onLeaveGroup,
  onJoinedGroup,
  onDeleteChat,
  onStartCall,
}) => {
  const { settings } = useSettings();

  const isGroup = chat.type === 'group';
  const isOwnerOrAdmin = isGroup && (chat.ownerId === currentUser.id || chat.adminIds?.includes(currentUser.id));
  const canSendText = !isGroup || isOwnerOrAdmin || chat.permissions?.sendText !== false;
  
  const mediaPerms = chat.permissions?.sendMedia;
  const canSendMedia = !isGroup || isOwnerOrAdmin || (
    mediaPerms === undefined || 
    mediaPerms.photos !== false || 
    mediaPerms.videos !== false || 
    mediaPerms.files !== false || 
    mediaPerms.voiceNotes !== false
  );

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [stagedAttachment, setStagedAttachment] = useState<{
    type: 'image' | 'video';
    url: string;
    serverUrl?: string;
    file?: File;
    name: string;
    size: string;
    duration?: number;
    thumbnailUrl?: string;
    isHD?: boolean;
    width?: number;
    height?: number;
    aspectRatio?: number;
    isUploading?: boolean;
    uploadPromise?: Promise<string>;
  } | null>(null);
  const [mediaAspectRatios, setMediaAspectRatios] = useState<Record<string, number>>({});
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const audioTimerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showGroupProfile, setShowGroupProfile] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [joinModalLink, setJoinModalLink] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  // Clear History & Delete Chat Modal States
  const [showClearHistoryModal, setShowClearHistoryModal] = useState<boolean>(false);
  const [showDeleteChatModal, setShowDeleteChatModal] = useState<boolean>(false);
  const [isDeleteForBoth, setIsDeleteForBoth] = useState<boolean>(true);

  // Single-Tap Context Menu State (Foto 1)
  const [contextMenuMsg, setContextMenuMsg] = useState<Message | null>(null);
  const [contextMenuCoords, setContextMenuCoords] = useState<{ x: number; y: number } | null>(null);

  // Long-Press Selection Mode State (Foto 2)
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([]);

  // Forward Modal State
  const [showForwardModal, setShowForwardModal] = useState<boolean>(false);
  const [messagesToForward, setMessagesToForward] = useState<Message[]>([]);

  // Edit Message State
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    messageIds: string[];
    isMulti?: boolean;
  } | null>(null);

  // Detail Media Modal State
  const [detailMediaModal, setDetailMediaModal] = useState<{
    isOpen: boolean;
    isHD: boolean;
    standardSize?: string;
    standardRes?: string;
    hdSize?: string;
    hdRes?: string;
    onSelectQuality?: (isHD: boolean) => void;
  }>({
    isOpen: false,
    isHD: true,
  });

  // Chat Fullscreen Media Composer State
  const [chatMediaComposer, setChatMediaComposer] = useState<{
    isOpen: boolean;
    files: File[];
  }>({
    isOpen: false,
    files: [],
  });
  const [enlargedPhoto, setEnlargedPhoto] = useState<{
    url: string;
    msg: Message;
    name?: string;
    type?: 'image' | 'video';
  } | null>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState<boolean>(false);
  const [showViewerOverlay, setShowViewerOverlay] = useState<boolean>(true);
  const [photoReplyText, setPhotoReplyText] = useState<string>('');
  const [starredMsgIds, setStarredMsgIds] = useState<string[]>([]);

  // Touch & Pointer Long-Press Tracking
  const longPressTimerRef = useRef<any>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  const pointerStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioBlobUrlRef = useRef<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledMsgIdsRef = useRef<Set<string>>(new Set());
  const pendingRetryPayloadsRef = useRef<Map<string, { caption: string; replyData: any; serverAttachments: Attachment[] }>>(new Map());

  const otherParticipantId = chat.type === 'direct'
    ? (chat.participants?.find((p) => p !== currentUser.id) || chat.id)
    : undefined; // Target user is only for direct chats

  const targetUser = chat.type === 'direct' ? allUsers.find((u) => 
    u.id === otherParticipantId || 
    u.id === chat.id ||
    (chat.username && u.username && u.username.toLowerCase() === chat.username.toLowerCase().replace('@', '')) ||
    (chat.name && u.name && u.name.toLowerCase() === chat.name.toLowerCase())
  ) : undefined;

  const rawContact = targetUser
    ? {
        ...chat,
        name: targetUser.name || chat.name,
        username: targetUser.username || chat.username,
        isVerified: targetUser.isVerified ?? chat.isVerified,
        badgeColor: targetUser.badgeColor ?? (chat as any).badgeColor,
        customBadge: targetUser.customBadge ?? (chat as any).customBadge,
        color: targetUser.color || chat.color,
        bio: targetUser.bio,
        phone: targetUser.phone,
        avatar: targetUser.avatar,
        isOnline: targetUser.isOnline,
        lastSeen: targetUser.lastSeen,
        privacyLastSeen: targetUser.privacyLastSeen,
        privacyPhone: targetUser.privacyPhone,
        privacyUsername: targetUser.privacyUsername,
        privacyProfilePhoto: targetUser.privacyProfilePhoto,
        privacyBio: targetUser.privacyBio,
        privacyCalls: targetUser.privacyCalls,
        privacyVoiceMessages: targetUser.privacyVoiceMessages,
        privacyExceptions: targetUser.privacyExceptions,
        blockedUsers: targetUser.blockedUsers,
      }
    : chat;
  const maskedChat = chat.type === 'direct' ? getMaskedContact(rawContact, currentUser.id) : chat;

  const isBlockedByTarget = Boolean(
    chat.type === 'direct' && (
      chat.isBlockedBy ||
      maskedChat.isBlockedBy ||
      chat.isBlocked ||
      maskedChat.isBlocked ||
      chat.isAdminBlocked ||
      maskedChat.isAdminBlocked ||
      chat.name?.toLowerCase().includes('terhapus') ||
      chat.name?.toLowerCase().includes('terblokir') ||
      chat.name?.toLowerCase().includes('tidak ditemukan') ||
      chat.name?.toLowerCase().includes('deleted') ||
      chat.name?.toLowerCase().includes('blocked') ||
      maskedChat.name?.toLowerCase().includes('terhapus') ||
      maskedChat.name?.toLowerCase().includes('terblokir') ||
      maskedChat.name?.toLowerCase().includes('tidak ditemukan') ||
      maskedChat.name?.toLowerCase().includes('deleted') ||
      maskedChat.name?.toLowerCase().includes('blocked') ||
      (targetUser?.blockedUsers && (
        targetUser.blockedUsers.includes(currentUser.id) ||
        (currentUser.username && targetUser.blockedUsers.some((b) => b.toLowerCase() === currentUser.username.toLowerCase() || b.toLowerCase() === `@${currentUser.username.toLowerCase()}`)) ||
        (currentUser.name && targetUser.blockedUsers.some((b) => b.toLowerCase() === currentUser.name.toLowerCase()))
      ))
    )
  );

  const isBlockedByMe = Boolean(
    chat.type === 'direct' && (
      Boolean(currentUser?.blockedUsers && currentUser.blockedUsers.length > 0 && (
        (targetUser && (
          currentUser.blockedUsers.includes(targetUser.id) ||
          currentUser.blockedUsers.some((b) => b.toLowerCase() === targetUser.id.toLowerCase())
        )) ||
        (targetUser?.username && (
          currentUser.blockedUsers.some((b) => {
            const clean = b.replace(/^@/, '').toLowerCase();
            return clean === targetUser.username.toLowerCase();
          })
        )) ||
        (targetUser?.name && (
          currentUser.blockedUsers.some((b) => b.toLowerCase() === targetUser.name.toLowerCase())
        )) ||
        (otherParticipantId && (
          currentUser.blockedUsers.some((b) => b.toLowerCase() === otherParticipantId.toLowerCase() || b.toLowerCase() === otherParticipantId.replace(/^@/, '').toLowerCase())
        )) ||
        (chat.username && (
          currentUser.blockedUsers.some((b) => {
            const clean = b.replace(/^@/, '').toLowerCase();
            return clean === chat.username.replace(/^@/, '').toLowerCase();
          })
        )) ||
        (chat.name && (
          currentUser.blockedUsers.some((b) => b.toLowerCase() === chat.name.toLowerCase())
        ))
      ))
    )
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  const pinnedMessages = messages.filter((m) => m.isPinned);
  const activePinnedMsg = pinnedMessages.length > 0
    ? pinnedMessages[currentPinnedIndex % pinnedMessages.length]
    : null;

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Toggle pin status
  const handleTogglePin = async (msgId: string, currentPinned?: boolean) => {
    try {
      const nextPinned = !currentPinned;
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, isPinned: nextPinned } : m))
      );
      await fetch(`/api/messages/${msgId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: nextPinned }),
      });
      showToast(nextPinned ? 'Pesan disematkan' : 'Sematan pesan dilepas');
    } catch (e) {
      console.error(e);
    }
  };

  // Jump/scroll to any message and highlight
  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(msgId);
      setTimeout(() => {
        setHighlightedMsgId(null);
      }, 2500);
    }
  };

  const scrollToPinnedMessage = scrollToMessage;

  const handleCyclePinned = () => {
    if (pinnedMessages.length === 0) return;
    const nextIdx = (currentPinnedIndex + 1) % pinnedMessages.length;
    setCurrentPinnedIndex(nextIdx);
    const targetMsg = pinnedMessages[nextIdx];
    if (targetMsg) {
      scrollToPinnedMessage(targetMsg.id);
    }
  };

  // Mark messages as read when opening or receiving messages
  const markMessagesAsRead = async () => {
    if (!currentUser || !chat.id) return;
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, userId: currentUser.id }),
      });
    } catch (e) {}
  };

  // Broadcast typing status
  const handleTyping = (text: string) => {
    setInputText(text);
    if (!currentUser || !chat.id) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    fetch('/api/chats/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: chat.id,
        userId: currentUser.id,
        isTyping: text.length > 0,
      }),
    }).catch(() => {});

    if (text.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        fetch('/api/chats/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: chat.id,
            userId: currentUser.id,
            isTyping: false,
          }),
        }).catch(() => {});
      }, 3000);
    }
  };

  // Listen to typing, messages, and read receipts
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('typing', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.chatId === chat.id && data.userId !== currentUser.id) {
            setTypingUsers((prev) => {
              const next = { ...prev };
              if (data.isTyping) {
                next[data.userId] = data.userName || 'Seseorang';
              } else {
                delete next[data.userId];
              }
              return next;
            });
          }
        } catch (err) {}
      });

      eventSource.addEventListener('messages_read', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.chatId === chat.id) {
            setMessages((prev) =>
              prev.map((m) => (m.senderId !== data.readByUserId ? { ...m, isRead: true } : m))
            );
          }
        } catch (err) {}
      });

      eventSource.addEventListener('message_sent', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.chatId === chat.id && data.message) {
            setMessages((prev) => {
              // Reconcile optimistic messages sent by current user
              const incoming = data.message;
              const filtered = prev.filter((m) => {
                if (m.id.startsWith('opt_') && m.senderId === incoming.senderId) {
                  const isMatchingText = (m.text || '') === (incoming.text || '');
                  const isMatchingAttach = (!m.attachments?.length && !incoming.attachments?.length) ||
                    (m.attachments?.[0]?.type === incoming.attachments?.[0]?.type);
                  const isRecent = Math.abs((incoming.createdAt || Date.now()) - m.createdAt) < 60000;
                  if ((isMatchingText || isMatchingAttach) && isRecent) {
                    return false; // remove optimistic duplicate cleanly
                  }
                }
                return m.id !== incoming.id;
              });
              return [...filtered, incoming];
            });
            if (data.message.senderId !== currentUser.id) {
              markMessagesAsRead();
            }
          }
        } catch (err) {}
      });

      eventSource.addEventListener('message_deleted', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
        } catch (err) {}
      });

      eventSource.addEventListener('message_deleted_for_me', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.userId === currentUser.id) {
            setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
          }
        } catch (err) {}
      });

      eventSource.addEventListener('messages_bulk_deleted_for_me', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.userId === currentUser.id && Array.isArray(data.messageIds)) {
            setMessages((prev) => prev.filter((m) => !data.messageIds.includes(m.id)));
          }
        } catch (err) {}
      });

      eventSource.addEventListener('message_edited', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.chatId === chat.id && data.message) {
            setMessages((prev) =>
              prev.map((m) => (m.id === data.message.id ? { ...m, ...data.message } : m))
            );
          }
        } catch (err) {}
      });

      eventSource.addEventListener('message_pinned', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.chatId === chat.id) {
            setMessages((prev) =>
              prev.map((m) => (m.id === data.messageId ? { ...m, isPinned: data.isPinned } : m))
            );
          }
        } catch (err) {}
      });

      eventSource.addEventListener('message_reacted', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          setMessages((prev) =>
            prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
          );
        } catch (err) {}
      });

      eventSource.addEventListener('history_cleared', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.chatIds?.includes(chat.id) || data.chatId === chat.id) {
            if (data.deleteForBoth || data.userId === currentUser.id) {
              setMessages([]);
            } else {
              fetchMessages();
            }
          }
        } catch (err) {}
      });

      eventSource.addEventListener('chat_deleted', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.chatIds?.includes(chat.id) || data.chatId === chat.id) {
            onBack();
          }
        } catch (err) {}
      });
    } catch (err) {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [chat.id, currentUser.id]);

  // Fetch conversation messages
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages?chatId=${chat.id}&userId=${currentUser.id}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const visible = data.filter((m: Message) => !m.deletedForUserIds || !m.deletedForUserIds.includes(currentUser.id));
            setMessages((prev) => {
              // Keep active optimistic messages that are still waiting for server confirmation
              const pendingOpt = prev.filter(
                (p) =>
                  p.id.startsWith('opt_') &&
                  !visible.some(
                    (v) =>
                      v.createdAt === p.createdAt ||
                      (v.senderId === p.senderId && v.text === p.text && v.timestamp === p.timestamp)
                  )
              );
              return [...visible, ...pendingOpt];
            });
          }
        }
      }
    } catch (e: any) {
      if (e?.message !== 'Failed to fetch') {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    fetchMessages();
    markMessagesAsRead();
    setTypingUsers({});
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [chat.id]);

  useEffect(() => {
    if (!selectionMode && !contextMenuMsg) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Voice recording timer simulation
  useEffect(() => {
    let timer: any;
    if (isRecordingVoice) {
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecordingVoice]);

  // Helper to upload media file directly to disk storage
  const uploadMediaFile = async (file: File): Promise<string> => {
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
    } catch (err) {
      console.warn('Direct multipart upload error, attempting base64 fallback:', err);
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/upload/base64', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl: base64, name: file.name }),
          });
          const data = await res.json();
          resolve(data.url || base64);
        } catch {
          resolve(base64);
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async () => {
    if (!inputText.trim() && !stagedAttachment) return;

    if (editingMsg) {
      const newText = inputText.trim();
      const msgId = editingMsg.id;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, text: newText, isEdited: true, editedAt: Date.now() } : m
        )
      );
      setEditingMsg(null);
      setInputText('');
      showToast('Pesan telah diedit');
      try {
        await fetch(`/api/messages/${msgId}/edit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: newText }),
        });
      } catch (err) {
        console.error('Gagal mengedit pesan', err);
      }
      return;
    }

    playTelegramSound.send();
    const caption = inputText.trim();
    const staged = stagedAttachment;

    // Resolve permanent URL in background for persistent storage
    let persistentMediaUrl = staged?.serverUrl;
    if (staged && !persistentMediaUrl) {
      if (staged.uploadPromise) {
        try {
          persistentMediaUrl = await staged.uploadPromise;
        } catch (err) {
          console.warn('Upload promise resolution error:', err);
        }
      } else if (staged.file) {
        try {
          persistentMediaUrl = await uploadMediaFile(staged.file);
        } catch (err) {
          console.warn('Direct upload error:', err);
        }
      }
    }

    // Local optimistic attachment uses instant local URL (0ms latency), background sends persistent URL
    const localUrl = staged?.url || persistentMediaUrl || '';
    const serverUrl = persistentMediaUrl || localUrl;

    const localAttachments = staged ? [{
      type: staged.type,
      url: localUrl,
      name: staged.name,
      size: staged.size,
      duration: staged.duration,
      thumbnailUrl: staged.thumbnailUrl,
      isHD: staged.isHD ?? (settings.uploadMediaQuality === 'hd'),
      width: staged.width,
      height: staged.height,
      aspectRatio: staged.aspectRatio,
    }] : undefined;

    const serverAttachments = staged ? [{
      type: staged.type,
      url: serverUrl,
      name: staged.name,
      size: staged.size,
      duration: staged.duration,
      thumbnailUrl: staged.thumbnailUrl,
      isHD: staged.isHD ?? (settings.uploadMediaQuality === 'hd'),
      width: staged.width,
      height: staged.height,
      aspectRatio: staged.aspectRatio,
    }] : undefined;

    const replyData = replyingTo ? {
      id: replyingTo.id,
      senderName: replyingTo.senderName,
      text: (replyingTo.text && replyingTo.text !== 'Foto Lampiran' && replyingTo.text !== 'Video Lampiran')
        ? replyingTo.text
        : (replyingTo.attachments?.some(a => a.type === 'video') ? 'Video' : (replyingTo.attachments?.some(a => a.type === 'image') ? 'Foto' : (replyingTo.attachments?.some(a => a.type === 'voice') ? 'Pesan suara' : ''))),
      hasImage: replyingTo.attachments?.some(a => a.type === 'image'),
      imageUrl: replyingTo.attachments?.find(a => a.type === 'image')?.url,
      hasVoice: replyingTo.attachments?.some(a => a.type === 'voice'),
      hasVideo: replyingTo.attachments?.some(a => a.type === 'video'),
      videoUrl: replyingTo.attachments?.find(a => a.type === 'video')?.url,
    } : undefined;

    const now = new Date();
    const clientTimestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const clientEpoch = Date.now();
    const optimisticId = `opt_${clientEpoch}_${Math.random().toString(36).slice(2, 7)}`;

    const optimisticMsg: Message = {
      id: optimisticId,
      chatId: chat.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderColor: currentUser.color || '#5288c1',
      text: caption,
      timestamp: clientTimestamp,
      createdAt: clientEpoch,
      isRead: false,
      replyTo: replyData,
      attachments: localAttachments,
    };

    // Store aspect ratio in lookup for instant sizing
    if (localAttachments?.[0]?.aspectRatio) {
      setMediaAspectRatios(prev => ({
        ...prev,
        [optimisticId]: localAttachments[0].aspectRatio!,
        [`${optimisticId}_0`]: localAttachments[0].aspectRatio!,
      }));
    }

    // INSTANTLY render message in chat feed (0ms delay)
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setStagedAttachment(null);
    setReplyingTo(null);
    setShowEmojiPicker(false);

    // Sync in background with backend
    onSendMessage(caption, replyData, serverAttachments);
  };

  const handleSendFromMediaComposer = async (payload: {
    files: File[];
    caption: string;
    isHD: boolean;
    type: 'photo' | 'video';
    mediaUrl: string;
    drawingDataUrl?: string;
  }) => {
    playTelegramSound.send();
    const primaryFile = payload.files[0];
    const isVideo = payload.type === 'video';
    const sizeMB = primaryFile ? (primaryFile.size / (1024 * 1024)).toFixed(1) : '1.0';
    const formattedSize = primaryFile ? (primaryFile.size > 1024 * 1024 ? `${sizeMB} MB` : `${Math.round(primaryFile.size / 1024)} KB`) : '1.0 MB';

    const localUrl = payload.drawingDataUrl || payload.mediaUrl || (primaryFile ? URL.createObjectURL(primaryFile) : '');

    const localAttachments: Attachment[] = [{
      type: isVideo ? 'video' : 'image',
      url: localUrl,
      name: primaryFile ? primaryFile.name : (isVideo ? 'Video.mp4' : 'Foto.jpg'),
      size: formattedSize,
      isHD: payload.isHD,
    }];

    const replyData = replyingTo ? {
      id: replyingTo.id,
      senderName: replyingTo.senderName,
      text: (replyingTo.text && replyingTo.text !== 'Foto Lampiran' && replyingTo.text !== 'Video Lampiran')
        ? replyingTo.text
        : (replyingTo.attachments?.some(a => a.type === 'video') ? 'Video' : (replyingTo.attachments?.some(a => a.type === 'image') ? 'Foto' : (replyingTo.attachments?.some(a => a.type === 'voice') ? 'Pesan suara' : ''))),
      hasImage: replyingTo.attachments?.some(a => a.type === 'image'),
      imageUrl: replyingTo.attachments?.find(a => a.type === 'image')?.url,
      hasVoice: replyingTo.attachments?.some(a => a.type === 'voice'),
      hasVideo: replyingTo.attachments?.some(a => a.type === 'video'),
      videoUrl: replyingTo.attachments?.find(a => a.type === 'video')?.url,
    } : undefined;

    const now = new Date();
    const clientTimestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const clientEpoch = Date.now();
    const optimisticId = `opt_${clientEpoch}_${Math.random().toString(36).slice(2, 7)}`;

    const optimisticMsg: Message = {
      id: optimisticId,
      chatId: chat.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderColor: currentUser.color || '#5288c1',
      text: payload.caption || '',
      timestamp: clientTimestamp,
      createdAt: clientEpoch,
      isRead: false,
      isSending: true,
      uploadProgress: 15,
      attachments: localAttachments,
      replyTo: replyData,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setReplyingTo(null);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Progress animation loop as media uploads
    const progressInterval = setInterval(() => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === optimisticId && m.isSending) {
            const nextProgress = Math.min(95, (m.uploadProgress || 15) + 20);
            return { ...m, uploadProgress: nextProgress };
          }
          return m;
        })
      );
    }, 400);

    let persistentMediaUrl = localUrl;
    if (primaryFile) {
      try {
        persistentMediaUrl = await uploadMediaFile(primaryFile);
      } catch (err) {
        console.warn('Upload error:', err);
      }
    }

    // Ensure user sees the upload progress and clock icon for at least ~2 seconds as in Telegram
    await new Promise((resolve) => setTimeout(resolve, 2200));

    clearInterval(progressInterval);

    setMessages((prev) => {
      const target = prev.find((m) => m.id === optimisticId);
      if (target?.isCancelled) {
        return prev;
      }
      return prev.map((m) => (m.id === optimisticId ? { ...m, isSending: false, isCancelled: false, uploadProgress: 100 } : m));
    });

    const serverAttachments: Attachment[] = [{
      type: isVideo ? 'video' : 'image',
      url: persistentMediaUrl || localUrl,
      name: primaryFile ? primaryFile.name : (isVideo ? 'Video.mp4' : 'Foto.jpg'),
      size: formattedSize,
      isHD: payload.isHD,
    }];

    // Store payload in map in case of user cancelling and retrying later
    pendingRetryPayloadsRef.current.set(optimisticId, {
      caption: payload.caption || '',
      replyData,
      serverAttachments,
    });

    // Ensure user sees the upload progress and clock icon for at least ~2 seconds as in Telegram
    await new Promise((resolve) => setTimeout(resolve, 2200));

    clearInterval(progressInterval);

    // If message was cancelled while uploading, DO NOT send to server
    if (cancelledMsgIdsRef.current.has(optimisticId)) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, isSending: false, isCancelled: true } : m))
      );
      return;
    }

    // Otherwise, mark send complete locally and send to server
    setMessages((prev) =>
      prev.map((m) => (m.id === optimisticId ? { ...m, isSending: false, isCancelled: false, uploadProgress: 100 } : m))
    );

    pendingRetryPayloadsRef.current.delete(optimisticId);
    onSendMessage(payload.caption || '', replyData, serverAttachments);
  };

  const handleCancelMediaSend = (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation();
    cancelledMsgIdsRef.current.add(messageId);
    pendingRetryPayloadsRef.current.delete(messageId);

    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    showToast('Pengiriman media dibatalkan');
  };

  const handleRetryMediaSend = (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation();
    cancelledMsgIdsRef.current.delete(messageId);

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, isSending: true, isCancelled: false, uploadProgress: 15 }
          : m
      )
    );

    playTelegramSound.send();

    const progressInterval = setInterval(() => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId && m.isSending && !m.isCancelled) {
            const nextProgress = Math.min(95, (m.uploadProgress || 15) + 20);
            return { ...m, uploadProgress: nextProgress };
          }
          return m;
        })
      );
    }, 400);

    setTimeout(() => {
      clearInterval(progressInterval);

      // Check if user cancelled again during retry
      if (cancelledMsgIdsRef.current.has(messageId)) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isSending: false, isCancelled: true } : m))
        );
        return;
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isSending: false, isCancelled: false, uploadProgress: 100 } : m))
      );

      const savedPayload = pendingRetryPayloadsRef.current.get(messageId);
      if (savedPayload) {
        pendingRetryPayloadsRef.current.delete(messageId);
        onSendMessage(savedPayload.caption, savedPayload.replyData, savedPayload.serverAttachments);
      } else {
        setMessages((prev) => {
          const target = prev.find((m) => m.id === messageId);
          if (target && target.attachments?.length) {
            onSendMessage(target.text || '', target.replyTo, target.attachments);
          }
          return prev;
        });
      }
    }, 2200);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setShowAttachmentMenu(false);
    setChatMediaComposer({
      isOpen: true,
      files: Array.from(files),
    });
    e.target.value = '';
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setShowAttachmentMenu(false);
    setChatMediaComposer({
      isOpen: true,
      files: Array.from(files),
    });
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = reader.result as string;
            try {
              const compressed = await compressImage(base64, 1024, 1024, 0.85);
              setStagedAttachment({
                type: 'image',
                url: compressed,
                name: 'Foto Clipboard',
                size: `${Math.round(file.size / 1024)} KB`,
                isHD: true,
              });
            } catch (err) {
              setStagedAttachment({
                type: 'image',
                url: base64,
                name: 'Foto Clipboard',
                size: `${Math.round(file.size / 1024)} KB`,
                isHD: true,
              });
            }
            setTimeout(() => {
              messageInputRef.current?.focus();
            }, 50);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          audioBlobUrlRef.current = reader.result as string;
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
    } catch (err) {
      console.error('Microphone error:', err);
      showToast('Tidak dapat mengakses mikrofon. Pastikan izin mikrofon aktif.');
      setIsRecordingVoice(false);
    }
  };

  const handleSendVoiceNote = () => {
    if (chat.type === 'direct' && maskedChat.privacyVoiceMessages === 'nobody') {
      showToast('Pengguna ini membatasi penerimaan pesan suara karena pengaturan privasi.');
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingVoice(false);
      return;
    }

    const sendVoiceWithUrl = (dataUrl: string) => {
      playTelegramSound.send();
      const voiceDuration = recordingSeconds || 4;
      const now = new Date();
      const clientTimestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const clientEpoch = Date.now();
      const optimisticId = `opt_${clientEpoch}_${Math.random().toString(36).slice(2, 7)}`;

      const voiceAttachments: Attachment[] = [
        {
          type: 'voice',
          url: dataUrl,
          duration: voiceDuration,
        },
      ];

      const optimisticMsg: Message = {
        id: optimisticId,
        chatId: chat.id,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderColor: currentUser.color || '#5288c1',
        text: '',
        timestamp: clientTimestamp,
        createdAt: clientEpoch,
        isRead: false,
        attachments: voiceAttachments,
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setIsRecordingVoice(false);
      setRecordingSeconds(0);

      onSendMessage('', undefined, voiceAttachments);
    };

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          audioBlobUrlRef.current = dataUrl;
          sendVoiceWithUrl(dataUrl);
        };
        reader.readAsDataURL(audioBlob);
      };
      mediaRecorderRef.current.stop();
    } else {
      sendVoiceWithUrl(audioBlobUrlRef.current || '');
    }
  };

  const playSynthAudioWithProgress = (id: string, durationSec: number) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 1.5);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (durationSec || 3));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (durationSec || 3));
    } catch (e) {}

    const totalMs = (durationSec || 3) * 1000;
    const intervalMs = 100;
    let elapsed = 0;

    if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    audioTimerRef.current = setInterval(() => {
      elapsed += intervalMs;
      const currentSec = Math.min(elapsed / 1000, durationSec);
      setAudioCurrentTime(currentSec);
      setAudioProgress((elapsed / totalMs) * 100);

      if (elapsed >= totalMs) {
        if (audioTimerRef.current) clearInterval(audioTimerRef.current);
        setPlayingVoiceId(null);
        setAudioProgress(0);
        setAudioCurrentTime(0);
      }
    }, intervalMs);
  };

  const togglePlayVoice = (id: string, audioUrl?: string, durationSec: number = 4) => {
    if (playingVoiceId === id) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
      setPlayingVoiceId(null);
      setAudioProgress(0);
      setAudioCurrentTime(0);
    } else {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);

      setPlayingVoiceId(id);
      setAudioProgress(0);
      setAudioCurrentTime(0);

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;

        audio.ontimeupdate = () => {
          if (audio.duration) {
            const current = audio.currentTime;
            const dur = audio.duration;
            setAudioCurrentTime(current);
            setAudioProgress((current / dur) * 100);
          }
        };

        audio.play().catch((e) => {
          console.warn('Audio play failed, falling back to synth audio:', e);
          playSynthAudioWithProgress(id, durationSec);
        });

        audio.onended = () => {
          setPlayingVoiceId(null);
          setAudioProgress(0);
          setAudioCurrentTime(0);
          activeAudioRef.current = null;
        };
      } else {
        playSynthAudioWithProgress(id, durationSec);
      }
    }
  };

  const quickReactions = ['❤️', '👍', '👎', '🔥', '🥰', '👏', '😁'];
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
    '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '🔥', '✨', '⚡', '💥', '🎉', '🎊', '🎈', '🎁', '🏆', '⭐'
  ];

  // -------------------------------------------------------------
  // POINTER & TOUCH HANDLERS (SINGLE TAP vs LONG PRESS DETECTION)
  // -------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent, msg: Message) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isLongPressTriggeredRef.current = false;
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (navigator.vibrate) {
        try { navigator.vibrate(40); } catch (err) {}
      }
      // Trigger Selection Mode (Foto 2)
      setContextMenuMsg(null);
      setSelectionMode(true);
      setSelectedMsgIds((prev) => {
        if (prev.includes(msg.id)) return prev;
        return [...prev, msg.id];
      });
    }, 450);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const dx = Math.abs(e.clientX - pointerStartPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartPosRef.current.y);
    if (dx > 8 || dy > 8) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handlePointerUpOrCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const toggleSelectMessage = (msgId: string) => {
    setSelectedMsgIds((prev) => {
      const next = prev.includes(msgId)
        ? prev.filter((id) => id !== msgId)
        : [...prev, msgId];
      if (next.length === 0) {
        setSelectionMode(false);
      }
      return next;
    });
  };

  const handleMessageClick = (e: React.MouseEvent, msg: Message) => {
    // If completed a long-press, prevent single-tap trigger
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }

    // In selection mode: toggle selection
    if (selectionMode) {
      toggleSelectMessage(msg.id);
      return;
    }

    // Single Tap -> Open Context Menu (Foto 1)
    e.stopPropagation();
    if (contextMenuMsg?.id === msg.id) {
      setContextMenuMsg(null);
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setContextMenuCoords({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
      setContextMenuMsg(msg);
    }
  };

  // -------------------------------------------------------------
  // CONTEXT MENU (FOTO 1) ACTIONS
  // -------------------------------------------------------------
  const handleMenuReply = (msg: Message) => {
    setReplyingTo(msg);
    setEditingMsg(null);
    setContextMenuMsg(null);
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 100);
  };

  const handleMenuEdit = (msg: Message) => {
    setReplyingTo(null);
    setEditingMsg(msg);
    setInputText(msg.text || '');
    setContextMenuMsg(null);
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 100);
  };

  const handleMenuCopy = (msg: Message) => {
    if (msg.text) {
      navigator.clipboard?.writeText(msg.text);
      showToast('Pesan disalin ke papan klip');
    }
    setContextMenuMsg(null);
  };

  const handleMenuForward = (msg: Message) => {
    setMessagesToForward([msg]);
    setShowForwardModal(true);
    setContextMenuMsg(null);
  };

  const handleMenuPin = (msg: Message) => {
    handleTogglePin(msg.id, msg.isPinned);
    setContextMenuMsg(null);
  };

  const handleMenuDelete = (msg: Message) => {
    setContextMenuMsg(null);
    setDeleteModal({
      isOpen: true,
      messageIds: [msg.id],
      isMulti: false,
    });
  };

  const handleMenuReact = (msg: Message, emoji: string) => {
    onReactMessage(msg.id, emoji);
    setContextMenuMsg(null);
  };

  // -------------------------------------------------------------
  // ENLARGED PHOTO / MEDIA ACTIONS (MODAL & 3-DOTS MENU)
  // -------------------------------------------------------------
  const handleDownloadPhoto = (url: string, name?: string, type?: 'image' | 'video') => {
    try {
      const isVideo = type === 'video' || url.startsWith('data:video') || /\.(mp4|webm|mov|mkv)/i.test(url);
      const defaultName = isVideo ? `telegram-video-${Date.now()}.mp4` : `telegram-photo-${Date.now()}.jpg`;
      const link = document.createElement('a');
      link.href = url;
      link.download = name || defaultName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(isVideo ? 'Video berhasil disimpan ke galeri' : 'Foto berhasil disimpan ke galeri');
    } catch (e) {
      showToast('Gagal mengunduh berkas media');
    }
    setShowPhotoMenu(false);
  };

  const handleDeletePhotoForEveryone = (msg: Message) => {
    setShowPhotoMenu(false);
    setEnlargedPhoto(null);
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    try {
      onDeleteMessage(msg.id);
      showToast('Foto dihapus untuk semua orang');
    } catch (err) {
      console.error('Failed to delete for everyone', err);
    }
  };

  const handleDeletePhotoForMe = async (msg: Message) => {
    setShowPhotoMenu(false);
    setEnlargedPhoto(null);
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    try {
      await fetch(`/api/messages/${msg.id}/delete-for-me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      showToast('Foto dihapus untuk Anda');
    } catch (err) {
      console.error('Failed to delete for me', err);
    }
  };

  const handleForwardPhoto = (msg: Message) => {
    setShowPhotoMenu(false);
    setEnlargedPhoto(null);
    setMessagesToForward([msg]);
    setShowForwardModal(true);
  };

  const handleReplyPhoto = (msg: Message) => {
    setShowPhotoMenu(false);
    setEnlargedPhoto(null);
    handleMenuReply(msg);
  };

  const handleSendPhotoReply = (msg: Message) => {
    if (!photoReplyText.trim()) return;
    const replyData = {
      id: msg.id,
      senderName: msg.senderName,
      text: (msg.text && msg.text !== 'Foto Lampiran')
        ? msg.text
        : (msg.attachments?.some(a => a.type === 'image') ? 'Foto' : ''),
      hasImage: msg.attachments?.some(a => a.type === 'image'),
      imageUrl: msg.attachments?.find(a => a.type === 'image')?.url,
      hasVoice: msg.attachments?.some(a => a.type === 'voice'),
    };
    onSendMessage(photoReplyText.trim(), replyData);
    setPhotoReplyText('');
    setEnlargedPhoto(null);
    showToast('Balasan terkirim');
  };

  const handleQuickReactionPhoto = (msg: Message, emoji: string) => {
    onReactMessage(msg.id, emoji);
    showToast(`Reaksi ${emoji} terkirim`);
  };

  const handleToggleStarPhoto = (msgId: string) => {
    setStarredMsgIds((prev) => {
      if (prev.includes(msgId)) {
        showToast('Bintang dihapus dari foto');
        return prev.filter((id) => id !== msgId);
      } else {
        showToast('Foto disimpan ke Berbintang');
        return [...prev, msgId];
      }
    });
  };

  const handleEditPhotoCaption = (msg: Message) => {
    if (msg.senderId === currentUser.id) {
      setEditingMsg(msg);
      setInputText(msg.text || '');
      setEnlargedPhoto(null);
    } else {
      showToast('Hanya pengirim yang dapat mengedit');
    }
  };

  // -------------------------------------------------------------
  // SELECTION MODE (FOTO 2) ACTIONS
  // -------------------------------------------------------------
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedMsgIds([]);
  };

  const handleCopySelected = () => {
    const selectedMsgs = messages.filter((m) => selectedMsgIds.includes(m.id));
    const combinedText = selectedMsgs.map((m) => m.text).filter(Boolean).join('\n');
    if (combinedText) {
      navigator.clipboard?.writeText(combinedText);
      showToast(`${selectedMsgs.length} pesan disalin ke papan klip`);
    }
    exitSelectionMode();
  };

  const handleForwardSelected = () => {
    const selectedMsgs = messages.filter((m) => selectedMsgIds.includes(m.id));
    if (selectedMsgs.length > 0) {
      setMessagesToForward(selectedMsgs);
      setShowForwardModal(true);
    }
    exitSelectionMode();
  };

  const handleDeleteSelected = () => {
    if (selectedMsgIds.length === 0) return;
    setDeleteModal({
      isOpen: true,
      messageIds: selectedMsgIds,
      isMulti: true,
    });
  };

  const confirmDelete = async (type: 'all' | 'me') => {
    if (!deleteModal || deleteModal.messageIds.length === 0) return;
    const targetIds = deleteModal.messageIds;

    // Check if can delete for everyone
    const selectedModalMsgs = messages.filter((m) => targetIds.includes(m.id));
    const isGroupAdmin = (chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel') &&
      (chat.adminIds?.includes(currentUser.id) || chat.creatorId === currentUser.id);
    const canDeleteAll = selectedModalMsgs.length > 0 &&
      selectedModalMsgs.every((m) => m.senderId === currentUser.id || isGroupAdmin);

    // Force type to 'me' if user cannot delete for everyone
    const effectiveType = (type === 'all' && canDeleteAll) ? 'all' : 'me';

    setDeleteModal(null);

    // Separate real server IDs from unsent optimistic IDs
    const realServerIds = targetIds.filter((id) => !id.startsWith('opt_'));
    const optIds = targetIds.filter((id) => id.startsWith('opt_'));

    optIds.forEach((id) => {
      cancelledMsgIdsRef.current.add(id);
      pendingRetryPayloadsRef.current.delete(id);
    });

    // Optimistically update local message list immediately
    setMessages((prev) => prev.filter((m) => !targetIds.includes(m.id)));

    if (realServerIds.length > 0) {
      if (effectiveType === 'all') {
        // Hapus untuk semua orang (Delete for everyone)
        try {
          if (realServerIds.length === 1) {
            onDeleteMessage(realServerIds[0]);
            showToast('Pesan dihapus untuk semua orang');
          } else {
            if (onDeleteMessages) {
              onDeleteMessages(realServerIds);
            } else {
              realServerIds.forEach((id) => onDeleteMessage(id));
            }
            showToast(`${realServerIds.length} pesan dihapus untuk semua orang`);
          }
        } catch (err) {
          console.error('Failed to delete for everyone', err);
        }
      } else {
        // Hapus untuk saya (Delete for me only)
        try {
          if (realServerIds.length === 1) {
            await fetch(`/api/messages/${realServerIds[0]}/delete-for-me`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: currentUser.id }),
            });
            showToast('Pesan dihapus untuk Anda');
          } else {
            await fetch('/api/messages/bulk-delete-for-me', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messageIds: realServerIds, userId: currentUser.id }),
            });
            showToast(`${realServerIds.length} pesan dihapus untuk Anda`);
          }
        } catch (err) {
          console.error('Failed to delete for me', err);
        }
      }
    } else {
      showToast('Pesan dibatalkan & dihapus');
    }

    if (selectionMode) {
      exitSelectionMode();
    }
  };

  const handleReplySelected = () => {
    const selectedMsgs = messages.filter((m) => selectedMsgIds.includes(m.id));
    if (selectedMsgs.length > 0) {
      setReplyingTo(selectedMsgs[selectedMsgs.length - 1]);
      exitSelectionMode();
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
    }
  };

  const handleClearHistory = () => {
    setIsDeleteForBoth(true);
    setShowClearHistoryModal(true);
  };

  const confirmClearHistory = async () => {
    setShowClearHistoryModal(false);
    try {
      await fetch('/api/chats/clear-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chat.id,
          userId: currentUser.id,
          deleteForBoth: chat.type === 'direct' ? isDeleteForBoth : true,
        }),
      });
      setMessages([]);
      showToast('Riwayat pesan telah dibersihkan');
    } catch (err) {
      console.error('Failed to clear history', err);
      showToast('Gagal membersihkan riwayat');
    }
  };

  const handleDeleteCurrentChat = () => {
    setIsDeleteForBoth(true);
    setShowDeleteChatModal(true);
  };

  const confirmDeleteCurrentChat = async () => {
    setShowDeleteChatModal(false);
    try {
      if (chat.type === 'group') {
        if (onDeleteGroup) {
          await onDeleteGroup(chat.id);
        } else if (onLeaveGroup) {
          await onLeaveGroup(chat.id);
        } else if (onDeleteChat) {
          onDeleteChat(chat.id);
        } else {
          await fetch('/api/chats/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatIds: [chat.id], userId: currentUser.id, deleteForBoth: true }),
          });
        }
      } else {
        if (onDeleteChat) {
          onDeleteChat(chat.id, isDeleteForBoth);
        } else {
          await fetch('/api/chats/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatIds: [chat.id], userId: currentUser.id, deleteForBoth: isDeleteForBoth }),
          });
        }
      }
      showToast('Obrolan telah dihapus');
      onBack();
    } catch (err) {
      console.error('Failed to delete chat', err);
      showToast('Gagal menghapus obrolan');
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (m.deletedForUserIds && m.deletedForUserIds.includes(currentUser.id)) return false;
    if (!searchQuery.trim()) return true;
    return m.text?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Helper to render Telegram Reply Quote block inside message bubbles (Foto 2)
  const renderReplyQuote = (replyTo?: Message['replyTo']) => {
    if (!replyTo) return null;
    const origMsg = replyTo.id ? messages.find((m) => m.id === replyTo.id) : undefined;
    const imgUrl = replyTo.imageUrl || origMsg?.attachments?.find((a) => a.type === 'image')?.url;
    const vidUrl = replyTo.videoUrl || origMsg?.attachments?.find((a) => a.type === 'video')?.url;
    const vidThumb = origMsg?.attachments?.find((a) => a.type === 'video')?.thumbnailUrl;
    const hasImage = Boolean(replyTo.hasImage || imgUrl || origMsg?.attachments?.some((a) => a.type === 'image'));
    const hasVoice = Boolean(replyTo.hasVoice || origMsg?.attachments?.some((a) => a.type === 'voice'));
    const hasVideo = Boolean(replyTo.hasVideo || vidUrl || origMsg?.attachments?.some((a) => a.type === 'video'));

    let displayText = replyTo.text;
    if (!displayText || displayText === 'Foto Lampiran' || displayText === 'Video Lampiran') {
      if (origMsg?.text && origMsg.text !== 'Foto Lampiran' && origMsg.text !== 'Video Lampiran') {
        displayText = origMsg.text;
      } else if (hasVideo) {
        displayText = 'Video';
      } else if (hasImage) {
        displayText = 'Foto';
      } else if (hasVoice) {
        displayText = 'Pesan suara';
      } else {
        displayText = 'Pesan';
      }
    }

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (replyTo.id) {
            scrollToMessage(replyTo.id);
          }
        }}
        className="mb-1.5 pl-2.5 pr-1.5 py-1 rounded-md bg-black/25 hover:bg-black/35 transition-colors cursor-pointer flex items-center justify-between gap-2 overflow-hidden border-l-[3px] border-[#a29bfe] select-none text-left"
        title="Ketuk untuk melihat pesan yang dibalas"
      >
        <div className="min-w-0 flex-1 py-0.5">
          <span className="font-semibold text-xs text-[#a29bfe] block truncate leading-tight">
            {replyTo.senderName}
          </span>
          <div className="flex items-center text-slate-300 text-[11px] leading-tight mt-0.5 truncate opacity-90">
            {hasVideo && (
              <Video className="w-3.5 h-3.5 inline-block mr-1 shrink-0 text-slate-300/80" />
            )}
            {hasImage && !hasVideo && (
              <ImageIcon className="w-3.5 h-3.5 inline-block mr-1 shrink-0 text-slate-300/80" />
            )}
            {hasVoice && (
              <Mic className="w-3.5 h-3.5 inline-block mr-1 shrink-0 text-slate-300/80" />
            )}
            <span className="truncate">{displayText}</span>
          </div>
        </div>

        {vidThumb ? (
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded overflow-hidden shrink-0 border border-white/10 ml-2 bg-black">
            <img src={vidThumb} alt="Video" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Play className="w-3.5 h-3.5 fill-white text-white" />
            </div>
          </div>
        ) : imgUrl ? (
          <img
            src={imgUrl}
            alt="Replied thumbnail"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded object-cover shrink-0 border border-white/10 ml-2"
          />
        ) : null}
      </div>
    );
  };

  return (
    <div 
      id="chatview-container" 
      className="flex-1 flex flex-col h-full bg-[#0e1621] relative select-none overflow-hidden font-sans"
      style={{
        backgroundImage: settings.chatBackground && settings.chatBackground !== 'none' ? `url('${settings.chatBackground}')` : 'none',
        backgroundSize: settings.chatBackground && (settings.chatBackground.includes('unsplash') || settings.chatBackground.startsWith('data:image')) ? 'cover' : '300px',
        backgroundPosition: settings.chatBackground && (settings.chatBackground.includes('unsplash') || settings.chatBackground.startsWith('data:image')) ? 'center' : 'auto',
        backgroundBlendMode: settings.chatBackground && (settings.chatBackground.includes('unsplash') || settings.chatBackground.startsWith('data:image')) ? 'normal' : 'overlay',
      }}
      onClick={() => {
        if (contextMenuMsg) setContextMenuMsg(null);
      }}
    >
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#17212b]/95 border border-[#5288c1]/40 text-white text-xs font-medium px-4 py-2 rounded-full shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          {toastMessage}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP HEADER: STANDARD vs SELECTION MODE (FOTO 2)                           */}
      {/* ========================================================================= */}
      {selectionMode ? (
        /* Top Selection Bar (Foto 2) */
        <div id="selection-action-bar" className="h-14 bg-[#17212b] border-b border-[#101921] flex items-center justify-between px-3 md:px-6 z-30 shadow-md text-white animate-in fade-in duration-100">
          <div className="flex items-center gap-3">
            <button
              id="btn-close-selection"
              onClick={exitSelectionMode}
              className="p-2 text-[#7f91a4] hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
              title="Batal Memilih"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="font-bold text-base md:text-lg text-white">
              {selectedMsgIds.length} <span className="hidden sm:inline">terpilih</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              id="btn-reply-selected"
              onClick={handleReplySelected}
              className="p-2 text-[#7f91a4] hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
              title="Balas Pesan"
            >
              <CornerUpLeft className="w-5 h-5" />
            </button>
            <button
              id="btn-copy-selected"
              onClick={handleCopySelected}
              className="p-2 text-[#7f91a4] hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
              title="Salin Pesan"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              id="btn-forward-selected"
              onClick={handleForwardSelected}
              className="p-2 text-[#7f91a4] hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
              title="Teruskan Pesan"
            >
              <CornerUpRight className="w-5 h-5" />
            </button>
            <button
              id="btn-delete-selected"
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 active:scale-95 text-red-400 hover:text-red-300 transition-all cursor-pointer flex items-center gap-1.5 border border-red-500/35 shadow-xs"
              title="Hapus Pesan Terpilih (Logo Tong Sampah)"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span className="text-xs font-semibold">Hapus</span>
            </button>
          </div>
        </div>
      ) : (
        /* Standard Telegram Conversation Header */
        <div className="h-14 bg-[#17212b] border-b border-[#101921] flex items-center justify-between px-3 md:px-6 z-20 shadow-sm text-white">
          <div 
            onClick={() => {
              if (chat.type === 'group') {
                setShowGroupProfile(true);
              } else {
                setShowContactInfo(true);
              }
            }}
            className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-90 transition-opacity"
            title="Ketuk untuk melihat info profil & username"
          >
            <button
              id="chat-back-btn"
              onClick={(e) => {
                e.stopPropagation();
                onBack();
              }}
              className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* User Avatar */}
            <UserAvatar
              name={maskedChat.name}
              username={isBlockedByTarget ? undefined : maskedChat.username}
              avatar={isBlockedByTarget ? '' : maskedChat.avatar}
              color={maskedChat.color || '#5288c1'}
              size="md"
              isOnline={isBlockedByTarget ? false : maskedChat.isOnline}
            />

            {/* User Name & Status */}
            <div className="flex flex-col min-w-0 pr-2">
              <div className="font-semibold text-sm leading-tight text-white truncate flex items-center gap-1.5">
                <span>{maskedChat.name}</span>
                <VerifiedBadge isVerified={maskedChat.isVerified && !isBlockedByTarget} badgeColor={(maskedChat as any).badgeColor} size="sm" />
                {maskedChat.customBadge && !isBlockedByTarget && (
                  <span className="text-[10px] uppercase font-bold bg-[#242f3d] text-[#5288c1] px-1.5 py-0.2 rounded border border-[#313d4f]">
                    {maskedChat.customBadge}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 text-xs text-[#7f91a4] truncate mt-0.5">
                {Object.keys(typingUsers).length > 0 && !isBlockedByTarget ? (
                  <div className="flex items-center gap-1 text-[#5288c1] font-medium animate-pulse">
                    <span>
                      {Object.values(typingUsers).join(', ')} sedang mengetik
                    </span>
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 bg-[#5288c1] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1 h-1 bg-[#5288c1] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1 h-1 bg-[#5288c1] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                  </div>
                ) : (
                  <span>
                    {isBlockedByTarget ? (
                      'terakhir dilihat lama sekali'
                    ) : maskedChat.isOnline ? (
                      <span className="text-[#4fae4e] font-medium">online</span>
                    ) : chat.type === 'group' ? (
                      `${chat.participants?.length || 0} anggota`
                    ) : maskedChat.membersCount ? (
                      `${maskedChat.membersCount} anggota`
                    ) : (
                      maskedChat.lastSeen || 'terakhir dilihat baru saja'
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action icons right */}
          <div className="flex items-center gap-1.5">
            {isSearchOpen ? (
              <div className="flex items-center bg-[#242f3d] rounded-lg px-2 py-1 border border-[#313d4f]">
                <input
                  type="text"
                  placeholder="Cari pesan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-white outline-none w-28 md:w-44 placeholder-[#7f91a4]"
                  autoFocus
                />
                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="text-[#7f91a4] hover:text-white cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-[#7f91a4] hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
                title="Cari Pesan"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => {
                if (isBlockedByTarget) {
                  showToast('Anda telah diblokir oleh pengguna ini.');
                  return;
                }
                if (chat.type === 'direct' && maskedChat.privacyCalls === 'nobody') {
                  showToast('Pengguna ini membatasi panggilan suara karena privasi.');
                  return;
                }
                const targetToCall = targetUser || ({
                  id: otherParticipantId || chat.id,
                  name: maskedChat.name,
                  username: maskedChat.username,
                  avatar: maskedChat.avatar,
                  color: maskedChat.color || '#5288c1',
                } as UserType);

                if (onStartCall) {
                  onStartCall(targetToCall, 'audio');
                }
              }}
              className="p-2 text-[#7f91a4] hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
              title="Panggilan Suara Real-Time"
            >
              <Phone className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (isBlockedByTarget) {
                  showToast('Anda telah diblokir oleh pengguna ini.');
                  return;
                }
                if (chat.type === 'direct' && maskedChat.privacyCalls === 'nobody') {
                  showToast('Pengguna ini membatasi panggilan video karena privasi.');
                  return;
                }
                const targetToCall = targetUser || ({
                  id: otherParticipantId || chat.id,
                  name: maskedChat.name,
                  username: maskedChat.username,
                  avatar: maskedChat.avatar,
                  color: maskedChat.color || '#5288c1',
                } as UserType);

                if (onStartCall) {
                  onStartCall(targetToCall, 'video');
                }
              }}
              className="p-2 text-[#7f91a4] hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
              title="Panggilan Video Real-Time"
            >
              <Video className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 text-[#7f91a4] hover:text-white rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer"
                title="Opsi lainnya"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMoreMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div className="absolute right-0 top-12 bg-[#1c2733] border border-[#2e3c4e] rounded-xl shadow-2xl py-1 w-48 z-50 animate-in fade-in zoom-in-95">
                    {chat.type === 'group' ? (
                      <>
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            setShowGroupProfile(true);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#242f3d] flex items-center gap-3 text-slate-200 cursor-pointer"
                        >
                          <Info className="w-4 h-4 text-[#7f91a4]" />
                          <span>Info Grup</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            setIsSearchOpen(true);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#242f3d] flex items-center gap-3 text-slate-200 cursor-pointer"
                        >
                          <Search className="w-4 h-4 text-[#7f91a4]" />
                          <span>Cari Pesan</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            handleClearHistory();
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#242f3d] flex items-center gap-3 text-slate-200 cursor-pointer border-t border-[#2d3a4b]"
                        >
                          <Trash2 className="w-4 h-4 text-[#7f91a4]" />
                          <span>Bersihkan Riwayat</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            handleDeleteCurrentChat();
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-950/40 flex items-center gap-3 text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                          <span>Hapus & Keluar Grup</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            setShowContactInfo(true);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#242f3d] flex items-center gap-3 text-slate-200 cursor-pointer"
                        >
                          <Info className="w-4 h-4 text-[#7f91a4]" />
                          <span>Info Profil</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            setIsSearchOpen(true);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#242f3d] flex items-center gap-3 text-slate-200 cursor-pointer"
                        >
                          <Search className="w-4 h-4 text-[#7f91a4]" />
                          <span>Cari Pesan</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            handleClearHistory();
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#242f3d] flex items-center gap-3 text-slate-200 cursor-pointer border-t border-[#2d3a4b]"
                        >
                          <Trash2 className="w-4 h-4 text-[#7f91a4]" />
                          <span>Bersihkan Riwayat</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            handleDeleteCurrentChat();
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-950/40 flex items-center gap-3 text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                          <span>Hapus Obrolan</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Blocked by Target User Banner */}
      {isBlockedByTarget && (
        <div 
          id="chat-blocked-by-target-banner"
          className="bg-red-500/15 border-b border-red-500/30 text-red-200 px-4 py-2 text-center text-xs flex items-center justify-center gap-2 shadow-xs shrink-0 z-10"
        >
          <CircleSlash className="w-4 h-4 text-red-400 shrink-0" />
          <span>Anda telah diblokir oleh pengguna ini.</span>
        </div>
      )}

      {/* Pinned Messages Bar */}
      {pinnedMessages.length > 0 && activePinnedMsg && (
        <div 
          id="pinned-messages-bar"
          onClick={handleCyclePinned}
          className="bg-[#17212b] border-b border-[#242f3d] px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-[#1f2c3a] transition-all shadow-xs z-10 select-none group shrink-0"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-1 h-7 bg-[#5288c1] rounded-full shrink-0" />
            <div className="w-7 h-7 rounded-full bg-[#5288c1]/15 flex items-center justify-center shrink-0">
              <Pin className="w-3.5 h-3.5 text-[#5288c1]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#5288c1] text-xs">
                  Pesan Disematkan {pinnedMessages.length > 1 ? `#${(currentPinnedIndex % pinnedMessages.length) + 1} dari ${pinnedMessages.length}` : ''}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatMessageTime(activePinnedMsg.timestamp)}
                </span>
              </div>
              <p className="text-slate-300 truncate text-xs">
                <span className="text-slate-400 font-medium mr-1">{activePinnedMsg.senderName}:</span>
                {activePinnedMsg.text || (activePinnedMsg.attachments?.length ? '📷 Lampiran Media' : 'Pesan')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 pl-2">
            <button
              id="btn-unpin-active-msg"
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePin(activePinnedMsg.id, true);
              }}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-[#242f3d] rounded-full transition-colors cursor-pointer"
              title="Lepas Sematan Pesan Ini"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MESSAGES STREAM CONTAINER (AUTHENTIC TELEGRAM DARK MATRIX PATTERN)       */}
      {/* ========================================================================= */}
      <div 
        id="messages-scroll-area" 
        className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-5 space-y-3 relative"
      >
        {/* Date separator (5 Mei style) */}
        <div className="flex justify-center my-2">
          <span className="bg-[#17212b]/85 text-[#7f91a4] text-[11px] px-3.5 py-1 rounded-full uppercase tracking-wider font-semibold border border-[#242f3d] backdrop-blur-xs shadow-xs">
            Hari Ini
          </span>
        </div>

        {filteredMessages.map((msg) => {
          const isOutgoing = msg.senderId === currentUser.id;
          const isHighlighted = highlightedMsgId === msg.id;
          const isSelected = selectedMsgIds.includes(msg.id);
          const isMenuTarget = contextMenuMsg?.id === msg.id;

          return (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              className={`flex items-end gap-2 group transition-all ${
                isOutgoing ? 'flex-row-reverse' : 'flex-row'
              } ${selectionMode ? 'cursor-pointer hover:bg-white/[0.02] p-1 rounded-2xl' : ''}`}
              onClick={(e) => handleMessageClick(e, msg)}
              onPointerDown={(e) => handlePointerDown(e, msg)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUpOrCancel}
              onPointerCancel={handlePointerUpOrCancel}
              onContextMenu={(e) => {
                e.preventDefault();
                handleMessageClick(e, msg);
              }}
            >
              {/* Selection Checkbox on Left (Foto 2) */}
              {selectionMode && (
                <div className="p-1 shrink-0 flex items-center justify-center">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-[#4fae4e] text-white flex items-center justify-center shadow-md animate-in zoom-in-75 duration-100">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-[#7f91a4]/40" />
                  )}
                </div>
              )}

              {/* Incoming sender avatar */}
              {!isOutgoing && !selectionMode && (
                <UserAvatar
                  name={msg.senderName}
                  avatar={msg.senderAvatar}
                  color={msg.senderColor || '#5288c1'}
                  size="sm"
                />
              )}

              {/* Message Bubble Container */}
              {(() => {
                const callData = parseCallMessage(msg);

                if (callData) {
                  return (
                    <div
                      className={`relative min-w-[210px] sm:min-w-[245px] max-w-[420px] px-3.5 py-2.5 shadow-sm transition-all duration-200 cursor-pointer ${
                        isHighlighted ? 'ring-2 ring-[#5288c1] ring-offset-2 ring-offset-[#0e1621] scale-[1.01]' : ''
                      } ${
                        isSelected ? 'ring-2 ring-[#4fae4e] ring-offset-1 ring-offset-[#0e1621] opacity-95' : ''
                      } ${
                        isMenuTarget ? 'ring-2 ring-[#5288c1] scale-[1.02] z-40' : ''
                      } ${
                        isOutgoing
                          ? 'bg-[#3b4168] text-white hover:bg-[#434a75]'
                          : 'bg-[#292f4c] text-slate-100 border border-[#3a426b]/60 hover:bg-[#303758]'
                      }`}
                      style={{
                        borderRadius: isOutgoing 
                          ? `${settings.messageCorners}px ${settings.messageCorners}px 0 ${settings.messageCorners}px` 
                          : `${settings.messageCorners}px ${settings.messageCorners}px ${settings.messageCorners}px 0`
                      }}
                      onClick={(e) => {
                        if (selectionMode) {
                          e.stopPropagation();
                          toggleSelectMessage(msg.id);
                        } else if (onStartCall && chat.type === 'direct') {
                          e.stopPropagation();
                          const targetToCall = targetUser || ({
                            id: otherParticipantId || chat.id,
                            name: maskedChat.name,
                            username: maskedChat.username,
                            avatar: maskedChat.avatar,
                            color: maskedChat.color || '#5288c1',
                          } as UserType);
                          onStartCall(targetToCall, callData.type);
                        }
                      }}
                    >
                      {/* Pin Badge */}
                      {msg.isPinned && (
                        <div
                          className="absolute -top-2 -right-2 bg-[#5288c1] text-white p-1 rounded-full shadow-md z-10 flex items-center justify-center border border-[#17212b]"
                          title="Pesan Disematkan"
                        >
                          <Pin className="w-2.5 h-2.5" />
                        </div>
                      )}

                      {/* Sender Name for Groups */}
                      {!isOutgoing && chat.type === 'group' && (
                        <div className="font-semibold text-xs mb-1" style={{ color: msg.senderColor || '#5288c1' }}>
                          {msg.senderName}
                        </div>
                      )}

                      {/* Telegram Call Item Layout (Foto 1) */}
                      <div className="flex items-center gap-3">
                        {/* Round Icon Pill */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            callData.status === 'declined' || callData.status === 'missed'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-white/15 text-white'
                          }`}
                        >
                          {callData.type === 'video' ? (
                            callData.status === 'declined' || callData.status === 'missed' ? (
                              <VideoOff className="w-5 h-5 text-rose-400" />
                            ) : (
                              <div className="relative flex items-center justify-center">
                                <Video className="w-5 h-5 fill-current" />
                                <ArrowUpRight className="w-2.5 h-2.5 absolute -top-1 -right-1 stroke-[2.5]" />
                              </div>
                            )
                          ) : (
                            callData.status === 'declined' || callData.status === 'missed' ? (
                              <PhoneMissed className="w-5 h-5 text-rose-400" />
                            ) : (
                              <div className="relative flex items-center justify-center">
                                <Phone className="w-5 h-5 fill-current" />
                                <ArrowUpRight className="w-2.5 h-2.5 absolute -top-1 -right-1 stroke-[2.5]" />
                              </div>
                            )
                          )}
                        </div>

                        {/* Title & Details */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[14px] leading-tight text-white tracking-wide">
                            {callData.title}
                          </div>
                          <div className="flex items-center justify-between gap-3 mt-0.5">
                            <span
                              className={`text-[12px] leading-none ${
                                callData.status === 'declined' || callData.status === 'missed'
                                  ? 'text-rose-300 font-medium'
                                  : 'text-slate-300/90'
                              }`}
                            >
                              {callData.subtitle}
                            </span>
                            <div className="flex items-center gap-1 text-[10.5px] text-slate-300/75 shrink-0 select-none">
                              <span>{formatCallTime(msg.createdAt, msg.timestamp)}</span>
                              {isOutgoing && (
                                msg.isRead ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-sky-200 inline" />
                                ) : (
                                  <Check className="w-3 h-3 text-slate-300 inline" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Message Reactions display if any */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 -mb-1" onClick={(e) => e.stopPropagation()}>
                          {msg.reactions.map((r, i) => (
                            <span
                              key={i}
                              onClick={() => onReactMessage(msg.id, r.emoji)}
                              className="text-xs bg-black/30 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer hover:bg-black/50 transition-colors border border-white/10"
                            >
                              <span>{r.emoji}</span>
                              <span className="text-[10px] text-slate-200 font-semibold">
                                {r.count}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                const imageAtt = msg.attachments?.find((a) => a.type === 'image');
                const videoAtt = msg.attachments?.find((a) => a.type === 'video');
                const otherAttachments = msg.attachments?.filter((a) => a.type !== 'image' && a.type !== 'video');
                const hasCaption = Boolean(
                  msg.text &&
                  msg.text.trim() !== '' &&
                  msg.text !== 'Foto Lampiran' &&
                  msg.text !== 'Video Lampiran'
                );
                const isImageOnly = Boolean(imageAtt && !videoAtt && !hasCaption && (!otherAttachments || otherAttachments.length === 0));
                const isImageWithCaption = Boolean(imageAtt && !videoAtt && hasCaption && (!otherAttachments || otherAttachments.length === 0));
                const isVideoOnly = Boolean(videoAtt && !imageAtt && !hasCaption && (!otherAttachments || otherAttachments.length === 0));
                const isVideoWithCaption = Boolean(videoAtt && !imageAtt && hasCaption && (!otherAttachments || otherAttachments.length === 0));

                const msgMediaRatio = mediaAspectRatios[msg.id] || 
                  videoAtt?.aspectRatio || 
                  (videoAtt?.width && videoAtt?.height ? videoAtt.width / videoAtt.height : undefined) ||
                  imageAtt?.aspectRatio ||
                  (imageAtt?.width && imageAtt?.height ? imageAtt.width / imageAtt.height : undefined);

                const isPortraitMedia = msgMediaRatio ? msgMediaRatio < 0.95 : false;
                const isLandscapeMedia = msgMediaRatio ? msgMediaRatio > 1.15 : false;
                const mediaBubbleMaxWidth = isPortraitMedia 
                  ? 'w-[240px] xs:w-[260px] sm:w-[290px] max-w-full' 
                  : isLandscapeMedia 
                    ? 'w-[320px] xs:w-[360px] sm:w-[400px] max-w-full' 
                    : 'w-[280px] xs:w-[310px] sm:w-[340px] max-w-full';

                if (isImageOnly && imageAtt) {
                  return (
                    <div
                      className={`relative ${mediaBubbleMaxWidth} p-0 overflow-hidden shadow-sm transition-all duration-200 cursor-pointer ${
                        isHighlighted ? 'ring-2 ring-[#5288c1] ring-offset-2 ring-offset-[#0e1621] scale-[1.01]' : ''
                      } ${
                        isSelected ? 'ring-2 ring-[#4fae4e] ring-offset-1 ring-offset-[#0e1621] opacity-95' : ''
                      } ${
                        isMenuTarget ? 'ring-2 ring-[#5288c1] scale-[1.02] z-40' : ''
                      } ${
                        isOutgoing
                          ? 'bg-[#2b5278] text-white'
                          : 'bg-[#182533] text-slate-100 border border-[#242f3d]/60'
                      }`}
                      style={{
                        fontSize: `${settings.textSize}px`,
                        borderRadius: isOutgoing 
                          ? `${settings.messageCorners}px ${settings.messageCorners}px 0 ${settings.messageCorners}px` 
                          : `${settings.messageCorners}px ${settings.messageCorners}px ${settings.messageCorners}px 0`
                      }}
                    >
                      {/* Pin Badge */}
                      {msg.isPinned && (
                        <div
                          className="absolute -top-2 -right-2 bg-[#5288c1] text-white p-1 rounded-full shadow-md z-20 flex items-center justify-center border border-[#17212b]"
                          title="Pesan Disematkan"
                        >
                          <Pin className="w-2.5 h-2.5" />
                        </div>
                      )}

                      {/* Header for group sender or reply */}
                      {((!isOutgoing && chat.type === 'group') || msg.replyTo) && (
                        <div className="px-3 pt-2 pb-1.5 bg-[#182533]/90">
                          {!isOutgoing && chat.type === 'group' && (
                            <div className="font-semibold text-xs mb-1" style={{ color: msg.senderColor || '#5288c1' }}>
                              {msg.senderName}
                            </div>
                          )}
                          {msg.replyTo && renderReplyQuote(msg.replyTo)}
                        </div>
                      )}

                      {/* Full-bleed Photo with Bottom-Right Floating Overlay Pill (Foto 1) */}
                      <div
                        className="relative group/img overflow-hidden cursor-pointer w-full bg-black/40"
                        style={{
                          aspectRatio: msgMediaRatio ? `${msgMediaRatio}` : undefined,
                          maxHeight: '480px',
                          minHeight: msgMediaRatio ? undefined : '160px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectionMode) {
                            toggleSelectMessage(msg.id);
                            return;
                          }
                          setEnlargedPhoto({
                            url: imageAtt.url,
                            msg,
                            name: imageAtt.name,
                            type: 'image',
                          });
                          setShowPhotoMenu(false);
                        }}
                      >
                        <img
                          src={imageAtt.url}
                          alt="Photo"
                          onLoad={(e) => {
                            const img = e.currentTarget;
                            if (img.naturalWidth && img.naturalHeight) {
                              const r = img.naturalWidth / img.naturalHeight;
                              setMediaAspectRatios((prev) => (prev[msg.id] === r ? prev : { ...prev, [msg.id]: r }));
                            }
                          }}
                          className="w-full h-full object-cover block select-none transition-transform duration-200 group-hover/img:scale-[1.01]"
                        />

                        {/* Bottom-Left Upload Progress or Retry Badge for Image */}
                        {msg.isCancelled ? (
                          <button
                            type="button"
                            onClick={(e) => handleRetryMediaSend(e, msg.id)}
                            className="absolute bottom-2.5 left-2.5 bg-black/75 hover:bg-black/90 active:scale-95 backdrop-blur-md text-white px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[11px] font-semibold shadow-lg z-10 transition-all cursor-pointer pointer-events-auto border border-white/20"
                            title="Kirim Ulang Foto"
                          >
                            <Upload className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                            <span>Ulangi</span>
                          </button>
                        ) : msg.isSending ? (
                          <button
                            type="button"
                            onClick={(e) => handleCancelMediaSend(e, msg.id)}
                            className="absolute bottom-2.5 left-2.5 bg-black/70 hover:bg-black/90 active:scale-95 backdrop-blur-md text-white p-1 rounded-full flex items-center justify-center shadow-lg z-10 cursor-pointer pointer-events-auto"
                            title="Batalkan Pengiriman"
                          >
                            <div className="relative w-6 h-6 flex items-center justify-center">
                              <svg className="absolute inset-0 w-6 h-6 animate-spin text-[#22c55e]" viewBox="0 0 32 32">
                                <circle className="opacity-30" cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3" />
                                <circle
                                  className="opacity-95"
                                  cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3"
                                  strokeDasharray="81"
                                  strokeDashoffset={81 - (81 * (msg.uploadProgress || 20)) / 100}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <X className="w-3 h-3 text-white stroke-[2.5]" />
                            </div>
                          </button>
                        ) : null}

                        {/* Telegram Floating Bottom-Right HD + Time + Status Pill */}
                        <div className="absolute bottom-2 right-2 bg-black/55 backdrop-blur-xs text-white px-2 py-0.5 rounded-full flex items-center gap-1.5 text-[11px] font-medium shadow-md pointer-events-none select-none z-10">
                          <span className="text-[9px] font-bold bg-white/25 px-1 py-0.2 rounded tracking-wider leading-none">
                            HD
                          </span>
                          <span className="text-[10.5px] leading-none">
                            {formatMessageTime(msg.createdAt, msg.timestamp)}
                          </span>
                          {isOutgoing && (
                            (msg.isSending || msg.isCancelled) ? (
                              <Clock className={`w-3 h-3 text-white/90 stroke-[2] ${msg.isSending ? 'animate-pulse' : ''}`} />
                            ) : msg.isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-200 stroke-[2.5]" />
                            ) : (
                              <Check className="w-3 h-3 text-white/90 stroke-[2]" />
                            )
                          )}
                        </div>

                        {/* Hover hint */}
                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100 pointer-events-none">
                          <span className="bg-black/70 text-white text-[10px] px-2.5 py-1 rounded-full backdrop-blur-xs font-medium tracking-wide shadow-md">
                            Ketuk untuk memperbesar
                          </span>
                        </div>
                      </div>

                      {/* Message Reactions if any */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 p-2 pt-1 bg-black/25" onClick={(e) => e.stopPropagation()}>
                          {msg.reactions.map((r, i) => (
                            <span
                              key={i}
                              onClick={() => onReactMessage(msg.id, r.emoji)}
                              className="text-xs bg-black/30 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer hover:bg-black/50 transition-colors border border-white/10"
                            >
                              <span>{r.emoji}</span>
                              <span className="text-[10px] text-slate-200 font-semibold">
                                {r.count}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                if (isVideoOnly && videoAtt) {
                  const formattedDuration = videoAtt.duration 
                    ? `${Math.floor(videoAtt.duration / 60)}:${(videoAtt.duration % 60).toString().padStart(2, '0')}`
                    : '0:15';

                  const effectiveRatio = msgMediaRatio || 
                    (videoAtt.width && videoAtt.height ? videoAtt.width / videoAtt.height : undefined) ||
                    videoAtt.aspectRatio;

                  return (
                    <div
                      className={`relative ${mediaBubbleMaxWidth} p-0 overflow-hidden shadow-sm transition-all duration-200 cursor-pointer bg-black ${
                        isHighlighted ? 'ring-2 ring-[#5288c1] ring-offset-2 ring-offset-[#0e1621] scale-[1.01]' : ''
                      } ${
                        isSelected ? 'ring-2 ring-[#4fae4e] ring-offset-1 ring-offset-[#0e1621] opacity-95' : ''
                      } ${
                        isMenuTarget ? 'ring-2 ring-[#5288c1] scale-[1.02] z-40' : ''
                      } ${
                        isOutgoing
                          ? 'bg-[#2b5278] text-white'
                          : 'bg-[#182533] text-slate-100 border border-[#242f3d]/60'
                      }`}
                      style={{
                        fontSize: `${settings.textSize}px`,
                        borderRadius: isOutgoing 
                          ? `${settings.messageCorners}px ${settings.messageCorners}px 0 ${settings.messageCorners}px` 
                          : `${settings.messageCorners}px ${settings.messageCorners}px ${settings.messageCorners}px 0`
                      }}
                    >
                      {/* Pin Badge */}
                      {msg.isPinned && (
                        <div
                          className="absolute -top-2 -right-2 bg-[#5288c1] text-white p-1 rounded-full shadow-md z-20 flex items-center justify-center border border-[#17212b]"
                          title="Pesan Disematkan"
                        >
                          <Pin className="w-2.5 h-2.5" />
                        </div>
                      )}

                      {/* Header for group sender or reply */}
                      {((!isOutgoing && chat.type === 'group') || msg.replyTo) && (
                        <div className="px-3 pt-2 pb-1.5 bg-[#182533]/90">
                          {!isOutgoing && chat.type === 'group' && (
                            <div className="font-semibold text-xs mb-1" style={{ color: msg.senderColor || '#5288c1' }}>
                              {msg.senderName}
                            </div>
                          )}
                          {msg.replyTo && renderReplyQuote(msg.replyTo)}
                        </div>
                      )}

                      {/* Telegram Edge-to-Edge Video Player Card */}
                      <div
                        className="relative group/vid overflow-hidden bg-black flex items-center justify-center cursor-pointer w-full"
                        style={{
                          aspectRatio: effectiveRatio ? `${effectiveRatio}` : undefined,
                          maxHeight: '440px',
                          minHeight: effectiveRatio ? undefined : '160px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectionMode) {
                            toggleSelectMessage(msg.id);
                            return;
                          }
                          setEnlargedPhoto({
                            url: videoAtt.url,
                            msg,
                            name: videoAtt.name,
                            type: 'video',
                          });
                          setShowPhotoMenu(false);
                        }}
                      >
                        <video
                          src={videoAtt.url}
                          poster={videoAtt.thumbnailUrl}
                          playsInline
                          preload="auto"
                          onLoadedMetadata={(e) => {
                            const v = e.currentTarget;
                            if (v.videoWidth && v.videoHeight) {
                              const r = v.videoWidth / v.videoHeight;
                              setMediaAspectRatios((prev) => (prev[msg.id] === r ? prev : { ...prev, [msg.id]: r }));
                            }
                          }}
                          onCanPlay={(e) => {
                            const v = e.currentTarget;
                            if (v.videoWidth && v.videoHeight) {
                              const r = v.videoWidth / v.videoHeight;
                              setMediaAspectRatios((prev) => (prev[msg.id] === r ? prev : { ...prev, [msg.id]: r }));
                            }
                          }}
                          className="w-full h-full object-cover block select-none bg-black"
                        />

                        {/* Telegram Circular Translucent Play Button in Center */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="relative w-14 h-14 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl group-hover/vid:scale-110 transition-transform">
                            <Play className="w-7 h-7 fill-white text-white ml-1 relative z-10" />
                          </div>
                        </div>

                        {/* Top-Left HD Badge */}
                        {videoAtt.isHD && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailMediaModal({
                                isOpen: true,
                                isHD: true,
                                standardSize: '2,9 MB',
                                standardRes: '478 × 850',
                                hdSize: '5,4 MB',
                                hdRes: '720 × 1280',
                              });
                            }}
                            className="absolute top-2.5 left-2.5 bg-[#22c55e] text-black px-2 py-0.5 rounded-md flex items-center gap-1 text-[10px] font-extrabold shadow-md z-10 hover:brightness-110 active:scale-95 transition-all cursor-pointer pointer-events-auto"
                            title="Detail Media HD"
                          >
                            <span className="text-[9px] font-extrabold tracking-wider leading-none">HD</span>
                          </button>
                        )}

                        {/* Bottom-Left Duration or Upload Progress / Retry Badge */}
                        {msg.isCancelled ? (
                          <button
                            type="button"
                            onClick={(e) => handleRetryMediaSend(e, msg.id)}
                            className="absolute bottom-2.5 left-2.5 bg-black/75 hover:bg-black/90 active:scale-95 backdrop-blur-md text-white px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[11px] font-semibold shadow-lg z-10 transition-all cursor-pointer pointer-events-auto border border-white/20"
                            title="Kirim Ulang Media"
                          >
                            <Upload className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                            <span>Ulangi</span>
                          </button>
                        ) : msg.isSending ? (
                          <button
                            type="button"
                            onClick={(e) => handleCancelMediaSend(e, msg.id)}
                            className="absolute bottom-2.5 left-2.5 bg-black/70 hover:bg-black/90 active:scale-95 backdrop-blur-md text-white p-1 rounded-full flex items-center justify-center shadow-lg z-10 cursor-pointer pointer-events-auto"
                            title="Batalkan Pengiriman"
                          >
                            <div className="relative w-6 h-6 flex items-center justify-center">
                              <svg className="absolute inset-0 w-6 h-6 animate-spin text-[#22c55e]" viewBox="0 0 32 32">
                                <circle className="opacity-30" cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3" />
                                <circle
                                  className="opacity-90"
                                  cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3"
                                  strokeDasharray="81"
                                  strokeDashoffset={81 - (81 * (msg.uploadProgress || 20)) / 100}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <X className="w-3 h-3 text-white stroke-[2.5]" />
                            </div>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailMediaModal({
                                isOpen: true,
                                isHD: !!videoAtt.isHD,
                                standardSize: '2,9 MB',
                                standardRes: '478 × 850',
                                hdSize: '5,4 MB',
                                hdRes: '720 × 1280',
                              });
                            }}
                            className="absolute bottom-2.5 left-2.5 bg-black/60 hover:bg-black/80 active:scale-95 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-full flex items-center gap-1.5 text-[11px] font-medium shadow-md z-10 transition-all cursor-pointer pointer-events-auto"
                            title="Lihat Detail Media"
                          >
                            <Film className="w-3 h-3 text-slate-300" />
                            <span>{formattedDuration}</span>
                          </button>
                        )}

                        {/* Floating Bottom-Right Time & Read Status Pill */}
                        <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-full flex items-center gap-1.5 text-[11px] font-medium shadow-md pointer-events-none select-none z-10">
                          <span className="text-[10.5px] leading-none">
                            {formatMessageTime(msg.createdAt, msg.timestamp)}
                          </span>
                          {isOutgoing && (
                            (msg.isSending || msg.isCancelled) ? (
                              <Clock className={`w-3 h-3 text-white/90 stroke-[2] ${msg.isSending ? 'animate-pulse' : ''}`} />
                            ) : msg.isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-200 stroke-[2.5]" />
                            ) : (
                              <Check className="w-3 h-3 text-white/90 stroke-[2]" />
                            )
                          )}
                        </div>
                      </div>

                      {/* Message Reactions if any */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 p-2 pt-1 bg-black/25" onClick={(e) => e.stopPropagation()}>
                          {msg.reactions.map((r, i) => (
                            <span
                              key={i}
                              onClick={() => onReactMessage(msg.id, r.emoji)}
                              className="text-xs bg-black/30 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer hover:bg-black/50 transition-colors border border-white/10"
                            >
                              <span>{r.emoji}</span>
                              <span className="text-[10px] text-slate-200 font-semibold">
                                {r.count}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                if (isImageWithCaption && imageAtt) {
                  return (
                    <div
                      className={`relative ${mediaBubbleMaxWidth} p-0 overflow-hidden shadow-sm transition-all duration-200 cursor-pointer ${
                        isHighlighted ? 'ring-2 ring-[#5288c1] ring-offset-2 ring-offset-[#0e1621] scale-[1.01]' : ''
                      } ${
                        isSelected ? 'ring-2 ring-[#4fae4e] ring-offset-1 ring-offset-[#0e1621] opacity-95' : ''
                      } ${
                        isMenuTarget ? 'ring-2 ring-[#5288c1] scale-[1.02] z-40' : ''
                      } ${
                        isOutgoing
                          ? 'bg-[#2b5278] text-white'
                          : 'bg-[#182533] text-slate-100 border border-[#242f3d]/60'
                      }`}
                      style={{
                        fontSize: `${settings.textSize}px`,
                        borderRadius: isOutgoing 
                          ? `${settings.messageCorners}px ${settings.messageCorners}px 0 ${settings.messageCorners}px` 
                          : `${settings.messageCorners}px ${settings.messageCorners}px ${settings.messageCorners}px 0`
                      }}
                    >
                      {/* Pin Badge */}
                      {msg.isPinned && (
                        <div
                          className="absolute -top-2 -right-2 bg-[#5288c1] text-white p-1 rounded-full shadow-md z-20 flex items-center justify-center border border-[#17212b]"
                          title="Pesan Disematkan"
                        >
                          <Pin className="w-2.5 h-2.5" />
                        </div>
                      )}

                      {/* Header for group sender or reply */}
                      {((!isOutgoing && chat.type === 'group') || msg.replyTo) && (
                        <div className="px-3 pt-2 pb-1.5 bg-[#182533]/90">
                          {!isOutgoing && chat.type === 'group' && (
                            <div className="font-semibold text-xs mb-1" style={{ color: msg.senderColor || '#5288c1' }}>
                              {msg.senderName}
                            </div>
                          )}
                          {msg.replyTo && renderReplyQuote(msg.replyTo)}
                        </div>
                      )}

                      {/* Edge-to-Edge Photo on top */}
                      <div
                        className="relative group/img overflow-hidden cursor-pointer w-full bg-black/40"
                        style={{
                          aspectRatio: msgMediaRatio ? `${msgMediaRatio}` : undefined,
                          maxHeight: '440px',
                          minHeight: msgMediaRatio ? undefined : '160px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectionMode) {
                            toggleSelectMessage(msg.id);
                            return;
                          }
                          setEnlargedPhoto({
                            url: imageAtt.url,
                            msg,
                            name: imageAtt.name,
                            type: 'image',
                          });
                          setShowPhotoMenu(false);
                        }}
                      >
                        <img
                          src={imageAtt.url}
                          alt="Photo"
                          onLoad={(e) => {
                            const img = e.currentTarget;
                            if (img.naturalWidth && img.naturalHeight) {
                              const r = img.naturalWidth / img.naturalHeight;
                              setMediaAspectRatios((prev) => (prev[msg.id] === r ? prev : { ...prev, [msg.id]: r }));
                            }
                          }}
                          className="w-full h-full object-cover block select-none transition-transform duration-200 group-hover/img:scale-[1.01]"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-xs text-white px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider shadow-xs pointer-events-none select-none">
                          HD
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100 pointer-events-none">
                          <span className="bg-black/70 text-white text-[10px] px-2.5 py-1 rounded-full backdrop-blur-xs font-medium tracking-wide shadow-md">
                            Ketuk untuk memperbesar
                          </span>
                        </div>
                      </div>

                      {/* Caption Text & Time/Read Info below photo (Foto 2) */}
                      <div className="px-3 pt-2.5 pb-2">
                        <p className="whitespace-pre-wrap leading-relaxed text-sm break-words text-slate-100">
                          {msg.text}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75">
                          {msg.isEdited && (
                            <span className="text-[10px] opacity-80 mr-0.5 select-none font-normal">
                              diedit
                            </span>
                          )}
                          <span>{formatMessageTime(msg.createdAt, msg.timestamp)}</span>
                          {isOutgoing && (
                            msg.isSending ? (
                              <Clock className="w-3 h-3 text-slate-300 animate-pulse" />
                            ) : msg.isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                            ) : (
                              <Check className="w-3 h-3 text-slate-300" />
                            )
                          )}
                        </div>
                      </div>

                      {/* Reactions if any */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 px-3 pb-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
                          {msg.reactions.map((r, i) => (
                            <span
                              key={i}
                              onClick={() => onReactMessage(msg.id, r.emoji)}
                              className="text-xs bg-black/30 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer hover:bg-black/50 transition-colors border border-white/10"
                            >
                              <span>{r.emoji}</span>
                              <span className="text-[10px] text-slate-200 font-semibold">
                                {r.count}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                if (isVideoWithCaption && videoAtt) {
                  const formattedDuration = videoAtt.duration 
                    ? `${Math.floor(videoAtt.duration / 60)}:${(videoAtt.duration % 60).toString().padStart(2, '0')}`
                    : '0:15';

                  const effectiveRatio = msgMediaRatio || 
                    (videoAtt.width && videoAtt.height ? videoAtt.width / videoAtt.height : undefined) ||
                    videoAtt.aspectRatio;

                  return (
                    <div
                      className={`relative ${mediaBubbleMaxWidth} p-0 overflow-hidden shadow-sm transition-all duration-200 cursor-pointer ${
                        isHighlighted ? 'ring-2 ring-[#5288c1] ring-offset-2 ring-offset-[#0e1621] scale-[1.01]' : ''
                      } ${
                        isSelected ? 'ring-2 ring-[#4fae4e] ring-offset-1 ring-offset-[#0e1621] opacity-95' : ''
                      } ${
                        isMenuTarget ? 'ring-2 ring-[#5288c1] scale-[1.02] z-40' : ''
                      } ${
                        isOutgoing
                          ? 'bg-[#2b5278] text-white'
                          : 'bg-[#182533] text-slate-100 border border-[#242f3d]/60'
                      }`}
                      style={{
                        fontSize: `${settings.textSize}px`,
                        borderRadius: isOutgoing 
                          ? `${settings.messageCorners}px ${settings.messageCorners}px 0 ${settings.messageCorners}px` 
                          : `${settings.messageCorners}px ${settings.messageCorners}px ${settings.messageCorners}px 0`
                      }}
                    >
                      {/* Pin Badge */}
                      {msg.isPinned && (
                        <div
                          className="absolute -top-2 -right-2 bg-[#5288c1] text-white p-1 rounded-full shadow-md z-20 flex items-center justify-center border border-[#17212b]"
                          title="Pesan Disematkan"
                        >
                          <Pin className="w-2.5 h-2.5" />
                        </div>
                      )}

                      {/* Header for group sender or reply */}
                      {((!isOutgoing && chat.type === 'group') || msg.replyTo) && (
                        <div className="px-3 pt-2 pb-1.5 bg-[#182533]/90">
                          {!isOutgoing && chat.type === 'group' && (
                            <div className="font-semibold text-xs mb-1" style={{ color: msg.senderColor || '#5288c1' }}>
                              {msg.senderName}
                            </div>
                          )}
                          {msg.replyTo && renderReplyQuote(msg.replyTo)}
                        </div>
                      )}

                      {/* Edge-to-Edge Video on top matching aspect ratio */}
                      <div
                        className="relative group/vid overflow-hidden bg-black flex items-center justify-center cursor-pointer w-full"
                        style={{
                          aspectRatio: effectiveRatio ? `${effectiveRatio}` : undefined,
                          maxHeight: '440px',
                          minHeight: effectiveRatio ? undefined : '160px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectionMode) {
                            toggleSelectMessage(msg.id);
                            return;
                          }
                          setEnlargedPhoto({
                            url: videoAtt.url,
                            msg,
                            name: videoAtt.name,
                            type: 'video',
                          });
                          setShowPhotoMenu(false);
                        }}
                      >
                        <video
                          src={videoAtt.url}
                          poster={videoAtt.thumbnailUrl}
                          playsInline
                          preload="auto"
                          onLoadedMetadata={(e) => {
                            const v = e.currentTarget;
                            if (v.videoWidth && v.videoHeight) {
                              const r = v.videoWidth / v.videoHeight;
                              setMediaAspectRatios((prev) => (prev[msg.id] === r ? prev : { ...prev, [msg.id]: r }));
                            }
                          }}
                          onCanPlay={(e) => {
                            const v = e.currentTarget;
                            if (v.videoWidth && v.videoHeight) {
                              const r = v.videoWidth / v.videoHeight;
                              setMediaAspectRatios((prev) => (prev[msg.id] === r ? prev : { ...prev, [msg.id]: r }));
                            }
                          }}
                          className="w-full h-full object-cover block select-none bg-black"
                        />

                        {/* Telegram Circular Translucent Play Button in Center */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="relative w-14 h-14 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl group-hover/vid:scale-110 transition-transform">
                            <Play className="w-7 h-7 fill-white text-white ml-1 relative z-10" />
                          </div>
                        </div>

                        {/* Top-Left HD Badge */}
                        {videoAtt.isHD && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailMediaModal({
                                isOpen: true,
                                isHD: true,
                                standardSize: '2,9 MB',
                                standardRes: '478 × 850',
                                hdSize: '5,4 MB',
                                hdRes: '720 × 1280',
                              });
                            }}
                            className="absolute top-2.5 left-2.5 bg-[#22c55e] text-black px-2 py-0.5 rounded-md flex items-center gap-1 text-[10px] font-extrabold shadow-md z-10 hover:brightness-110 active:scale-95 transition-all cursor-pointer pointer-events-auto"
                            title="Detail Media HD"
                          >
                            <span className="text-[9px] font-extrabold tracking-wider leading-none">HD</span>
                          </button>
                        )}

                        {/* Bottom-Left Duration or Upload Progress / Retry Badge */}
                        {msg.isCancelled ? (
                          <button
                            type="button"
                            onClick={(e) => handleRetryMediaSend(e, msg.id)}
                            className="absolute bottom-2.5 left-2.5 bg-black/75 hover:bg-black/90 active:scale-95 backdrop-blur-md text-white px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[11px] font-semibold shadow-lg z-10 transition-all cursor-pointer pointer-events-auto border border-white/20"
                            title="Kirim Ulang Media"
                          >
                            <Upload className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                            <span>Ulangi</span>
                          </button>
                        ) : msg.isSending ? (
                          <button
                            type="button"
                            onClick={(e) => handleCancelMediaSend(e, msg.id)}
                            className="absolute bottom-2.5 left-2.5 bg-black/70 hover:bg-black/90 active:scale-95 backdrop-blur-md text-white p-1 rounded-full flex items-center justify-center shadow-lg z-10 cursor-pointer pointer-events-auto"
                            title="Batalkan Pengiriman"
                          >
                            <div className="relative w-6 h-6 flex items-center justify-center">
                              <svg className="absolute inset-0 w-6 h-6 animate-spin text-[#22c55e]" viewBox="0 0 32 32">
                                <circle className="opacity-30" cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3" />
                                <circle
                                  className="opacity-95"
                                  cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3"
                                  strokeDasharray="81"
                                  strokeDashoffset={81 - (81 * (msg.uploadProgress || 20)) / 100}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <X className="w-3 h-3 text-white stroke-[2.5]" />
                            </div>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailMediaModal({
                                isOpen: true,
                                isHD: !!videoAtt.isHD,
                                standardSize: '2,9 MB',
                                standardRes: '478 × 850',
                                hdSize: '5,4 MB',
                                hdRes: '720 × 1280',
                              });
                            }}
                            className="absolute bottom-2.5 left-2.5 bg-black/60 hover:bg-black/80 active:scale-95 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-full flex items-center gap-1.5 text-[11px] font-medium shadow-md z-10 transition-all cursor-pointer pointer-events-auto"
                            title="Lihat Detail Media"
                          >
                            <Film className="w-3 h-3 text-slate-300" />
                            <span>{formattedDuration}</span>
                          </button>
                        )}
                      </div>

                      {/* Caption Text & Time/Read Info below video */}
                      <div className="px-3 pt-2.5 pb-2">
                        <p className="whitespace-pre-wrap leading-relaxed text-sm break-words text-slate-100">
                          {msg.text}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75">
                          {msg.isEdited && (
                            <span className="text-[10px] opacity-80 mr-0.5 select-none font-normal">
                              diedit
                            </span>
                          )}
                          <span>{formatMessageTime(msg.createdAt, msg.timestamp)}</span>
                          {isOutgoing && (
                            (msg.isSending || msg.isCancelled) ? (
                              <Clock className={`w-3 h-3 text-slate-300 ${msg.isSending ? 'animate-pulse' : ''}`} />
                            ) : msg.isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                            ) : (
                              <Check className="w-3 h-3 text-slate-300" />
                            )
                          )}
                        </div>
                      </div>

                      {/* Reactions if any */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 px-3 pb-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
                          {msg.reactions.map((r, i) => (
                            <span
                              key={i}
                              onClick={() => onReactMessage(msg.id, r.emoji)}
                              className="text-xs bg-black/30 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer hover:bg-black/50 transition-colors border border-white/10"
                            >
                              <span>{r.emoji}</span>
                              <span className="text-[10px] text-slate-200 font-semibold">
                                {r.count}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    className={`relative max-w-[420px] p-3 shadow-sm transition-all duration-200 cursor-pointer ${
                      isHighlighted ? 'ring-2 ring-[#5288c1] ring-offset-2 ring-offset-[#0e1621] scale-[1.01]' : ''
                    } ${
                      isSelected ? 'ring-2 ring-[#4fae4e] ring-offset-1 ring-offset-[#0e1621] opacity-95' : ''
                    } ${
                      isMenuTarget ? 'ring-2 ring-[#5288c1] scale-[1.02] z-40' : ''
                    } ${
                      isOutgoing
                        ? 'bg-[#2b5278] text-white'
                        : 'bg-[#182533] text-slate-100 border border-[#242f3d]/60'
                    }`}
                    style={{
                      fontSize: `${settings.textSize}px`,
                      borderRadius: isOutgoing 
                        ? `${settings.messageCorners}px ${settings.messageCorners}px 0 ${settings.messageCorners}px` 
                        : `${settings.messageCorners}px ${settings.messageCorners}px ${settings.messageCorners}px 0`
                    }}
                  >
                    {/* Pin Badge */}
                    {msg.isPinned && (
                      <div
                        className="absolute -top-2 -right-2 bg-[#5288c1] text-white p-1 rounded-full shadow-md z-10 flex items-center justify-center border border-[#17212b]"
                        title="Pesan Disematkan"
                      >
                        <Pin className="w-2.5 h-2.5" />
                      </div>
                    )}

                    {/* Sender Name for Groups */}
                    {!isOutgoing && chat.type === 'group' && (
                      <div className="font-semibold text-xs mb-1" style={{ color: msg.senderColor || '#5288c1' }}>
                        {msg.senderName}
                      </div>
                    )}

                    {/* Replying context header (Foto 2) */}
                    {msg.replyTo && renderReplyQuote(msg.replyTo)}

                    {/* Attachments if any */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-2 space-y-1.5">
                        {msg.attachments.map((att, idx) => {
                          const attKey = `${msg.id}_${idx}`;
                          const attRatio = mediaAspectRatios[attKey] || att.aspectRatio || (att.width && att.height ? att.width / att.height : undefined);

                          if (att.type === 'image') {
                            return (
                              <div
                                key={idx}
                                className="relative group/img overflow-hidden rounded-xl cursor-pointer w-full bg-black/30"
                                style={{
                                  aspectRatio: attRatio ? `${attRatio}` : undefined,
                                  maxHeight: '360px',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (selectionMode) {
                                    toggleSelectMessage(msg.id);
                                    return;
                                  }
                                  setEnlargedPhoto({
                                    url: att.url,
                                    msg,
                                    name: att.name,
                                    type: 'image',
                                  });
                                  setShowPhotoMenu(false);
                                }}
                              >
                                <img
                                  src={att.url}
                                  alt="Attachment"
                                  onLoad={(e) => {
                                    const img = e.currentTarget;
                                    if (img.naturalWidth && img.naturalHeight) {
                                      const r = img.naturalWidth / img.naturalHeight;
                                      setMediaAspectRatios((prev) => (prev[attKey] === r ? prev : { ...prev, [attKey]: r }));
                                    }
                                  }}
                                  className="rounded-xl w-full h-full object-cover shadow-sm border border-black/10 transition-transform duration-200 group-hover/img:scale-[1.01]"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100 pointer-events-none">
                                  <span className="bg-black/70 text-white text-[10px] px-2.5 py-1 rounded-full backdrop-blur-xs font-medium tracking-wide shadow-md">
                                    Ketuk untuk memperbesar
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          if (att.type === 'video') {
                            const formattedDuration = att.duration 
                              ? `${Math.floor(att.duration / 60)}:${(att.duration % 60).toString().padStart(2, '0')}`
                              : '0:15';

                            return (
                              <div
                                key={idx}
                                className="relative group/vid overflow-hidden rounded-xl bg-black w-full shadow-md cursor-pointer flex items-center justify-center"
                                style={{
                                  aspectRatio: attRatio ? `${attRatio}` : undefined,
                                  maxHeight: '360px',
                                  minHeight: attRatio ? undefined : '180px'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEnlargedPhoto({
                                    url: att.url,
                                    msg,
                                    name: att.name,
                                    type: 'video',
                                  });
                                  setShowPhotoMenu(false);
                                }}
                              >
                                <video
                                  src={att.url}
                                  poster={att.thumbnailUrl}
                                  playsInline
                                  preload="metadata"
                                  onLoadedMetadata={(e) => {
                                    const v = e.currentTarget;
                                    if (v.videoWidth && v.videoHeight) {
                                      const r = v.videoWidth / v.videoHeight;
                                      setMediaAspectRatios((prev) => (prev[attKey] === r ? prev : { ...prev, [attKey]: r }));
                                    }
                                  }}
                                  onCanPlay={(e) => {
                                    const v = e.currentTarget;
                                    if (v.videoWidth && v.videoHeight) {
                                      const r = v.videoWidth / v.videoHeight;
                                      setMediaAspectRatios((prev) => (prev[attKey] === r ? prev : { ...prev, [attKey]: r }));
                                    }
                                  }}
                                  className="w-full h-full rounded-xl object-cover bg-black"
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl group-hover/vid:scale-110 transition-transform">
                                    <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                                  </div>
                                </div>
                                {att.isHD && (
                                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-xs text-[10px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm pointer-events-none">
                                    HD
                                  </div>
                                )}
                                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-[11px] font-medium text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm pointer-events-none">
                                  <Film className="w-3 h-3 text-slate-300" />
                                  <span>{formattedDuration}</span>
                                </div>
                              </div>
                            );
                          }
                          if (att.type === 'voice') {
                            const isPlaying = playingVoiceId === msg.id;
                            const durationSec = att.duration || 4;
                            const activeTime = isPlaying ? audioCurrentTime : 0;
                            const displaySec = isPlaying ? activeTime : durationSec;
                            const mins = Math.floor(displaySec / 60);
                            const secs = Math.floor(displaySec % 60);
                            const formattedDuration = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                            const waveformHeights = [35, 60, 30, 85, 50, 95, 70, 40, 80, 100, 65, 45, 75, 90, 50, 85, 60, 95, 40, 70, 55, 80, 45, 65];

                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-3 bg-black/15 dark:bg-black/25 px-3 py-2 rounded-2xl min-w-[240px] max-w-[280px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => togglePlayVoice(msg.id, att.url, durationSec)}
                                  className="w-9 h-9 rounded-full bg-[#5288c1] hover:bg-[#4374a8] text-white flex items-center justify-center cursor-pointer shadow-sm shrink-0 transition-transform active:scale-95"
                                >
                                  {isPlaying ? (
                                    <Pause className="w-4 h-4 fill-white" />
                                  ) : (
                                    <Play className="w-4 h-4 fill-white ml-0.5" />
                                  )}
                                </button>
                                <div className="flex-1 flex flex-col justify-between">
                                  <div className="flex items-center gap-[2px] h-6 w-full cursor-pointer">
                                    {waveformHeights.map((h, i) => {
                                      const barProgress = (i / waveformHeights.length) * 100;
                                      const isActive = isPlaying && barProgress <= audioProgress;
                                      return (
                                        <div
                                          key={i}
                                          style={{ height: `${h}%` }}
                                          className={`w-[3px] rounded-full transition-all duration-150 ${
                                            isActive ? 'bg-[#5288c1] scale-y-110' : 'bg-slate-400/60 dark:bg-slate-500/60'
                                          }`}
                                        />
                                      );
                                    })}
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                    <span>{formattedDuration}</span>
                                    {isPlaying && <span className="text-[#5288c1] animate-pulse">Playing...</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}

                    {/* Main Message Text (hide if default placeholder 'Foto Lampiran' or 'Video Lampiran' with media attachments) */}
                    {msg.text && (
                      !msg.attachments?.some(a => a.type === 'image' || a.type === 'video') || 
                      (msg.text !== 'Foto Lampiran' && msg.text !== 'Video Lampiran' && msg.text.trim() !== '')
                    ) && (
                      <p className="whitespace-pre-wrap leading-relaxed text-sm break-words">
                        {msg.text}
                      </p>
                    )}

                    {/* Time & Read Status */}
                    <div className="flex items-center justify-end gap-1 mt-1 -mb-0.5 text-[10px] opacity-75">
                      {msg.isEdited && (
                        <span className="text-[10px] opacity-80 mr-0.5 select-none font-normal">
                          diedit
                        </span>
                      )}
                      <span>{formatMessageTime(msg.createdAt, msg.timestamp)}</span>
                      {isOutgoing && (
                        msg.isSending ? (
                          <Clock className="w-3 h-3 text-slate-300 animate-pulse" />
                        ) : msg.isRead ? (
                          <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                        ) : (
                          <Check className="w-3 h-3 text-slate-300" />
                        )
                      )}
                    </div>

                    {/* Message Reactions display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 -mb-1" onClick={(e) => e.stopPropagation()}>
                        {msg.reactions.map((r, i) => (
                          <span
                            key={i}
                            onClick={() => onReactMessage(msg.id, r.emoji)}
                            className="text-xs bg-black/30 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer hover:bg-black/50 transition-colors border border-white/10"
                          >
                            <span>{r.emoji}</span>
                            <span className="text-[10px] text-slate-200 font-semibold">
                              {r.count}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ========================================================================= */}
      {/* SINGLE-TAP FLOATING CONTEXT MENU & REACTION BAR (FOTO 1)                  */}
      {/* ========================================================================= */}
      {contextMenuMsg && (
        <div 
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setContextMenuMsg(null)}
        >
          <div 
            className="flex flex-col items-center gap-2 max-w-xs w-full animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Quick Reaction Pill Bar (Foto 1) */}
            <div className="bg-[#212a35] border border-[#313e4f] shadow-2xl rounded-full px-3 py-2 flex items-center gap-2 backdrop-blur-md">
              {quickReactions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleMenuReact(contextMenuMsg, emoji)}
                  className="text-2xl hover:scale-130 active:scale-110 transition-transform cursor-pointer p-0.5"
                  title={`Reaksi ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={() => {
                  setShowEmojiPicker(true);
                  setContextMenuMsg(null);
                }}
                className="w-7 h-7 rounded-full bg-[#2d3a4b] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer hover:bg-[#39495e]"
                title="Pilih Emoji Lain"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Context Action Menu Box (Foto 1) */}
            <div className="w-full bg-[#1e2632] border border-[#2d3a4b] shadow-2xl rounded-2xl p-1.5 backdrop-blur-md text-slate-100 flex flex-col space-y-0.5 overflow-hidden">
              {/* Balas */}
              <button
                onClick={() => handleMenuReply(contextMenuMsg)}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-[#273344] transition-colors text-sm font-medium text-left cursor-pointer"
              >
                <CornerUpLeft className="w-4 h-4 text-[#7f91a4]" />
                <span>Balas</span>
              </button>

              {/* Edit (tampil jika pesan milik kita dan bukan info panggilan) */}
              {contextMenuMsg.senderId === currentUser.id && !contextMenuMsg.callInfo && (
                <button
                  onClick={() => handleMenuEdit(contextMenuMsg)}
                  className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-[#273344] transition-colors text-sm font-medium text-left cursor-pointer"
                >
                  <Pencil className="w-4 h-4 text-[#7f91a4]" />
                  <span>Edit</span>
                </button>
              )}

              {/* Salin */}
              <button
                onClick={() => handleMenuCopy(contextMenuMsg)}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-[#273344] transition-colors text-sm font-medium text-left cursor-pointer"
              >
                <Copy className="w-4 h-4 text-[#7f91a4]" />
                <span>Salin</span>
              </button>

              {/* Teruskan */}
              <button
                onClick={() => handleMenuForward(contextMenuMsg)}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-[#273344] transition-colors text-sm font-medium text-left cursor-pointer"
              >
                <CornerUpRight className="w-4 h-4 text-[#7f91a4]" />
                <span>Teruskan</span>
              </button>

              {/* Sematkan */}
              <button
                onClick={() => handleMenuPin(contextMenuMsg)}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-[#273344] transition-colors text-sm font-medium text-left cursor-pointer"
              >
                <Pin className="w-4 h-4 text-[#7f91a4]" />
                <span>{contextMenuMsg.isPinned ? 'Lepas Sematan' : 'Sematkan'}</span>
              </button>

              {/* Hapus */}
              <button
                onClick={() => handleMenuDelete(contextMenuMsg)}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-red-950/40 text-red-400 transition-colors text-sm font-medium text-left cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM AREA: STANDARD INPUT vs SELECTION BOTTOM PILLS (FOTO 2)            */}
      {/* ========================================================================= */}
      {selectionMode ? (
        /* Selection Mode Bottom Action Pills (Foto 2) */
        <div id="selection-bottom-bar" className="p-3 bg-[#17212b] border-t border-[#101921] flex items-center justify-center gap-2 sm:gap-3 z-20 animate-in fade-in duration-100">
          <button
            id="btn-bottom-reply"
            onClick={handleReplySelected}
            className="flex-1 py-3 px-3 sm:px-6 rounded-full bg-[#242f3d] hover:bg-[#2d3a4b] active:scale-[0.98] text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 border border-[#313e4f] shadow-md cursor-pointer"
          >
            <span>Balas</span>
            <CornerUpLeft className="w-4 h-4 text-[#5288c1]" />
          </button>
          
          <button
            id="btn-bottom-forward"
            onClick={handleForwardSelected}
            className="flex-1 py-3 px-3 sm:px-6 rounded-full bg-[#242f3d] hover:bg-[#2d3a4b] active:scale-[0.98] text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 border border-[#313e4f] shadow-md cursor-pointer"
          >
            <CornerUpRight className="w-4 h-4 text-[#5288c1]" />
            <span>Teruskan</span>
          </button>

          <button
            id="btn-bottom-delete"
            onClick={handleDeleteSelected}
            className="flex-1 py-3 px-3 sm:px-6 rounded-full bg-red-500/15 hover:bg-red-500/25 active:scale-[0.98] text-red-400 hover:text-red-300 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 border border-red-500/30 shadow-md cursor-pointer"
            title="Hapus Pesan Terpilih"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Hapus</span>
          </button>
        </div>
      ) : (
        /* Normal Chat Bottom Input Bar */
        <div className="flex flex-col z-20">
          {/* Replying Context Bar (Foto 1) */}
          {replyingTo && (() => {
            const replyImg = replyingTo.attachments?.find((a) => a.type === 'image')?.url;
            const replyVoice = replyingTo.attachments?.some((a) => a.type === 'voice');
            let replyCaption = replyingTo.text;
            if (!replyCaption || replyCaption === 'Foto Lampiran') {
              if (replyImg) replyCaption = 'Foto';
              else if (replyVoice) replyCaption = 'Pesan suara';
            }

            return (
              <div className="bg-[#17212b] px-4 py-2 border-t border-[#242f3d] flex items-center justify-between text-xs text-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-[3px] self-stretch rounded-full bg-[#a29bfe] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-[#a29bfe] block text-xs truncate">
                      {replyingTo.senderName}
                    </span>
                    <div className="flex items-center text-[#7f91a4] text-xs mt-0.5 truncate">
                      {replyImg && (
                        <ImageIcon className="w-3.5 h-3.5 inline-block mr-1 shrink-0 text-[#7f91a4]" />
                      )}
                      {replyVoice && (
                        <Mic className="w-3.5 h-3.5 inline-block mr-1 shrink-0 text-[#7f91a4]" />
                      )}
                      <span className="truncate">{replyCaption || 'Pesan'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-2 shrink-0">
                  {replyImg && (
                    <img
                      src={replyImg}
                      alt="Replied photo"
                      className="w-10 h-10 rounded-md object-cover border border-white/10 shrink-0"
                    />
                  )}
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer shrink-0"
                    title="Batal balas"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Editing Context Bar */}
          {editingMsg && (
            <div className="bg-[#17212b] px-4 py-2 border-t border-[#242f3d] flex items-center justify-between text-xs text-slate-200">
              <div className="flex items-center gap-2 border-l-2 border-[#5288c1] pl-2 min-w-0">
                <Pencil className="w-3.5 h-3.5 text-[#5288c1] shrink-0" />
                <div className="min-w-0">
                  <span className="font-semibold text-[#5288c1] block">Edit Pesan</span>
                  <p className="text-[#7f91a4] truncate max-w-xs">{editingMsg.text}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingMsg(null);
                  setInputText('');
                }}
                className="text-slate-400 hover:text-white p-1 cursor-pointer shrink-0"
                title="Batal edit"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Staged Photo or Video Attachment Bar */}
          {stagedAttachment && (
            <div className="bg-[#17212b] px-4 py-2 border-t border-[#242f3d] flex items-center justify-between text-xs text-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative group/staged shrink-0 bg-black rounded-lg overflow-hidden">
                  {stagedAttachment.type === 'video' ? (
                    <div className="w-12 h-12 relative flex items-center justify-center bg-slate-900 border border-[#313e4f]">
                      {stagedAttachment.thumbnailUrl ? (
                        <img
                          src={stagedAttachment.thumbnailUrl}
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Video className="w-6 h-6 text-[#5288c1]" />
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="relative w-6 h-6 flex items-center justify-center">
                          <svg className="absolute -inset-1 w-8 h-8 animate-spin text-[#22c55e]" viewBox="0 0 50 50">
                            <circle className="opacity-30" cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" />
                            <circle className="opacity-90" cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="80" strokeDashoffset="30" strokeLinecap="round" />
                          </svg>
                          <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5 relative z-10" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={stagedAttachment.url}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-[#313e4f] shadow-sm"
                    />
                  )}
                  {stagedAttachment.isHD && (
                    <div className="absolute top-0.5 right-0.5 bg-[#22c55e] text-[9px] font-extrabold text-black px-1 rounded shadow-xs">
                      HD
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white truncate max-w-[180px] sm:max-w-xs">
                      {stagedAttachment.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailMediaModal({
                          isOpen: true,
                          isHD: !!stagedAttachment.isHD,
                          standardSize: '2,9 MB',
                          standardRes: '478 × 850',
                          hdSize: '5,4 MB',
                          hdRes: '720 × 1280',
                          onSelectQuality: (newIsHD) => {
                            setStagedAttachment((prev) => prev ? { ...prev, isHD: newIsHD } : null);
                          },
                        });
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold cursor-pointer transition-all border flex items-center gap-1 ${
                        stagedAttachment.isHD
                          ? 'bg-[#22c55e] text-black border-[#22c55e] hover:brightness-110 shadow-xs'
                          : 'bg-[#242f3d] text-slate-300 border-[#313e4f] hover:bg-[#2e3c4d]'
                      }`}
                      title="Pilih Kualitas Media (Detail media)"
                    >
                      HD
                    </button>
                    <span className="text-[10px] text-[#7f91a4]">
                      ({stagedAttachment.size}
                      {stagedAttachment.duration ? ` • ${Math.floor(stagedAttachment.duration / 60)}:${(stagedAttachment.duration % 60).toString().padStart(2, '0')}` : ''})
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5288c1] font-medium mt-0.5">
                    {stagedAttachment.type === 'video' ? 'Video siap dikirim • Tambahkan keterangan jika perlu' : 'Foto siap dikirim • Tambahkan keterangan jika perlu'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStagedAttachment(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-[#242f3d] transition-colors cursor-pointer shrink-0 ml-2"
                title="Batal lampirkan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Emoji Picker Popup Tray */}
          {showEmojiPicker && (
            <div className="bg-[#17212b] border-t border-[#242f3d] p-3 max-h-48 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#242f3d] text-xs text-[#7f91a4]">
                <span className="font-semibold">Emoji Telegram</span>
                <button onClick={() => setShowEmojiPicker(false)} className="hover:text-white cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-10 gap-1.5 text-xl text-center">
                {commonEmojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputText((prev) => prev + emoji)}
                    className="hover:scale-125 transition-transform p-1 rounded hover:bg-[#242f3d] cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Attachment Bottom Sheet */}
          {showAttachmentMenu && (
            <div className="bg-[#17212b] border-t border-[#242f3d] p-3 flex items-center justify-around text-xs text-slate-300">
              <label className="flex flex-col items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <span>Galeri Foto</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              <label className="flex flex-col items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <span>Kirim Video</span>
                <input
                  type="file"
                  ref={videoInputRef}
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoUpload}
                />
              </label>

              <button
                onClick={() => {
                  alert('Fitur kirim Dokumen Telegram');
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-1.5 cursor-pointer hover:text-white transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <span>Dokumen</span>
              </button>
            </div>
          )}

          {/* Main Input Row / Blocked Notices */}
          {isBlockedByTarget ? (
            <div 
              id="input-blocked-by-target-notice"
              className="p-3 bg-[#17212b]/95 backdrop-blur-md border-t border-[#101921] w-full"
            >
              <button
                id="btn-delete-blocked-chat-full"
                onClick={() => {
                  if (onDeleteChat) {
                    onDeleteChat(chat.id);
                  } else if (onDeleteGroup) {
                    onDeleteGroup(chat.id);
                  } else {
                    alert('Hapus obrolan ini');
                  }
                }}
                className="w-full py-3.5 bg-[#242f3d] hover:bg-[#313d4f] active:scale-[0.99] text-red-400 hover:text-red-300 text-sm font-medium rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-2"
              >
                <span>Hapus obrolan ini</span>
              </button>
            </div>
          ) : isBlockedByMe ? (
            <div 
              id="input-blocked-by-me-notice"
              className="p-3.5 bg-[#17212b] border-t border-[#101921] flex items-center justify-between px-4"
            >
              <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                <CircleSlash className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Pengguna ini telah Anda blokir</span>
              </div>
              <button
                id="btn-unblock-in-chat"
                onClick={() => {
                  const targetId = targetUser?.id || otherParticipantId || chat.id;
                  if (onToggleBlockUser && targetId) {
                    onToggleBlockUser(targetId, false);
                  }
                }}
                className="px-3.5 py-1.5 bg-[#5288c1] hover:bg-[#4374a8] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Buka Blokir
              </button>
            </div>
          ) : !canSendText ? (
            <div className="py-3 px-4 bg-[#17212b] border-t border-[#101921] text-center text-xs text-[#7f91a4] font-medium">
              Mengirim pesan teks tidak diizinkan di grup ini
            </div>
          ) : (
            <div className="p-2.5 md:p-3.5 bg-[#17212b] border-t border-[#101921] flex items-center gap-2">
              {/* Attachment Button */}
              <button
                id="attach-file-btn"
                onClick={() => {
                  if (canSendMedia) setShowAttachmentMenu(!showAttachmentMenu);
                  else showToast('Admin membatasi pengiriman media di grup ini');
                }}
                disabled={!canSendMedia}
                className={`transition-colors p-1 shrink-0 ${
                  !canSendMedia ? 'text-slate-600 cursor-not-allowed' : 'text-[#7f91a4] hover:text-[#5288c1] cursor-pointer'
                } ${showAttachmentMenu ? 'text-[#5288c1]' : ''}`}
                title="Lampirkan File / Foto"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Input Text Box or Voice recording */}
              {isRecordingVoice ? (
                <div className="flex-1 flex items-center justify-between bg-[#1f2937]/90 px-4 py-2 rounded-xl text-white font-medium text-sm border border-red-500/50 shadow-inner">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0" />
                    <span className="text-red-400 font-semibold">Merekam:</span>
                    <span className="font-mono text-slate-200">
                      0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                    </span>
                  </div>
                  {/* Animated Waveform bars */}
                  <div className="flex items-center gap-1 h-5 px-2">
                    <span className="w-1 bg-red-500 rounded-full animate-bounce h-3" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 bg-red-400 rounded-full animate-bounce h-5" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 bg-red-500 rounded-full animate-bounce h-2" style={{ animationDelay: '300ms' }} />
                    <span className="w-1 bg-red-300 rounded-full animate-bounce h-4" style={{ animationDelay: '450ms' }} />
                    <span className="w-1 bg-red-500 rounded-full animate-bounce h-3" style={{ animationDelay: '200ms' }} />
                  </div>
                </div>
              ) : (
                <input
                  ref={messageInputRef}
                  id="message-input-field"
                  type="text"
                  placeholder={
                    stagedAttachment
                      ? "Tambah keterangan..."
                      : editingMsg
                        ? "Edit pesan..."
                        : "Pesan"
                  }
                  value={inputText}
                  onChange={(e) => handleTyping(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (settings.sendWithEnter && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      } else if (!settings.sendWithEnter && e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }
                  }}
                  className="flex-1 bg-[#242f3d] border border-transparent focus:border-[#5288c1] rounded-xl py-2 px-3.5 text-sm outline-none text-white placeholder-[#7f91a4] transition-all"
                />
              )}

              {/* Emoji Button */}
              <button
                id="emoji-toggle-btn"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`text-[#7f91a4] hover:text-[#5288c1] transition-colors cursor-pointer p-1 shrink-0 ${
                  showEmojiPicker ? 'text-[#5288c1]' : ''
                }`}
                title="Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Send / Mic Action Button */}
              {(inputText.trim() || stagedAttachment) ? (
                <button
                  id="send-message-btn"
                  onClick={handleSend}
                  className="w-10 h-10 rounded-full bg-[#5288c1] hover:bg-[#4374a8] active:scale-95 text-white flex items-center justify-center shadow-md shadow-[#5288c1]/25 transition-all cursor-pointer shrink-0"
                  title={editingMsg ? "Simpan Perubahan" : stagedAttachment ? "Kirim Foto" : "Kirim Pesan"}
                >
                  {editingMsg ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <Send className="w-4 h-4 -ml-0.5 mt-0.5" />
                  )}
                </button>
              ) : isRecordingVoice ? (
                <button
                  id="finish-voice-btn"
                  onClick={handleSendVoiceNote}
                  className="w-10 h-10 rounded-full bg-[#4fae4e] hover:bg-[#439c42] active:scale-95 text-white flex items-center justify-center shadow-md transition-all cursor-pointer shrink-0"
                  title="Kirim Pesan Suara"
                >
                  <Send className="w-4 h-4 -ml-0.5" />
                </button>
              ) : (
                <button
                  id="mic-record-btn"
                  onClick={() => {
                    if (canSendMedia) startRecording();
                    else showToast('Admin membatasi pengiriman pesan suara');
                  }}
                  className="w-10 h-10 rounded-full bg-[#5288c1] hover:bg-[#4374a8] text-white flex items-center justify-center shadow-md shadow-[#5288c1]/20 transition-all cursor-pointer shrink-0"
                  title="Rekam Pesan Suara"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Forward Modal (Telegram Style) */}
      <ForwardModal
        isOpen={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        messagesToForward={messagesToForward}
        chats={chats}
        users={allUsers}
        currentUser={currentUser}
        onForwardToChat={(targetChatId, msgs) => {
          if (onForwardMessages) {
            onForwardMessages(targetChatId, msgs);
            showToast(`${msgs.length} pesan berhasil diteruskan`);
          }
        }}
        onForwardToUser={(targetUser, msgs) => {
          if (onForwardToUser) {
            onForwardToUser(targetUser, msgs);
            showToast(`${msgs.length} pesan berhasil diteruskan ke @${targetUser.username}`);
          }
        }}
      />

      {/* Full-featured Telegram Contact Profile Modal */}
      <ContactProfileModal
        isOpen={showContactInfo}
        onClose={() => setShowContactInfo(false)}
        contact={{
          id: maskedChat.id,
          name: maskedChat.name,
          username: isBlockedByTarget ? undefined : maskedChat.username,
          phone: isBlockedByTarget ? undefined : maskedChat.phone,
          bio: isBlockedByTarget ? undefined : maskedChat.bio,
          avatar: isBlockedByTarget ? '' : maskedChat.avatar,
          color: maskedChat.color || '#5288c1',
          isOnline: isBlockedByTarget ? false : maskedChat.isOnline,
          lastSeen: isBlockedByTarget ? 'terakhir dilihat lama sekali' : maskedChat.lastSeen,
          isVerified: maskedChat.isVerified,
          badgeColor: (maskedChat as any).badgeColor,
          isBlocked: isBlockedByMe,
          isAdminBlocked: Boolean(targetUser?.isBlocked || targetUser?.isAdminBlocked || maskedChat.isAdminBlocked),
          isBlockedBy: isBlockedByTarget,
          privacyCalls: maskedChat.privacyCalls,
          privacyVoiceMessages: maskedChat.privacyVoiceMessages,
          privacyBio: maskedChat.privacyBio,
        }}
        onToggleBlock={() => {
          const targetId = targetUser?.id || otherParticipantId || chat.id;
          if (onToggleBlockUser && targetId) {
            onToggleBlockUser(targetId);
          }
        }}
        onStartChat={() => setShowContactInfo(false)}
        onStartSecretChat={() => {
          setShowContactInfo(false);
          onSendMessage('🔒 Memulai Obrolan Rahasia Terenkripsi End-to-End.');
        }}
        onStartCall={(video) => {
          if (isBlockedByTarget) {
            showToast('Anda telah diblokir oleh pengguna ini.');
            return;
          }
          alert(`Memulai panggilan ${video ? 'video' : 'suara'} ke ${chat.name}...`);
        }}
        onUpdateContactName={(newName) => {
          chat.name = newName;
        }}
      />

      {/* Full-featured Telegram Group Profile & Settings Modal */}
      {showGroupProfile && chat.type === 'group' && (
        <GroupProfileModal
          isOpen={showGroupProfile}
          onClose={() => setShowGroupProfile(false)}
          chat={chat}
          currentUser={currentUser}
          allUsers={allUsers}
          onUpdateGroup={onUpdateGroup || (async () => {})}
          onDeleteGroup={onDeleteGroup || (async () => {})}
          onAddMembers={onAddMembers || (async () => {})}
          onLeaveGroup={onLeaveGroup}
        />
      )}

      {/* Join Group Modal for invite links */}
      {joinModalLink && (
        <JoinGroupModal
          isOpen={!!joinModalLink}
          onClose={() => setJoinModalLink(null)}
          inviteLink={joinModalLink}
          currentUser={currentUser}
          onJoined={(joinedChat) => {
            if (onJoinedGroup) onJoinedGroup(joinedChat);
            setJoinModalLink(null);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TELEGRAM DELETE MESSAGE CONFIRMATION MODAL                                */}
      {/* ========================================================================= */}
      {deleteModal && deleteModal.isOpen && (() => {
        const selectedModalMsgs = messages.filter((m) => deleteModal.messageIds.includes(m.id));
        const isGroupAdmin = (chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel') &&
          (chat.adminIds?.includes(currentUser.id) || chat.creatorId === currentUser.id);
        const canDeleteForEveryone = selectedModalMsgs.length > 0 &&
          selectedModalMsgs.every((m) => m.senderId === currentUser.id || isGroupAdmin);

        return (
          <div 
            id="modal-delete-message-backdrop"
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setDeleteModal(null)}
          >
            <div 
              id="modal-delete-message-dialog"
              className="bg-[#17212b] border border-[#242f3d] shadow-2xl rounded-2xl p-5 max-w-sm w-full animate-in zoom-in-95 duration-150 text-white space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 shadow-inner">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Hapus {deleteModal.messageIds.length > 1 ? `${deleteModal.messageIds.length} Pesan` : 'Pesan'}?
                </h3>
                <p className="text-xs text-[#7f91a4] leading-relaxed">
                  {canDeleteForEveryone 
                    ? 'Pilih opsi penghapusan yang Anda inginkan.' 
                    : 'Pesan dari pengguna lain hanya dapat dihapus untuk obrolan Anda sendiri.'}
                </p>
              </div>

              <div className="space-y-2 pt-1">
                {/* Pilihan 1: Hapus untuk semua orang (HANYA tampil jika semua pesan milik sendiri atau admin grup) */}
                {canDeleteForEveryone && (
                  <button
                    id="btn-delete-for-everyone"
                    onClick={() => confirmDelete('all')}
                    className="w-full flex items-center gap-3.5 p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/30 text-left transition-all cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform shrink-0">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-red-400 group-hover:text-red-300">
                        Hapus untuk semua orang
                      </div>
                      <div className="text-[11px] text-[#7f91a4] leading-snug">
                        Pesan terhapus permanen untuk Anda dan penerima
                      </div>
                    </div>
                  </button>
                )}

                {/* Pilihan 2: Hapus untuk saya */}
                <button
                  id="btn-delete-for-me"
                  onClick={() => confirmDelete('me')}
                  className={`w-full flex items-center gap-3.5 p-3 rounded-xl text-left transition-all cursor-pointer group ${
                    canDeleteForEveryone 
                      ? 'bg-[#242f3d]/60 hover:bg-[#242f3d] active:bg-[#2d3a4b] border border-[#313e4f]' 
                      : 'bg-red-500/15 hover:bg-red-500/25 active:bg-red-500/35 border border-red-500/30'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform shrink-0 ${
                    canDeleteForEveryone 
                      ? 'bg-[#313e4f] text-[#7f91a4] group-hover:text-white group-hover:scale-110' 
                      : 'bg-red-500/20 text-red-400 group-hover:scale-110'
                  }`}>
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${canDeleteForEveryone ? 'text-white' : 'text-red-400 group-hover:text-red-300'}`}>
                      Hapus untuk saya
                    </div>
                    <div className="text-[11px] text-[#7f91a4] leading-snug">
                      Hanya terhapus di layar Anda, di pengguna lain masih ada
                    </div>
                  </div>
                </button>
              </div>

              <div className="pt-1">
                <button
                  id="btn-delete-cancel"
                  onClick={() => setDeleteModal(null)}
                  className="w-full py-2.5 rounded-xl bg-[#202b36] hover:bg-[#283644] text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* TELEGRAM CLEAR HISTORY CONFIRMATION MODAL                                 */}
      {/* ========================================================================= */}
      {showClearHistoryModal && (
        <div 
          id="modal-clear-history-backdrop"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowClearHistoryModal(false)}
        >
          <div 
            id="modal-clear-history-dialog"
            className="bg-[#17212b] border border-[#242f3d] shadow-2xl rounded-2xl p-5 max-w-sm w-full animate-in zoom-in-95 duration-150 text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 shadow-inner">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">
                Bersihkan Riwayat Obrolan?
              </h3>
              <p className="text-xs text-[#7f91a4] leading-relaxed">
                {chat.type === 'direct' 
                  ? `Apakah Anda yakin ingin menghapus semua riwayat pesan dalam obrolan dengan ${maskedChat.name}?`
                  : 'Apakah Anda yakin ingin menghapus semua pesan dalam grup ini?'}
              </p>
            </div>

            {chat.type === 'direct' && (
              <label 
                id="checkbox-clear-history-both"
                className="flex items-center gap-3 p-3 rounded-xl bg-[#242f3d]/60 border border-[#313e4f] cursor-pointer hover:bg-[#242f3d] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isDeleteForBoth}
                  onChange={(e) => setIsDeleteForBoth(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5288c1] bg-[#17212b] border-[#313e4f] focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-200">
                  Hapus juga untuk {maskedChat.name}
                </span>
              </label>
            )}

            <div className="space-y-2 pt-1">
              <button
                id="btn-confirm-clear-history"
                onClick={confirmClearHistory}
                className="w-full py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 active:bg-red-500/40 border border-red-500/40 text-red-400 hover:text-red-300 text-sm font-semibold transition-all cursor-pointer shadow-sm"
              >
                Bersihkan Riwayat
              </button>
              <button
                id="btn-cancel-clear-history"
                onClick={() => setShowClearHistoryModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#202b36] hover:bg-[#283644] text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TELEGRAM DELETE CHAT CONFIRMATION MODAL                                   */}
      {/* ========================================================================= */}
      {showDeleteChatModal && (
        <div 
          id="modal-delete-chat-backdrop"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowDeleteChatModal(false)}
        >
          <div 
            id="modal-delete-chat-dialog"
            className="bg-[#17212b] border border-[#242f3d] shadow-2xl rounded-2xl p-5 max-w-sm w-full animate-in zoom-in-95 duration-150 text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 shadow-inner">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">
                {chat.type === 'group' ? 'Hapus & Keluar Grup?' : 'Hapus Obrolan?'}
              </h3>
              <p className="text-xs text-[#7f91a4] leading-relaxed">
                {chat.type === 'group' 
                  ? 'Apakah Anda yakin ingin menghapus obrolan dan keluar dari grup ini?' 
                  : `Apakah Anda yakin ingin menghapus obrolan dengan ${maskedChat.name}?`}
              </p>
            </div>

            {chat.type === 'direct' && (
              <label 
                id="checkbox-delete-chat-both"
                className="flex items-center gap-3 p-3 rounded-xl bg-[#242f3d]/60 border border-[#313e4f] cursor-pointer hover:bg-[#242f3d] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isDeleteForBoth}
                  onChange={(e) => setIsDeleteForBoth(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5288c1] bg-[#17212b] border-[#313e4f] focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-200">
                  Hapus juga untuk {maskedChat.name}
                </span>
              </label>
            )}

            <div className="space-y-2 pt-1">
              <button
                id="btn-confirm-delete-chat"
                onClick={confirmDeleteCurrentChat}
                className="w-full py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 active:bg-red-500/40 border border-red-500/40 text-red-400 hover:text-red-300 text-sm font-semibold transition-all cursor-pointer shadow-sm"
              >
                {chat.type === 'group' ? 'Hapus & Keluar' : 'Hapus Obrolan'}
              </button>
              <button
                id="btn-cancel-delete-chat"
                onClick={() => setShowDeleteChatModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#202b36] hover:bg-[#283644] text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TELEGRAM FULLSCREEN ENLARGED PHOTO VIEWER MODAL & 3-DOTS MENU             */}
      {/* ========================================================================= */}
      {enlargedPhoto && (
        <div 
          id="modal-enlarged-photo-viewer"
          className="fixed inset-0 z-[9999] bg-black select-none overflow-hidden flex flex-col justify-between animate-in fade-in duration-150"
          onClick={() => {
            if (showPhotoMenu) {
              setShowPhotoMenu(false);
            }
          }}
        >
          {/* Top Control Bar - Floating Gradient Overlay */}
          <div 
            className={`absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 py-3 md:px-5 md:py-3.5 bg-gradient-to-b from-black/85 via-black/45 to-transparent text-white transition-opacity duration-200 ${
              showViewerOverlay || showPhotoMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                id="btn-back-photo-viewer"
                onClick={() => setEnlargedPhoto(null)}
                className="p-2 rounded-full hover:bg-white/15 active:bg-white/25 text-white transition-colors cursor-pointer"
                title="Kembali"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-white truncate drop-shadow-sm flex items-center gap-1.5">
                  <span>{enlargedPhoto.msg.senderName}</span>
                </div>
                <div className="text-[12px] text-white/70 leading-tight">
                  Hari ini {formatCallTime(enlargedPhoto.msg.createdAt, enlargedPhoto.msg.timestamp)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2 relative">
              {/* Star Button */}
              <button
                id="btn-star-photo"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStarPhoto(enlargedPhoto.msg.id);
                }}
                className="p-2 rounded-full hover:bg-white/15 text-white transition-colors cursor-pointer"
                title="Bintangi"
              >
                <Star 
                  className="w-5 h-5" 
                  fill={starredMsgIds.includes(enlargedPhoto.msg.id) ? '#f59e0b' : 'none'} 
                  color={starredMsgIds.includes(enlargedPhoto.msg.id) ? '#f59e0b' : '#ffffff'} 
                />
              </button>

              {/* Forward / Share Button */}
              <button
                id="btn-forward-photo-top"
                onClick={(e) => {
                  e.stopPropagation();
                  handleForwardPhoto(enlargedPhoto.msg);
                }}
                className="p-2 rounded-full hover:bg-white/15 text-white transition-colors cursor-pointer"
                title="Teruskan"
              >
                <Forward className="w-5 h-5" />
              </button>

              {/* Edit / Pencil Button */}
              <button
                id="btn-edit-photo-top"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditPhotoCaption(enlargedPhoto.msg);
                }}
                className="p-2 rounded-full hover:bg-white/15 text-white transition-colors cursor-pointer"
                title="Edit"
              >
                <Pencil className="w-5 h-5" />
              </button>

              {/* Three Dots Button */}
              <button
                id="btn-photo-options-menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPhotoMenu(!showPhotoMenu);
                }}
                className={`p-2 rounded-full transition-colors cursor-pointer ${
                  showPhotoMenu ? 'bg-white/20 text-white' : 'hover:bg-white/15 text-white'
                }`}
                title="Pilihan Lainnya"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Three Dots Dropdown Menu */}
              {showPhotoMenu && (() => {
                const isVideo = enlargedPhoto.type === 'video' || enlargedPhoto.url.startsWith('data:video') || /\.(mp4|webm|mov|mkv)/i.test(enlargedPhoto.url);
                const mediaLabel = isVideo ? 'Video' : 'Foto';

                return (
                  <div 
                    id="dropdown-photo-options"
                    className="absolute right-0 top-12 bg-[#242f3d] border border-[#17212b] rounded-2xl shadow-2xl py-1.5 w-60 text-sm text-slate-200 z-50 backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {enlargedPhoto.msg.senderId === currentUser.id ? (
                      // Menu for Current User's Media (Sender)
                      <>
                        <button
                          id="btn-photo-menu-save"
                          onClick={() => handleDownloadPhoto(enlargedPhoto.url, enlargedPhoto.name, enlargedPhoto.type)}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] text-left transition-colors cursor-pointer text-slate-200 hover:text-white"
                        >
                          <Download className="w-4 h-4 text-[#5288c1]" />
                          <span>Simpan {mediaLabel}</span>
                        </button>

                        <button
                          id="btn-photo-menu-del-all"
                          onClick={() => handleDeletePhotoForEveryone(enlargedPhoto.msg)}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-500/15 text-red-400 text-left transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Hapus {mediaLabel} untuk Semua</span>
                        </button>

                        <button
                          id="btn-photo-menu-del-me"
                          onClick={() => handleDeletePhotoForMe(enlargedPhoto.msg)}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-500/15 text-red-400 text-left transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Hapus untuk Saya</span>
                        </button>

                        <button
                          id="btn-photo-menu-forward"
                          onClick={() => handleForwardPhoto(enlargedPhoto.msg)}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] text-left transition-colors cursor-pointer text-slate-200 hover:text-white"
                        >
                          <Forward className="w-4 h-4 text-[#5288c1]" />
                          <span>Teruskan {mediaLabel}</span>
                        </button>

                        <button
                          id="btn-photo-menu-reply"
                          onClick={() => handleReplyPhoto(enlargedPhoto.msg)}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] text-left transition-colors cursor-pointer text-slate-200 hover:text-white"
                        >
                          <Reply className="w-4 h-4 text-[#5288c1]" />
                          <span>Balas Pesan</span>
                        </button>
                      </>
                    ) : (
                      // Menu for Other User's Media (Receiver)
                      <>
                        <button
                          id="btn-photo-menu-save-gallery"
                          onClick={() => handleDownloadPhoto(enlargedPhoto.url, enlargedPhoto.name, enlargedPhoto.type)}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] text-left transition-colors cursor-pointer text-slate-200 hover:text-white"
                        >
                          <Download className="w-4 h-4 text-[#5288c1]" />
                          <span>Simpan ke Galeri</span>
                        </button>

                        <button
                          id="btn-photo-menu-forward"
                          onClick={() => handleForwardPhoto(enlargedPhoto.msg)}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] text-left transition-colors cursor-pointer text-slate-200 hover:text-white"
                        >
                          <Forward className="w-4 h-4 text-[#5288c1]" />
                          <span>Teruskan {mediaLabel}</span>
                        </button>

                        <button
                          id="btn-photo-menu-del-me"
                          onClick={() => handleDeletePhotoForMe(enlargedPhoto.msg)}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-500/15 text-red-400 text-left transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Hapus {mediaLabel} untuk Saya</span>
                        </button>

                        <button
                          id="btn-photo-menu-reply"
                          onClick={() => handleReplyPhoto(enlargedPhoto.msg)}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] text-left transition-colors cursor-pointer text-slate-200 hover:text-white"
                        >
                          <Reply className="w-4 h-4 text-[#5288c1]" />
                          <span>Balas Pesan</span>
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Fullscreen Media Display Viewport */}
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden z-10"
            onClick={() => {
              if (showPhotoMenu) {
                setShowPhotoMenu(false);
              } else {
                setShowViewerOverlay((prev) => !prev);
              }
            }}
          >
            {enlargedPhoto.type === 'video' || enlargedPhoto.url.startsWith('data:video') || /\.(mp4|webm|mov|mkv)/i.test(enlargedPhoto.url) ? (
              <TelegramVideoViewer
                src={enlargedPhoto.url}
                caption={
                  enlargedPhoto.msg.text &&
                  enlargedPhoto.msg.text.trim() !== '' &&
                  enlargedPhoto.msg.text !== 'Video Lampiran'
                    ? enlargedPhoto.msg.text
                    : undefined
                }
                showOverlay={showViewerOverlay}
                onToggleOverlay={() => {
                  if (showPhotoMenu) {
                    setShowPhotoMenu(false);
                  } else {
                    setShowViewerOverlay((prev) => !prev);
                  }
                }}
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center p-2">
                <img
                  src={enlargedPhoto.url}
                  alt="Enlarged photo"
                  className="w-full h-full max-h-full max-w-full object-contain select-none"
                />
                {enlargedPhoto.msg.text &&
                  enlargedPhoto.msg.text.trim() !== '' &&
                  enlargedPhoto.msg.text !== 'Foto Lampiran' && (
                    <div 
                      className={`absolute bottom-6 inset-x-4 flex justify-center pointer-events-none z-20 transition-opacity duration-200 ${
                        showViewerOverlay ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <div className="max-w-md sm:max-w-lg px-4 py-2.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 text-white text-xs sm:text-sm text-center leading-relaxed shadow-xl pointer-events-auto">
                        {enlargedPhoto.msg.text}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Media Bottom Sheet Modal */}
      <DetailMediaModal
        isOpen={detailMediaModal.isOpen}
        onClose={() => setDetailMediaModal((prev) => ({ ...prev, isOpen: false }))}
        isHD={detailMediaModal.isHD}
        onSelectQuality={(newIsHD) => {
          setDetailMediaModal((prev) => ({ ...prev, isHD: newIsHD, isOpen: false }));
          if (detailMediaModal.onSelectQuality) {
            detailMediaModal.onSelectQuality(newIsHD);
          }
        }}
        standardSize={detailMediaModal.standardSize}
        standardRes={detailMediaModal.standardRes}
        hdSize={detailMediaModal.hdSize}
        hdRes={detailMediaModal.hdRes}
      />

      {/* Fullscreen Media Composer Modal for Chat */}
      <StoryComposerModal
        isOpen={chatMediaComposer.isOpen}
        onClose={() => setChatMediaComposer({ isOpen: false, files: [] })}
        currentUser={currentUser}
        isChatMode={true}
        initialFiles={chatMediaComposer.files}
        onSendToChat={handleSendFromMediaComposer}
      />

    </div>
  );
};
