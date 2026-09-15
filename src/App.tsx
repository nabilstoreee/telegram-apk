import React, { useState, useEffect } from 'react';
import { User, Chat, Message } from './types';
import { AuthModal } from './components/AuthModal';
import { SidebarDrawer } from './components/SidebarDrawer';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import { NewChatModal } from './components/NewChatModal';
import { NewGroupModal } from './components/NewGroupModal';
import { ProfileModal } from './components/ProfileModal';
import { StatusEmojiModal } from './components/StatusEmojiModal';
import { WalletModal } from './components/WalletModal';
import { CallsModal } from './components/CallsModal';
import { FeaturesModal } from './components/FeaturesModal';
import { ContactProfileModal } from './components/ContactProfileModal';
import { ArchivedChatsView } from './components/ArchivedChatsView';
import { ChatSettingsModal } from './components/ChatSettingsModal';
import { UpdatesModal } from './components/UpdatesModal';
import { ContactsModal } from './components/ContactsModal';
import { ActiveCallModal, ActiveCallState } from './components/ActiveCallModal';
import { playTelegramSound } from './utils/sound';
import { getMaskedContact } from './utils/privacy';
import { Send, ShieldCheck, Sparkles, MessageSquare } from 'lucide-react';
import { db, collection, getDocs } from './lib/firebase';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  // Active WebRTC Call state
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [isCallMinimized, setIsCallMinimized] = useState<boolean>(false);
  const [incomingAnswer, setIncomingAnswer] = useState<any>(null);
  const [incomingIceCandidate, setIncomingIceCandidate] = useState<any>(null);
  const [incomingRenegotiateOffer, setIncomingRenegotiateOffer] = useState<any>(null);
  const [incomingRenegotiateAnswer, setIncomingRenegotiateAnswer] = useState<any>(null);
  const [incomingMediaUpdate, setIncomingMediaUpdate] = useState<any>(null);
  const [remoteCallEnded, setRemoteCallEnded] = useState<boolean>(false);
  const [remoteCallRejected, setRemoteCallRejected] = useState<boolean>(false);

  // Modals and views state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
  const [chatSettingsOpenedFrom, setChatSettingsOpenedFrom] = useState<'profile' | 'drawer' | null>(null);
  const [isStatusEmojiOpen, setIsStatusEmojiOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isCallsOpen, setIsCallsOpen] = useState(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [isUpdatesOpen, setIsUpdatesOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [isArchivedViewOpen, setIsArchivedViewOpen] = useState(false);
  const [viewingContact, setViewingContact] = useState<User | null>(null);

  // 1. Fetch all users with resilient retry and multi-tier fallback (API -> Firestore -> LocalStorage -> Admin default)
  const fetchUsers = async (targetUserId?: string) => {
    try {
      const uId = targetUserId || currentUser?.id;
      const url = uId ? `/api/users?userId=${encodeURIComponent(uId)}` : '/api/users';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Merge with any offline / client-registered users
            try {
              const localUsers: User[] = JSON.parse(localStorage.getItem('tg_local_users') || '[]');
              for (const lu of localUsers) {
                if (!data.some(u => u.id === lu.id || u.username.toLowerCase() === lu.username.toLowerCase())) {
                  data.push(lu);
                }
              }
            } catch {}
            setAllUsers(data);
            return data;
          }
        }
      }
    } catch (e) {
      console.warn('Backend users fetch bypassed to Firestore:', e);
    }

    // Direct Firestore client fallback
    if (db) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const firestoreUsers: User[] = [];
        snap.forEach((d: any) => {
          const u = d.data();
          const { password: _, ...clean } = u;
          firestoreUsers.push(clean as User);
        });
        if (firestoreUsers.length > 0) {
          try {
            const localUsers: User[] = JSON.parse(localStorage.getItem('tg_local_users') || '[]');
            for (const lu of localUsers) {
              if (!firestoreUsers.some(u => u.id === lu.id || u.username.toLowerCase() === lu.username.toLowerCase())) {
                firestoreUsers.push(lu);
              }
            }
          } catch {}
          setAllUsers(firestoreUsers);
          return firestoreUsers;
        }
      } catch (fErr) {
        console.warn('Direct Firestore users fetch note:', fErr);
      }
    }

    // LocalStorage fallback if backend is on static host
    try {
      const localUsers: User[] = JSON.parse(localStorage.getItem('tg_local_users') || '[]');
      if (localUsers.length > 0) {
        setAllUsers(localUsers);
        return localUsers;
      }
    } catch {}

    // Fallback default admin user
    const defaultAdmin: User = {
      id: 'user-admin',
      username: 'nabilassihidiqi',
      name: 'Nabil Assihidiqi',
      phone: '+62 812-3456-7890',
      color: '#5288c1',
      bio: 'Telegram Creator & Administrator',
      isOnline: true,
      lastSeen: 'online',
      isVerified: true,
      unreadTotal: 0
    };
    setAllUsers([defaultAdmin]);
    return [defaultAdmin];
  };

  // Helper to change active chat and keep state across page reloads
  const handleSelectChat = (chat: Chat | null) => {
    setActiveChat(chat);
    if (chat) {
      localStorage.setItem('tg_active_chat_id', chat.id);
    } else {
      localStorage.removeItem('tg_active_chat_id');
    }
  };

  // 2. Fetch chats for current user with fallback default Saved Messages chat
  const fetchChats = async (userId?: string) => {
    const id = userId || currentUser?.id;
    if (!id) return;
    try {
      const res = await fetch(`/api/chats?userId=${id}`);
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setChats(data);
            setActiveChat((currentActive) => {
              const savedActiveChatId = localStorage.getItem('tg_active_chat_id');
              const targetId = currentActive?.id || savedActiveChatId;
              if (!targetId) return null;
              const refreshed = data.find((c) => c.id === targetId);
              return refreshed ? { ...(currentActive || {}), ...refreshed } : (currentActive || null);
            });
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Initial chats fetch attempt:', e);
    }

    // Fallback default chat if no backend connection
    setChats((prev) => {
      if (prev.length > 0) return prev;
      const defaultSavedChat: Chat = {
        id: `chat-saved-${id}`,
        name: 'Pesan Tersimpan',
        type: 'saved',
        folder: 'personal',
        unreadCount: 0,
        avatar: '',
        color: '#5288c1',
        isPinned: true,
        isSavedMessages: true,
        participants: [id],
        messages: [
          {
            id: `msg-welcome-saved`,
            chatId: `chat-saved-${id}`,
            senderId: id,
            senderName: currentUser?.name || 'Saya',
            text: 'Selamat datang di Telegram Web! Anda dapat menyimpan catatan, pesan penting, dan media di sini.',
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            createdAt: Date.now(),
            isRead: true
          }
        ]
      };
      return [defaultSavedChat];
    });
  };

  // Initial load
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      let users = await fetchUsers();
      
      // If initial fetch failed because server was still booting, retry once
      if ((!users || users.length === 0) && isMounted) {
        await new Promise((r) => setTimeout(r, 1000));
        users = await fetchUsers();
      }

      if (!isMounted) return;

      // Check stored user in localStorage
      const savedUserId = localStorage.getItem('tg_current_user_id');
      if (savedUserId && users && users.length > 0) {
        const found = users.find((u: User) => u.id === savedUserId);
        if (found && !found.isBlocked && !found.isAdminBlocked) {
          setCurrentUser(found);
          fetchChats(found.id);
          setIsAuthOpen(false);
          return;
        }
      }

      // If no stored user, auto-select the primary demo user so user immediately enjoys the full Telegram UI
      if (users && users.length > 0) {
        const defaultUser = users.find((u: User) => u.username === 'nabilassihidiqi') || users[0];
        setCurrentUser(defaultUser);
        localStorage.setItem('tg_current_user_id', defaultUser.id);
        fetchChats(defaultUser.id);
        setIsAuthOpen(false);
        return;
      }

      // If no users available yet, open Auth modal
      setCurrentUser(null);
      setIsAuthOpen(true);
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // Helper to format local device last seen timestamp
  const getDeviceLastSeen = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `terakhir dilihat hari ini pukul ${hours}:${minutes}`;
  };

  // SSE real-time listener for incoming messages and updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      const sseUrl = '/api/events' + (currentUser ? `?userId=${encodeURIComponent(currentUser.id)}` : '');
      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener('message_sent', (e: any) => {
        const data = JSON.parse(e.data);
        fetchChats(currentUser?.id);
        // If message is for active chat or user, play receive chime
        if (currentUser && data.message.senderId !== currentUser.id) {
          playTelegramSound.receive();
        }
      });

      eventSource.addEventListener('user_joined', () => {
        fetchUsers();
      });

      eventSource.addEventListener('chat_created', () => {
        fetchChats(currentUser?.id);
      });

      eventSource.addEventListener('chat_deleted', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.chatIds && Array.isArray(data.chatIds)) {
            setActiveChat((currentActive) => {
              if (currentActive && data.chatIds.includes(currentActive.id)) {
                return null;
              }
              return currentActive;
            });
          }
        } catch {}
        fetchChats(currentUser?.id);
      });

      eventSource.addEventListener('chats_updated', () => {
        fetchChats(currentUser?.id);
      });

      eventSource.addEventListener('history_cleared', () => {
        fetchChats(currentUser?.id);
      });

      eventSource.addEventListener('messages_read', () => {
        fetchChats(currentUser?.id);
      });

      eventSource.addEventListener('user_updated', () => {
        fetchUsers();
        fetchChats(currentUser?.id);
      });

      eventSource.addEventListener('users_updated', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.userId && currentUser && data.userId === currentUser.id && data.blockedUsers) {
            setCurrentUser((prev) => (prev ? { ...prev, blockedUsers: data.blockedUsers } : prev));
          }
        } catch {}
        fetchUsers();
        fetchChats(currentUser?.id);
      });

      eventSource.addEventListener('user_blocked', () => {
        fetchUsers();
        fetchChats(currentUser?.id);
      });

      eventSource.addEventListener('user_verification_updated', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.userId) {
            setAllUsers((prev) =>
              prev.map((u) => (u.id === data.userId ? { ...u, isVerified: data.isVerified, badgeColor: data.badgeColor, verifiedUntil: data.verifiedUntil } : u))
            );
            if (currentUser && data.userId === currentUser.id) {
              setCurrentUser((prev) => prev ? { ...prev, isVerified: data.isVerified, badgeColor: data.badgeColor, verifiedUntil: data.verifiedUntil } : prev);
            }
          }
        } catch {}
        fetchUsers();
        fetchChats(currentUser?.id);
      });

      eventSource.addEventListener('user_verification_expired', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.userId) {
            setAllUsers((prev) =>
              prev.map((u) => (u.id === data.userId ? { ...u, isVerified: false, badgeColor: null, verifiedUntil: null } : u))
            );
            if (currentUser && data.userId === currentUser.id) {
              setCurrentUser((prev) => prev ? { ...prev, isVerified: false, badgeColor: null, verifiedUntil: null } : prev);
            }
          }
        } catch {}
        fetchUsers();
        fetchChats(currentUser?.id);
      });

      eventSource.addEventListener('user_deleted', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.userId) {
            setAllUsers((prev) => prev.filter((u) => u.id !== data.userId));
            fetchChats(currentUser?.id);
          }
        } catch {}
      });

      eventSource.addEventListener('user_status', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          const { userId, isOnline, lastSeen } = data;
          
          setAllUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, isOnline, lastSeen } : u))
          );

          setChats((prev) =>
            prev.map((c) => {
              if (c.type === 'direct' && c.participants.includes(userId)) {
                return { ...c, isOnline, lastSeen };
              }
              return c;
            })
          );

          setActiveChat((prev) => {
            if (prev && prev.type === 'direct' && prev.participants.includes(userId)) {
              return { ...prev, isOnline, lastSeen };
            }
            return prev;
          });

          setViewingContact((prev) => {
            if (prev && prev.id === userId) {
              return { ...prev, isOnline, lastSeen };
            }
            return prev;
          });
        } catch (err) {
          console.warn('Error parsing user_status event:', err);
        }
      });

      // Real-Time WebRTC Call SSE Event Listeners
      eventSource.addEventListener('call_incoming', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          setActiveCall((prev) => {
            if (prev) {
              // User is already in call -> reject with busy
              fetch('/api/calls/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callId: data.callId,
                  callerId: data.caller.id,
                  targetUserId: currentUser?.id,
                  reason: 'busy',
                }),
              }).catch(() => {});
              return prev;
            }
            return {
              callId: data.callId,
              targetUser: data.caller,
              isCaller: false,
              status: 'incoming',
              callType: data.callType || 'audio',
              offer: data.offer,
            };
          });
          setIsCallMinimized(false);
          setIncomingAnswer(null);
          setIncomingIceCandidate(null);
          setRemoteCallEnded(false);
          setRemoteCallRejected(false);
        } catch (err) {
          console.error('Error handling call_incoming event:', err);
        }
      });

      eventSource.addEventListener('call_answered', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          setIncomingAnswer(data.answer);
        } catch (err) {
          console.error('Error handling call_answered event:', err);
        }
      });

      eventSource.addEventListener('call_ice_candidate', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          setIncomingIceCandidate(data.candidate);
        } catch (err) {
          console.error('Error handling call_ice_candidate event:', err);
        }
      });

      eventSource.addEventListener('call_renegotiate_offer', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          setIncomingRenegotiateOffer(data);
        } catch (err) {
          console.error('Error handling call_renegotiate_offer event:', err);
        }
      });

      eventSource.addEventListener('call_renegotiate_answer', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          setIncomingRenegotiateAnswer(data);
        } catch (err) {
          console.error('Error handling call_renegotiate_answer event:', err);
        }
      });

      eventSource.addEventListener('call_media_updated', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          setIncomingMediaUpdate(data);
        } catch (err) {
          console.error('Error handling call_media_updated event:', err);
        }
      });

      eventSource.addEventListener('call_rejected', () => {
        setRemoteCallRejected(true);
      });

      eventSource.addEventListener('call_ended', () => {
        setRemoteCallEnded(true);
        fetchChats(currentUser?.id);
      });

      eventSource.addEventListener('call_history_updated', () => {
        fetchChats(currentUser?.id);
      });
    } catch (err) {
      console.warn('SSE connection warning:', err);
    }

    return () => {
      eventSource?.close();
    };
  }, [currentUser?.id, activeChat?.id]);

  // Presence lifecycle tracking (online when visible, lastSeen when leaving/unloading)
  useEffect(() => {
    if (!currentUser) return;

    // Report online on mount
    fetch('/api/users/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, isOnline: true, lastSeen: 'online' }),
    }).catch(() => {});

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const lastSeen = getDeviceLastSeen();
        const payload = JSON.stringify({ userId: currentUser.id, isOnline: false, lastSeen });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/users/presence', payload);
        } else {
          fetch('/api/users/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } else if (document.visibilityState === 'visible') {
        fetch('/api/users/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, isOnline: true, lastSeen: 'online' }),
        }).catch(() => {});
      }
    };

    const handlePageHide = () => {
      const lastSeen = getDeviceLastSeen();
      const payload = JSON.stringify({ userId: currentUser.id, isOnline: false, lastSeen });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/users/presence', payload);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [currentUser?.id]);

  // Initiate real-time WebRTC voice/video call
  const handleStartCall = (targetUser: User, callType: 'audio' | 'video' = 'audio') => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    if (targetUser.id === currentUser.id) {
      alert('Anda tidak dapat memanggil akun Anda sendiri.');
      return;
    }
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    setActiveCall({
      callId,
      targetUser,
      isCaller: true,
      status: 'outgoing',
      callType,
    });
    setIsCallMinimized(false);
    setIncomingAnswer(null);
    setIncomingIceCandidate(null);
    setRemoteCallEnded(false);
    setRemoteCallRejected(false);
  };

  // Auto force-logout if active currentUser is found to be blocked
  useEffect(() => {
    if (!currentUser) return;
    const liveMe = allUsers.find((u) => u.id === currentUser.id || (u.username && u.username.toLowerCase() === currentUser.username.toLowerCase()));
    if (liveMe && (liveMe.isBlocked || liveMe.isAdminBlocked)) {
      localStorage.removeItem('tg_current_user_id');
      setCurrentUser(null);
      setIsAuthOpen(true);
    }
  }, [allUsers, currentUser]);

  // Handle Switch User (Multi-account switcher)
  const handleSwitchUser = async (user: User) => {
    if (user.isBlocked || user.isAdminBlocked || user.name === 'Akun Tidak Ditemukan') {
      alert(`Akun @${user.username || user.name} telah ditangguhkan.`);
      return;
    }
    if (currentUser && currentUser.id !== user.id) {
      const lastSeen = getDeviceLastSeen();
      const prevId = currentUser.id;
      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === prevId
            ? { ...u, isOnline: false, lastSeen }
            : u.id === user.id
            ? { ...u, isOnline: true, lastSeen: 'online' }
            : u
        )
      );
      try {
        await fetch('/api/users/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: prevId, isOnline: false, lastSeen }),
        });
      } catch {}
    }
    setCurrentUser(user);
    localStorage.setItem('tg_current_user_id', user.id);
    setActiveChat(null);
    setViewingContact(null);
    fetchChats(user.id);
    setIsDrawerOpen(false);
  };

  // Handle Logout
  const handleLogout = async () => {
    if (currentUser) {
      const lastSeen = getDeviceLastSeen();
      const prevId = currentUser.id;
      setAllUsers((prev) =>
        prev.map((u) => (u.id === prevId ? { ...u, isOnline: false, lastSeen } : u))
      );
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: prevId, lastSeen }),
          keepalive: true,
        });
      } catch (err) {
        console.warn('Logout error:', err);
      }
    }
    localStorage.removeItem('tg_current_user_id');
    setCurrentUser(null);
    setActiveChat(null);
    setViewingContact(null);
    setIsAuthOpen(true);
  };

  // Handle Delete Account Permanently
  const handleDeleteAccount = async (userId: string) => {
    try {
      const res = await fetch('/api/users/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setAllUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch (err) {
      console.warn('Delete account error:', err);
    }
    localStorage.removeItem('tg_current_user_id');
    setCurrentUser(null);
    setActiveChat(null);
    setViewingContact(null);
    setIsProfileOpen(false);
    setIsAuthOpen(true);
    fetchUsers();
  };

  // Handle Send Message
  const handleSendMessage = async (text: string, replyTo?: any, attachments?: any[]) => {
    if (!currentUser || !activeChat) return;

    const now = new Date();
    const clientTimestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const clientEpoch = Date.now();

    const payload = JSON.stringify({
      chatId: activeChat.id,
      senderId: currentUser.id,
      text,
      timestamp: clientTimestamp,
      createdAt: clientEpoch,
      replyTo,
      attachments,
    });

    const sendWithRetry = async (attempt: number = 0): Promise<void> => {
      try {
        const res = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        if (res.ok) {
          fetchChats(currentUser.id);
        } else {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 403 && (errData.isBlocked || errData.error?.includes('diblokir'))) {
            localStorage.removeItem('tg_current_user_id');
            setCurrentUser(null);
            setIsAuthOpen(true);
            alert('Akun Anda telah diblokir oleh Administrator. Anda telah dikeluarkan dari aplikasi.');
          } else {
            alert(errData.error || 'Gagal mengirim pesan.');
          }
        }
      } catch (e) {
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
          return sendWithRetry(attempt + 1);
        }
        console.error('Error sending message:', e);
      }
    };

    await sendWithRetry();
  };

  // Handle Reaction
  const handleReactMessage = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          emoji,
        }),
      });
    } catch (e) {
      console.error('Error reacting to message:', e);
    }
  };

  // Handle Delete Message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}${currentUser ? `?userId=${encodeURIComponent(currentUser.id)}` : ''}`, {
        method: 'DELETE',
      });
      fetchChats();
    } catch (e) {
      console.error('Error deleting message:', e);
    }
  };

  // Handle Bulk Delete Messages
  const handleDeleteMessages = async (messageIds: string[]) => {
    try {
      await fetch('/api/messages/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, userId: currentUser?.id }),
      });
      fetchChats();
    } catch (e) {
      console.error('Error deleting messages:', e);
    }
  };

  // Handle Forward Messages to Chat
  const handleForwardMessages = async (targetChatId: string, messagesToForward: Message[]) => {
    if (!currentUser) return;
    try {
      for (const msg of messagesToForward) {
        await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: targetChatId,
            senderId: currentUser.id,
            text: msg.text ? `[Diteruskan dari ${msg.senderName}]\n${msg.text}` : `[Diteruskan dari ${msg.senderName}]`,
            attachments: msg.attachments,
          }),
        });
      }
      await fetchChats();
      const targetChat = chats.find((c) => c.id === targetChatId);
      if (targetChat) {
        setActiveChat(targetChat);
      }
    } catch (e) {
      console.error('Error forwarding messages:', e);
    }
  };

  // Handle Forward Messages to User
  const handleForwardToUser = async (targetUser: User, messagesToForward: Message[]) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/chats/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUserId: currentUser.id,
          targetUserId: targetUser.id,
          type: 'direct',
        }),
      });
      if (res.ok) {
        const newChat = await res.json();
        await handleForwardMessages(newChat.id, messagesToForward);
      }
    } catch (e) {
      console.error('Error forwarding to user:', e);
    }
  };

  // Batch Chat Management Actions
  const handleBatchMuteChats = async (chatIds: string[]) => {
    try {
      await fetch('/api/chats/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatIds }),
      });
      fetchChats();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchArchiveChats = async (chatIds: string[]) => {
    try {
      await fetch('/api/chats/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatIds, isArchived: true }),
      });
      fetchChats();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchUnarchiveChats = async (chatIds: string[]) => {
    try {
      await fetch('/api/chats/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatIds, isArchived: false }),
      });
      fetchChats();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchDeleteChats = async (chatIds: string[], deleteForBoth?: boolean) => {
    if (!currentUser) return;
    try {
      await fetch('/api/chats/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatIds,
          userId: currentUser.id,
          deleteForBoth: deleteForBoth !== undefined ? deleteForBoth : true,
        }),
      });
      if (activeChat && chatIds.includes(activeChat.id)) {
        setActiveChat(null);
      }
      fetchChats(currentUser.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchPinChats = async (chatIds: string[]) => {
    try {
      await fetch('/api/chats/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatIds }),
      });
      fetchChats(currentUser?.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchRemoveFromFolder = async (chatIds: string[]) => {
    try {
      await fetch('/api/chats/remove-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatIds }),
      });
      fetchChats(currentUser?.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchMarkChatsRead = async (chatIds: string[]) => {
    if (!currentUser) return;
    try {
      await fetch('/api/chats/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatIds, userId: currentUser.id }),
      });
      fetchChats(currentUser.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchClearChatHistory = async (chatIds: string[]) => {
    if (!currentUser) return;
    try {
      await fetch('/api/chats/clear-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatIds, userId: currentUser.id }),
      });
      fetchChats(currentUser.id);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Block / Unblock User
  const handleToggleBlockUser = async (targetUserId: string, explicitBlock?: boolean) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          targetUserId,
          block: explicitBlock,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('tg_current_user_id', data.user.id);
        } else if (data.blockedUsers) {
          const updated = { ...currentUser, blockedUsers: data.blockedUsers };
          setCurrentUser(updated);
          localStorage.setItem('tg_current_user_id', updated.id);
        }
        await fetchUsers();
        await fetchChats(currentUser.id);
      }
    } catch (e) {
      console.error('Error blocking/unblocking user:', e);
    }
  };

  const handleBatchBlockUsers = async (chatIds: string[]) => {
    if (!currentUser) return;
    try {
      await fetch('/api/chats/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatIds, isMuted: true }),
      });
      fetchChats(currentUser.id);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Start Direct Chat with a user
  const handleStartDirectChat = async (targetUser: User) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/chats/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUserId: currentUser.id,
          targetUserId: targetUser.id,
          type: 'direct',
        }),
      });
      if (res.ok) {
        const newChat = await res.json();
        const enrichedChat = {
          ...newChat,
          name: targetUser.name || newChat.name,
          username: targetUser.username || newChat.username,
          isVerified: targetUser.isVerified ?? newChat.isVerified,
          badgeColor: targetUser.badgeColor ?? newChat.badgeColor,
          customBadge: targetUser.customBadge ?? newChat.customBadge,
          avatar: targetUser.avatar || newChat.avatar,
          color: targetUser.color || newChat.color,
          bio: targetUser.bio || newChat.bio,
          phone: targetUser.phone || newChat.phone,
          isOnline: targetUser.isOnline ?? newChat.isOnline,
          lastSeen: targetUser.lastSeen || newChat.lastSeen,
        };
        await fetchChats(currentUser.id);
        setActiveChat(enrichedChat);
      }
    } catch (e) {
      console.error('Error creating chat:', e);
    }
  };

  // Handle Create Group Chat (Supports both simple and full settings from NewGroupModal)
  const handleCreateGroupChat = async (
    groupData: {
      name: string;
      participantIds: string[];
      avatar?: string;
      color?: string;
      autoDeleteTimer?: string;
      permissions?: any;
      groupType?: 'private' | 'public';
      publicUsername?: string;
      description?: string;
    } | string,
    maybeParticipants?: string[]
  ) => {
    if (!currentUser) return;
    try {
      let body: any;
      if (typeof groupData === 'string') {
        body = {
          currentUserId: currentUser.id,
          name: groupData,
          type: 'group',
          participants: maybeParticipants || [],
        };
      } else {
        body = {
          currentUserId: currentUser.id,
          name: groupData.name,
          type: 'group',
          participants: groupData.participantIds,
          avatar: groupData.avatar,
          color: groupData.color,
          autoDeleteTimer: groupData.autoDeleteTimer,
          permissions: groupData.permissions,
          groupType: groupData.groupType,
          publicUsername: groupData.publicUsername,
          description: groupData.description,
        };
      }
      const res = await fetch('/api/chats/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const groupChat = await res.json();
        await fetchChats(currentUser.id);
        setActiveChat(groupChat);
      }
    } catch (e) {
      console.error('Error creating group:', e);
    }
  };

  // Handle Update Group (Settings, Permissions, Links, Appearance, etc.)
  const handleUpdateGroup = async (chatId: string, updates: Partial<Chat>) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/chats/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          userId: currentUser.id,
          ...updates,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchChats(currentUser.id);
        if (data.chat) {
          setActiveChat((prev) => (prev && prev.id === chatId ? { ...prev, ...data.chat } : prev));
        }
      }
    } catch (e) {
      console.error('Error updating group:', e);
    }
  };

  // Handle Delete Group
  const handleDeleteGroup = async (chatId: string) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      await fetchChats(currentUser.id);
      if (activeChat?.id === chatId) {
        setActiveChat(null);
      }
    } catch (e) {
      console.error('Error deleting group:', e);
    }
  };

  // Handle Add Members To Group
  const handleAddMembersToGroup = async (chatId: string, participantIds: string[]) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/chats/add-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          userId: currentUser.id,
          participantIds,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchChats(currentUser.id);
        if (data.chat) {
          setActiveChat((prev) => (prev && prev.id === chatId ? { ...prev, ...data.chat } : prev));
        }
      }
    } catch (e) {
      console.error('Error adding members to group:', e);
    }
  };

  // Handle Leave Group
  const handleLeaveGroup = async (chatId: string) => {
    if (!currentUser) return;
    try {
      await fetch('/api/chats/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          userId: currentUser.id,
        }),
      });
      await fetchChats(currentUser.id);
      if (activeChat?.id === chatId) {
        setActiveChat(null);
      }
    } catch (e) {
      console.error('Error leaving group:', e);
    }
  };

  // Handle Open Saved Messages
  const handleOpenSavedMessages = () => {
    const savedChat = chats.find((c) => c.type === 'saved');
    if (savedChat) {
      setActiveChat(savedChat);
    } else {
      // Fallback
      setActiveChat({
        id: `chat-saved-${currentUser?.id}`,
        type: 'saved',
        name: 'Pesan Tersimpan',
        color: '#5288c1',
        participants: [currentUser?.id || ''],
        folder: 'all',
        unreadCount: 0,
      });
    }
  };

  // Handle Update Profile
  const handleUpdateProfile = async (updated: Partial<User>) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          ...updated,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        await fetchUsers();
      }
    } catch (e) {
      console.error('Error updating profile:', e);
    }
  };

  // Handle Status Emoji update
  const handleSelectStatusEmoji = async (emoji: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          statusEmoji: emoji,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id="telegram-app-root" className="w-full h-screen bg-[#0e1621] text-slate-100 flex overflow-hidden font-sans select-none">
      
      {/* Main Layout: Responsive Split View */}
      <div className="w-full h-full flex relative">
        
        {/* Left Pane: Chat List or Archived Chats View (Visible on mobile when no active chat, or always visible on md+) */}
        <div
          className={`w-full md:w-[360px] lg:w-[380px] h-full shrink-0 border-r border-[#101921] ${
            activeChat ? 'hidden md:block' : 'block'
          }`}
        >
          {currentUser && (
            isArchivedViewOpen ? (
              <ArchivedChatsView
                chats={chats}
                onSelectChat={(chat) => handleSelectChat(chat)}
                onBack={() => setIsArchivedViewOpen(false)}
                currentUser={currentUser}
                onUnarchiveChats={handleBatchUnarchiveChats}
                onMuteChats={handleBatchMuteChats}
                onDeleteChats={handleBatchDeleteChats}
                onPinChats={handleBatchPinChats}
                onMarkChatsRead={handleBatchMarkChatsRead}
                onClearChatHistory={handleBatchClearChatHistory}
              />
            ) : (
              <ChatList
                chats={chats}
                activeChatId={activeChat?.id || null}
                onSelectChat={(chat) => handleSelectChat(chat)}
                onOpenDrawer={() => setIsDrawerOpen(true)}
                onOpenNewChat={() => setIsNewChatOpen(true)}
                onOpenArchivedChats={() => setIsArchivedViewOpen(true)}
                currentUser={currentUser}
                allUsers={allUsers}
                onStartDirectChat={handleStartDirectChat}
                onViewContactProfile={(target) => setViewingContact(target)}
                onMuteChats={handleBatchMuteChats}
                onArchiveChats={handleBatchArchiveChats}
                onDeleteChats={handleBatchDeleteChats}
                onPinChats={handleBatchPinChats}
                onRemoveFromFolder={handleBatchRemoveFromFolder}
                onMarkChatsRead={handleBatchMarkChatsRead}
                onClearChatHistory={handleBatchClearChatHistory}
                onBlockUsers={handleBatchBlockUsers}
                onStartCall={(user, callType) => handleStartCall(user, callType || 'audio')}
                onOpenCalls={() => setIsCallsOpen(true)}
                onOpenUpdates={() => setIsUpdatesOpen(true)}
                onRefreshUsers={() => fetchUsers(currentUser?.id)}
              />
            )
          )}
        </div>

        {/* Right Pane: Active Chat Conversation or Empty Placeholder */}
        <div
          className={`flex-1 h-full ${
            activeChat ? 'block' : 'hidden md:flex'
          }`}
        >
          {activeChat && currentUser ? (
            <ChatView
              chat={activeChat}
              currentUser={currentUser}
              allUsers={allUsers}
              chats={chats}
              onBack={() => handleSelectChat(null)}
              onSendMessage={handleSendMessage}
              onReactMessage={handleReactMessage}
              onDeleteMessage={handleDeleteMessage}
              onDeleteMessages={handleDeleteMessages}
              onForwardMessages={handleForwardMessages}
              onForwardToUser={handleForwardToUser}
              onToggleBlockUser={handleToggleBlockUser}
              onUpdateGroup={handleUpdateGroup}
              onDeleteGroup={handleDeleteGroup}
              onAddMembers={handleAddMembersToGroup}
              onLeaveGroup={handleLeaveGroup}
              onJoinedGroup={(joinedChat) => {
                fetchChats(currentUser.id);
                handleSelectChat(joinedChat);
              }}
              onDeleteChat={(chatId, deleteForBoth) => handleBatchDeleteChats([chatId], deleteForBoth)}
              onStartCall={(targetUser, callType) => handleStartCall(targetUser, callType || 'audio')}
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#0e1621] relative"
              style={{
                backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            >
              <div className="max-w-sm p-7 rounded-[24px] bg-[#17212b] border border-[#242f3d] backdrop-blur-md shadow-2xl space-y-4 text-slate-100">
                <div className="w-16 h-16 rounded-full bg-[#5288c1] text-white mx-auto flex items-center justify-center shadow-lg shadow-[#5288c1]/25">
                  <Send className="w-8 h-8 -ml-0.5 mt-0.5 transform -rotate-12" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Telegram</h3>
                  <p className="text-xs text-[#7f91a4] leading-relaxed">
                    Pilih obrolan dari daftar di sebelah kiri atau tulis pesan baru untuk mulai berkomunikasi.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => setIsNewChatOpen(true)}
                    className="w-full py-3 bg-[#5288c1] hover:bg-[#4374a8] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#5288c1]/25 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Mulai Obrolan Baru</span>
                  </button>
                  <button
                    onClick={() => setIsFeaturesOpen(true)}
                    className="w-full py-2.5 bg-[#242f3d] hover:bg-[#313d4f] text-slate-200 font-semibold text-xs rounded-xl transition-all cursor-pointer border border-[#313d4f]"
                  >
                    Pelajari Fitur Telegram
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Side Navigation Drawer (Screenshot 2 exact match) */}
      {currentUser && (
        <SidebarDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          currentUser={currentUser}
          allUsers={allUsers}
          onSwitchUser={handleSwitchUser}
          onOpenAddAccount={() => setIsAuthOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenStatusEmoji={() => setIsStatusEmojiOpen(true)}
          onOpenWallet={() => setIsWalletOpen(true)}
          onOpenNewGroup={() => setIsNewGroupOpen(true)}
          onOpenContacts={() => setIsContactsModalOpen(true)}
          onOpenCalls={() => setIsCallsOpen(true)}
          onOpenSavedMessages={handleOpenSavedMessages}
          onOpenSettings={() => setIsProfileOpen(true)}
          onOpenChatSettings={() => {
            setChatSettingsOpenedFrom('drawer');
            setIsChatSettingsOpen(true);
          }}
          onOpenInvite={() => alert('Undang teman dengan tautan t.me/' + currentUser.username)}
          onOpenFeatures={() => setIsFeaturesOpen(true)}
          onLogout={handleLogout}
        />
      )}

      {/* Authentication Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          if (!currentUser && allUsers.length > 0) {
            const defaultUser = allUsers.find((u) => u.username === 'nabilassihidiqi') || allUsers[0];
            setCurrentUser(defaultUser);
            localStorage.setItem('tg_current_user_id', defaultUser.id);
            fetchChats(defaultUser.id);
          }
          setIsAuthOpen(false);
        }}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem('tg_current_user_id', user.id);
          setIsAuthOpen(false);
          fetchUsers();
          fetchChats(user.id);
        }}
        existingUsers={allUsers}
      />

      {/* Chat Settings Modal */}
      <ChatSettingsModal
        isOpen={isChatSettingsOpen}
        onClose={() => {
          setIsChatSettingsOpen(false);
          if (chatSettingsOpenedFrom === 'profile') {
            setIsProfileOpen(true);
          } else if (chatSettingsOpenedFrom === 'drawer') {
            setIsDrawerOpen(true);
          }
          setChatSettingsOpenedFrom(null);
        }}
      />

      {/* New Chat / Contacts / Create Group Modal */}
      {currentUser && (
        <NewChatModal
          isOpen={isNewChatOpen}
          onClose={() => setIsNewChatOpen(false)}
          users={allUsers}
          currentUser={currentUser}
          onStartDirectChat={handleStartDirectChat}
          onCreateGroupChat={handleCreateGroupChat}
          onOpenNewGroupModal={() => setIsNewGroupOpen(true)}
          onViewContactProfile={(target) => {
            setIsNewChatOpen(false);
            setViewingContact(target);
          }}
        />
      )}

      {/* Telegram 2-Step New Group Creation Modal */}
      {currentUser && (
        <NewGroupModal
          isOpen={isNewGroupOpen}
          onClose={() => setIsNewGroupOpen(false)}
          users={allUsers}
          currentUser={currentUser}
          onCreateGroup={async (data) => {
            await handleCreateGroupChat(data);
          }}
        />
      )}

      {/* Global Contact Profile Modal for inspected users */}
      {currentUser && viewingContact && (() => {
        const liveContact = allUsers.find((u) => u.id === viewingContact.id || u.username === viewingContact.username) || viewingContact;
        const masked = getMaskedContact(liveContact, currentUser.id);
        const isAdminBlocked = Boolean(liveContact.isBlocked || liveContact.isAdminBlocked || masked.name === 'Akun Tidak Ditemukan');
        const isBlockedBy = Boolean(
          masked.isBlockedBy ||
          (liveContact.blockedUsers && liveContact.blockedUsers.includes(currentUser.id))
        );
        const isBlocked = Boolean(currentUser.blockedUsers?.includes(liveContact.id));
        return (
          <ContactProfileModal
            isOpen={!!viewingContact}
            onClose={() => setViewingContact(null)}
            contact={{
              id: masked.id,
              name: isAdminBlocked ? 'Akun Tidak Ditemukan' : masked.name,
              username: isAdminBlocked || isBlockedBy ? undefined : masked.username,
              phone: isAdminBlocked || isBlockedBy ? undefined : masked.phone,
              bio: isAdminBlocked ? 'Akun tidak ditemukan atau telah ditangguhkan.' : (isBlockedBy ? undefined : masked.bio),
              avatar: isAdminBlocked || isBlockedBy ? '' : masked.avatar,
              color: masked.color || '#5288c1',
              isOnline: isAdminBlocked || isBlockedBy ? false : masked.isOnline,
              lastSeen: isAdminBlocked || isBlockedBy ? 'terakhir dilihat lama sekali' : masked.lastSeen,
              isVerified: isAdminBlocked ? false : masked.isVerified,
              isBlocked,
              isAdminBlocked,
              isBlockedBy,
              privacyCalls: masked.privacyCalls,
              privacyVoiceMessages: masked.privacyVoiceMessages,
            }}
            onToggleBlock={() => handleToggleBlockUser(liveContact.id)}
            onStartChat={() => {
              const target = liveContact;
              setViewingContact(null);
              handleStartDirectChat(target);
            }}
            onStartSecretChat={() => {
              const target = liveContact;
              setViewingContact(null);
              handleStartDirectChat(target);
            }}
            onStartCall={(video) => {
              handleStartCall(liveContact as User, video ? 'video' : 'audio');
            }}
            onUpdateContactName={(newName) => {
              setViewingContact((prev) => (prev ? { ...prev, name: newName } : null));
              setAllUsers((prev) =>
                prev.map((u) => (u.id === liveContact.id ? { ...u, name: newName } : u))
              );
            }}
          />
        );
      })()}

      {/* Profile & Settings Modal */}
      {currentUser && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          allUsers={allUsers}
          onUpdateProfile={handleUpdateProfile}
          onToggleBlockUser={handleToggleBlockUser}
          onOpenChatSettings={() => {
            setChatSettingsOpenedFrom('profile');
            setIsChatSettingsOpen(true);
          }}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            localStorage.setItem('tg_current_user_id', user.id);
            setIsProfileOpen(false);
            fetchUsers();
            fetchChats(user.id);
          }}
          onStartChatWithUsername={async (username) => {
            const target = allUsers.find((u) => u.username === username);
            if (target) {
              await handleStartDirectChat(target);
              setIsProfileOpen(false);
            } else {
              alert(`Pengguna @${username} tidak ditemukan.`);
            }
          }}
        />
      )}

      {/* Status Emoji Picker Modal */}
      {currentUser && (
        <StatusEmojiModal
          isOpen={isStatusEmojiOpen}
          onClose={() => setIsStatusEmojiOpen(false)}
          currentUser={currentUser}
          onSelectEmoji={handleSelectStatusEmoji}
        />
      )}

      {/* Telegram Wallet Modal */}
      {currentUser && (
        <WalletModal
          isOpen={isWalletOpen}
          onClose={() => setIsWalletOpen(false)}
          currentUser={currentUser}
        />
      )}

      {/* Calls Log & Contacts Picker Modal */}
      <CallsModal
        isOpen={isCallsOpen}
        onClose={() => setIsCallsOpen(false)}
        currentUser={currentUser || undefined}
        users={allUsers}
        onStartCall={(user, callType) => handleStartCall(user, callType || 'audio')}
        onRefreshUsers={() => fetchUsers(currentUser?.id)}
      />

      {/* Contacts Manager Modal */}
      {currentUser && (
        <ContactsModal
          isOpen={isContactsModalOpen}
          onClose={() => setIsContactsModalOpen(false)}
          currentUser={currentUser}
          users={allUsers}
          onStartDirectChat={handleStartDirectChat}
          onStartCall={(user, callType) => handleStartCall(user, callType || 'audio')}
          onViewContactProfile={(target) => setViewingContact(target)}
          onRefreshUsers={() => fetchUsers(currentUser?.id)}
        />
      )}

      {/* Updates / Stories / Channels Modal */}
      <UpdatesModal
        isOpen={isUpdatesOpen}
        onClose={() => setIsUpdatesOpen(false)}
        currentUser={currentUser || undefined}
        allUsers={allUsers}
      />

      {/* Telegram Features Modal */}
      <FeaturesModal
        isOpen={isFeaturesOpen}
        onClose={() => setIsFeaturesOpen(false)}
      />

      {/* Real-Time WebRTC Active Call Screen & Floating PiP Modal */}
      {currentUser && activeCall && (
        <ActiveCallModal
          callState={activeCall}
          currentUser={currentUser}
          onEndCall={(duration, status) => {
            setActiveCall(null);
            setIsCallMinimized(false);
            fetchChats(currentUser.id);
          }}
          onAnswerCall={() => {
            setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
          }}
          onRejectCall={() => {
            setActiveCall(null);
            setIsCallMinimized(false);
            fetchChats(currentUser.id);
          }}
          isMinimized={isCallMinimized}
          onToggleMinimize={setIsCallMinimized}
          incomingAnswer={incomingAnswer}
          incomingIceCandidate={incomingIceCandidate}
          incomingRenegotiateOffer={incomingRenegotiateOffer}
          incomingRenegotiateAnswer={incomingRenegotiateAnswer}
          incomingMediaUpdate={incomingMediaUpdate}
          remoteEnded={remoteCallEnded}
          remoteRejected={remoteCallRejected}
        />
      )}

    </div>
  );
}
