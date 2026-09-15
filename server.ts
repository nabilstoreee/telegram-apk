import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { initializeApp as initFirebaseClient } from "firebase/app";
import { 
  getFirestore as getFirestoreClient, 
  initializeFirestore,
  collection, 
  doc, 
  writeBatch, 
  getDocs,
  deleteDoc,
  setDoc,
  setLogLevel
} from "firebase/firestore";

interface UserRecord {
  id: string;
  username: string;
  password?: string;
  name: string;
  phone: string;
  avatar?: string;
  color: string;
  bio: string;
  statusEmoji?: string;
  isOnline: boolean;
  lastSeen: string;
  isVerified?: boolean;
  isBot?: boolean;
  unreadTotal: number;
  privacyLastSeen?: 'everybody' | 'contacts' | 'nobody';
  privacyPhone?: 'everybody' | 'contacts' | 'nobody';
  privacyUsername?: 'everybody' | 'contacts' | 'nobody';
  privacyProfilePhoto?: 'everybody' | 'contacts' | 'nobody';
  privacyForwards?: 'everybody' | 'contacts' | 'nobody';
  privacyCalls?: 'everybody' | 'contacts' | 'nobody';
  twoStepVerification?: boolean;
  passcodeLock?: boolean;
  passcodePin?: string;
  accountAutoDeleteMonths?: number;
  batterySaver?: boolean;
  autoDownloadMedia?: boolean;
  uiAnimations?: boolean;
  [key: string]: any;
}

interface MessageRecord {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderColor?: string;
  text: string;
  timestamp: string;
  createdAt: number;
  isRead: boolean;
  isPinned?: boolean;
  isEdited?: boolean;
  editedAt?: number;
  deletedForUserIds?: string[];
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
    hasImage?: boolean;
    imageUrl?: string;
    hasVoice?: boolean;
    hasVideo?: boolean;
    videoUrl?: string;
  };
  attachments?: Array<{
    type: 'image' | 'video' | 'voice' | 'file' | 'audio';
    url: string;
    name?: string;
    size?: string;
    duration?: number;
    isHD?: boolean;
    thumbnailUrl?: string;
  }>;
  reactions?: Array<{
    emoji: string;
    count: number;
    users: string[];
  }>;
  callInfo?: {
    type: 'audio' | 'video';
    status: 'completed' | 'missed' | 'declined' | 'cancelled';
    duration: number;
  };
}

interface ChatRecord {
  id: string;
  type: 'direct' | 'group' | 'channel' | 'saved' | 'bot';
  name: string;
  avatar?: string;
  color: string;
  isPinned?: boolean;
  isMuted?: boolean;
  isVerified?: boolean;
  isArchived?: boolean;
  unreadCount: number;
  participants: string[];
  folder: 'all' | 'viral' | 'vip' | 'personal' | 'groups' | 'bots';
  customBadge?: string;
  badgeType?: 'blue' | 'grey' | 'white';
  deletedForUserIds?: string[];
  ownerId?: string;
  admins?: string[];
  description?: string;
  groupType?: 'private' | 'public';
  publicUsername?: string;
  inviteLink?: string;
  customLinks?: any[];
  permissions?: any;
  topicsEnabled?: boolean;
  hideMembers?: boolean;
  noAggressiveAntiSpam?: boolean;
  antiSpam?: boolean;
  recentActions?: any[];
  reactionsType?: 'all' | 'some' | 'none';
  allowedReactions?: string[];
  historyForNewMembers?: 'visible' | 'hidden';
  autoDeleteTimer?: string;
  wallpaper?: string;
  [key: string]: any;
}

export interface CallLogRecord {
  id: string;
  callerId: string;
  calleeId: string;
  callerName: string;
  calleeName: string;
  callerAvatar?: string;
  calleeAvatar?: string;
  callerColor?: string;
  calleeColor?: string;
  type: 'audio' | 'video';
  status: 'completed' | 'missed' | 'declined' | 'cancelled';
  duration: number;
  timestamp: number;
}

export interface StoryRecord {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userColor?: string;
  type: 'photo' | 'text' | 'voice' | 'video';
  text?: string;
  mediaUrl?: string;
  audioDuration?: number;
  videoDuration?: number;
  backgroundGradient?: string;
  fontFamily?: string;
  createdAt: number;
  expiresAt: number;
  viewers: Array<{
    userId: string;
    userName: string;
    userAvatar?: string;
    viewedAt: number;
  }>;
  reactions?: Array<{
    userId: string;
    userName?: string;
    emoji: string;
    createdAt: number;
  }>;
  isArchived?: boolean;
  privacyType?: 'all' | 'contacts' | 'whitelist' | 'blacklist';
  whitelistUserIds?: string[];
  blacklistUserIds?: string[];
}

// Resilient In-Memory and Persistent Data Store with Cloud Firestore
const IS_VERCEL = Boolean(process.env.VERCEL || process.env.NOW_REGION);
const DATA_DIR = IS_VERCEL ? path.join("/tmp", "data") : path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "telegram_db.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (dirErr) {
  console.warn("[Storage] Warning initializing storage directories:", dirErr);
}

// Multer storage for fast binary file uploads
const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 250 * 1024 * 1024 }
});

// Helper to save base64 media data to persistent file on disk
function saveBase64MediaToFile(dataUrl: string, prefix = 'media'): string {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return dataUrl;
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return dataUrl;
    const mimeType = match[1];
    const base64Data = match[2];
    let ext = 'bin';
    if (mimeType.includes('mp4')) ext = 'mp4';
    else if (mimeType.includes('webm')) ext = 'webm';
    else if (mimeType.includes('quicktime') || mimeType.includes('mov')) ext = 'mov';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('ogg')) ext = 'ogg';
    else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) ext = 'mp3';
    else if (mimeType.includes('wav')) ext = 'wav';

    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    return `/api/media/${filename}`;
  } catch (err) {
    console.error('[Storage] Failed to save base64 media to disk:', err);
    return dataUrl;
  }
}

const users: UserRecord[] = [];
let chats: ChatRecord[] = [];
const messages: MessageRecord[] = [];
const callLogs: CallLogRecord[] = [];
const stories: StoryRecord[] = [];

// Administrator configuration variables from environment
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'nabilassihidiqi').toLowerCase().replace(/^@/, '');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nabilassihidiqi';

// Initialize Firebase Client SDK on server side
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firestoreDb: any = null;

try {
  let firebaseConfig: any = null;
  if (fs.existsSync(configPath)) {
    try {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.warn('[Firebase JS SDK] Could not parse firebase-applet-config.json:', e);
    }
  }

  // Resilient fallback for serverless hosting (Vercel/Netlify) if config file not copied to bundle
  if (!firebaseConfig) {
    firebaseConfig = {
      projectId: "gen-lang-client-0184221253",
      appId: "1:4119005247:web:df3379e035d7ccfafa508a",
      apiKey: "AIzaSyC9URH_rdEqhpskYoPxIeCTew54KFWQv9A",
      authDomain: "gen-lang-client-0184221253.firebaseapp.com",
      firestoreDatabaseId: "ai-studio-telegramweb-76581674-b942-4e4b-a0df-5ce6a9cc399d",
      storageBucket: "gen-lang-client-0184221253.firebasestorage.app",
      messagingSenderId: "4119005247",
    };
  }

  if (firebaseConfig) {
    const clientConfig = {
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    };
    const firebaseApp = initFirebaseClient(clientConfig);
    const firestoreSettings = {
      experimentalForceLongPolling: true,
    };
    try {
      if (firebaseConfig.firestoreDatabaseId) {
        firestoreDb = initializeFirestore(firebaseApp, firestoreSettings, firebaseConfig.firestoreDatabaseId);
      } else {
        firestoreDb = initializeFirestore(firebaseApp, firestoreSettings);
      }
    } catch (initErr) {
      if (firebaseConfig.firestoreDatabaseId) {
        firestoreDb = getFirestoreClient(firebaseApp, firebaseConfig.firestoreDatabaseId);
      } else {
        firestoreDb = getFirestoreClient(firebaseApp);
      }
    }
    setLogLevel("silent");
    console.log('[Firebase JS SDK] Successfully initialized Firestore with DB:', firebaseConfig.firestoreDatabaseId || '(default)');
  }
} catch (error) {
  console.error('[Firebase JS SDK] Error initializing:', error);
}

// Sanitize objects to remove undefined values before sending to Firestore
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          sanitized[key] = sanitizeForFirestore(val);
        }
      }
    }
    return sanitized;
  }
  return obj;
}

// Sync in-memory state back to Cloud Firestore
async function syncLocalToFirestore() {
  if (!firestoreDb) return;
  try {
    // 1. Sync Users
    const usersBatch = writeBatch(firestoreDb);
    for (const u of users) {
      const docRef = doc(firestoreDb, 'users', u.id);
      usersBatch.set(docRef, sanitizeForFirestore(u));
    }
    await usersBatch.commit();

    // 2. Sync Chats
    const chatsBatch = writeBatch(firestoreDb);
    for (const c of chats) {
      const docRef = doc(firestoreDb, 'chats', c.id);
      chatsBatch.set(docRef, sanitizeForFirestore(c));
    }
    await chatsBatch.commit();

    // 3. Sync Messages (batch in chunks of 500)
    const messageChunks: MessageRecord[][] = [];
    for (let i = 0; i < messages.length; i += 500) {
      messageChunks.push(messages.slice(i, i + 500));
    }
    for (const chunk of messageChunks) {
      const msgsBatch = writeBatch(firestoreDb);
      for (const m of chunk) {
        const docRef = doc(firestoreDb, 'messages', m.id);
        msgsBatch.set(docRef, sanitizeForFirestore(m));
      }
      await msgsBatch.commit();
    }

    // 4. Sync Call Logs
    const callBatch = writeBatch(firestoreDb);
    for (const cl of callLogs) {
      const docRef = doc(firestoreDb, 'callLogs', cl.id);
      callBatch.set(docRef, sanitizeForFirestore(cl));
    }
    await callBatch.commit();

    // 5. Sync Stories
    const storiesBatch = writeBatch(firestoreDb);
    for (const s of stories) {
      const docRef = doc(firestoreDb, 'stories', s.id);
      storiesBatch.set(docRef, sanitizeForFirestore(s));
    }
    await storiesBatch.commit();

    console.log(`[Firebase] Successfully synchronized ${users.length} users, ${chats.length} chats, ${messages.length} messages, ${callLogs.length} call logs, ${stories.length} stories to Firestore.`);
  } catch (err) {
    console.error('[Firebase] Failed to synchronize state to Firestore:', err);
  }
}

// Helper to delete document from Firestore permanently
async function deleteFirestoreDoc(collectionName: string, docId: string) {
  if (!firestoreDb || !docId || firestoreQuotaExhausted) return;
  try {
    await deleteDoc(doc(firestoreDb, collectionName, docId));
    console.log(`[Firebase] Permanently deleted ${collectionName}/${docId} from Firestore.`);
  } catch (err) {
    console.error(`[Firebase] Error deleting ${collectionName}/${docId} from Firestore:`, err);
  }
}

// Helper to batch delete documents from Firestore permanently
async function deleteFirestoreDocs(collectionName: string, docIds: string[]) {
  if (!firestoreDb || firestoreQuotaExhausted || !Array.isArray(docIds) || docIds.length === 0) return;
  try {
    for (let i = 0; i < docIds.length; i += 500) {
      const chunk = docIds.slice(i, i + 500);
      const batch = writeBatch(firestoreDb);
      for (const id of chunk) {
        batch.delete(doc(firestoreDb, collectionName, id));
      }
      await batch.commit();
    }
    console.log(`[Firebase] Permanently batch deleted ${docIds.length} docs from ${collectionName} in Firestore.`);
  } catch (err) {
    console.error(`[Firebase] Error batch deleting ${collectionName} from Firestore:`, err);
  }
}

// Known stale/previously deleted message IDs to purge permanently
const PURGED_MSG_IDS = [
  "msg-1788323034700-rac8",
  "msg-1788323066926-zrdi",
  "msg-1788323068199-uce2",
  "msg-1788323072896-f5s8"
];

function loadDataFromDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.users)) {
        users.length = 0;
        const resetUsers = parsed.users.map((u: UserRecord) => ({
          ...u,
          isOnline: false,
          lastSeen: u.lastSeen && u.lastSeen !== 'online' ? u.lastSeen : 'terakhir dilihat baru saja'
        }));
        users.push(...resetUsers);
      }
      if (Array.isArray(parsed.chats)) {
        chats.length = 0;
        const dummyNames = ["Blaire.", "Angka jitu hk", "PΛXBΛЯ DΣVΣ—θPΣЯ", "Z5", "PEMERSATU LOKAL OME TV", "PEMERSATU SAGA", "Push Channel", "Akun Terblokir (Contoh)"];
        const cleanChats = parsed.chats
          .filter((c: ChatRecord) => 
            !dummyNames.includes(c.name) && 
            !c.id.startsWith("chat-archived-") && 
            c.id !== "chat-push-channel"
          )
          .map((c: ChatRecord) => ({
            ...c,
            participants: Array.isArray(c.participants) ? c.participants : [],
            deletedForUserIds: Array.isArray(c.deletedForUserIds) ? c.deletedForUserIds : []
          }));
        chats.push(...cleanChats);
      }
      if (Array.isArray(parsed.messages)) {
        messages.length = 0;
        const dummyChatIds = ["chat-archived-1", "chat-archived-2", "chat-archived-3", "chat-archived-4", "chat-archived-5", "chat-archived-6", "chat-push-channel"];
        const cleanMsgs = parsed.messages
          .filter((m: MessageRecord) => 
            !dummyChatIds.includes(m.chatId) &&
            !m.id.startsWith("msg-arch-") &&
            m.id !== "msg-push-1" &&
            !PURGED_MSG_IDS.includes(m.id)
          )
          .map((m: MessageRecord) => {
            if (Array.isArray(m.attachments)) {
              m.attachments = m.attachments.map((att: any) => {
                let url = att.url;
                if (url && typeof url === 'string' && url.startsWith('data:')) {
                  url = saveBase64MediaToFile(url, att.type || 'media');
                }
                let thumbUrl = att.thumbnailUrl;
                if (thumbUrl && typeof thumbUrl === 'string' && thumbUrl.startsWith('data:')) {
                  thumbUrl = saveBase64MediaToFile(thumbUrl, 'thumb');
                }
                return { ...att, url, thumbnailUrl: thumbUrl };
              });
            }
            return m;
          });
        messages.push(...cleanMsgs);
      }
      if (Array.isArray(parsed.callLogs)) {
        callLogs.length = 0;
        callLogs.push(...parsed.callLogs);
      }
      if (Array.isArray(parsed.stories)) {
        stories.length = 0;
        const cleanStories = parsed.stories.filter((st: StoryRecord) => !st.id.startsWith("story-demo-"));
        stories.push(...cleanStories);
      }
    }
  } catch (err) {
    console.error("[Storage] Failed to load local backup from disk:", err);
  }
}

function saveDataToDiskOnly() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = { users, chats, messages, callLogs, stories };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[Storage] Failed to write local fallback backup:", err);
  }
}

let firestoreQuotaExhausted = false;

function saveDataToDisk() {
  saveDataToDiskOnly();
  if (firestoreDb && !firestoreQuotaExhausted) {
    syncLocalToFirestore().catch(err => {
      if (err?.code === 8 || err?.message?.includes('RESOURCE_EXHAUSTED')) {
        firestoreQuotaExhausted = true;
        console.warn('[Firebase] Firestore daily free tier write quota exhausted. Switching to local high-performance storage mode.');
      } else {
        console.error('[Firebase] Failed to run background Firestore sync:', err);
      }
    });
  }
}

// Master initialization
async function initializeDatabase() {
  // Load local data first as fallback
  loadDataFromDisk();

  if (firestoreDb && !firestoreQuotaExhausted) {
    try {
      console.log('[Firebase] Attempting to load data from Firestore...');
      const usersSnap = await getDocs(collection(firestoreDb, 'users'));
      const chatsSnap = await getDocs(collection(firestoreDb, 'chats'));
      const messagesSnap = await getDocs(collection(firestoreDb, 'messages'));
      const callLogsSnap = await getDocs(collection(firestoreDb, 'callLogs')).catch(() => ({ empty: true, forEach: () => {} }));
      const storiesSnap = await getDocs(collection(firestoreDb, 'stories')).catch(() => ({ empty: true, forEach: () => {} }));

      if (usersSnap.empty && chatsSnap.empty) {
        console.log('[Firebase] Firestore collections are empty. Migrating local JSON database to Firestore...');
        await syncLocalToFirestore();
      } else {
        // Merge Users from Firestore
        usersSnap.forEach((doc: any) => {
          const u = doc.data() as UserRecord;
          const idx = users.findIndex(existing => existing.id === u.id);
          const enrichedUser = {
            ...u,
            isOnline: false,
            lastSeen: u.lastSeen && u.lastSeen !== 'online' ? u.lastSeen : 'terakhir dilihat baru saja'
          };
          if (idx >= 0) {
            users[idx] = { ...users[idx], ...enrichedUser };
          } else {
            users.push(enrichedUser);
          }
        });

        // Merge Chats from Firestore
        const dummyNames = ["Blaire.", "Angka jitu hk", "PΛXBΛЯ DΣVΣ—θPΣЯ", "Z5", "PEMERSATU LOKAL OME TV", "PEMERSATU SAGA", "Push Channel", "Akun Terblokir (Contoh)"];
        chatsSnap.forEach((doc: any) => {
          const c = doc.data() as ChatRecord;
          if (!dummyNames.includes(c.name) && !c.id.startsWith("chat-archived-") && c.id !== "chat-push-channel") {
            const enrichedChat = {
              ...c,
              participants: Array.isArray(c.participants) ? c.participants : [],
              deletedForUserIds: Array.isArray(c.deletedForUserIds) ? c.deletedForUserIds : []
            };
            const idx = chats.findIndex(existing => existing.id === c.id);
            if (idx >= 0) {
              chats[idx] = { ...chats[idx], ...enrichedChat };
            } else {
              chats.push(enrichedChat);
            }
          }
        });

        // Merge Messages from Firestore (keeping local disk messages so media is never lost)
        const dummyChatIds = ["chat-archived-1", "chat-archived-2", "chat-archived-3", "chat-archived-4", "chat-archived-5", "chat-archived-6", "chat-push-channel"];
        messagesSnap.forEach((doc: any) => {
          const m = doc.data() as MessageRecord;
          if (!dummyChatIds.includes(m.chatId) && !m.id.startsWith("msg-arch-") && m.id !== "msg-push-1" && !PURGED_MSG_IDS.includes(m.id)) {
            const idx = messages.findIndex(existing => existing.id === m.id);
            if (idx >= 0) {
              messages[idx] = { ...messages[idx], ...m };
            } else {
              messages.push(m);
            }
          }
        });

        // Ensure previously deleted messages are permanently purged from Firestore
        deleteFirestoreDocs('messages', PURGED_MSG_IDS).catch((err) => { if (err?.code === 8 || err?.message?.includes('RESOURCE_EXHAUSTED')) firestoreQuotaExhausted = true; });

        // Merge Call Logs from Firestore
        if (callLogsSnap && !callLogsSnap.empty) {
          callLogsSnap.forEach((doc: any) => {
            const log = doc.data() as CallLogRecord;
            const idx = callLogs.findIndex(existing => existing.id === log.id);
            if (idx >= 0) {
              callLogs[idx] = log;
            } else {
              callLogs.push(log);
            }
          });
        }

        // Merge Stories from Firestore (keeping local disk stories so videos/photos are never lost)
        if (storiesSnap && !storiesSnap.empty) {
          storiesSnap.forEach((doc: any) => {
            const st = doc.data() as StoryRecord;
            if (!st.id.startsWith("story-demo-")) {
              const idx = stories.findIndex(existing => existing.id === st.id);
              if (idx >= 0) {
                stories[idx] = { ...stories[idx], ...st };
              } else {
                stories.push(st);
              }
            }
          });
        }

        // Refresh local disk cache
        saveDataToDiskOnly();
        console.log(`[Firebase] Loaded ${users.length} users, ${chats.length} chats, ${messages.length} messages, ${callLogs.length} call logs, ${stories.length} stories from Cloud Firestore.`);
      }
    } catch (err) {
      console.error('[Firebase] Failed to load data from Firestore, relying on local backup:', err);
    }
  }

  // Ensure admin exists with the current secure environment username and password
  const adminExists = users.some(u => u.username.toLowerCase() === ADMIN_USERNAME);
  if (!adminExists) {
    users.push({
      id: 'user-admin-nabil',
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      name: 'Nabil Assihidiqi',
      phone: '+62 812 3456 7890',
      avatar: '',
      color: '#5288c1',
      bio: 'System Administrator & Developer.',
      isOnline: false,
      lastSeen: 'terakhir dilihat baru saja',
      isVerified: true,
      badgeColor: 'blue',
      unreadTotal: 0
    });
    saveDataToDisk();
    console.log(`[Auth] Seeded admin user @${ADMIN_USERNAME} successfully.`);
  } else {
    // Synchronize credentials to current environment variable settings
    const adminUser = users.find(u => u.username.toLowerCase() === ADMIN_USERNAME);
    if (adminUser) {
      adminUser.password = ADMIN_PASSWORD;
      adminUser.isVerified = true;
      if (!adminUser.badgeColor) {
        adminUser.badgeColor = 'blue';
      }
      saveDataToDisk();
    }
  }

  // Ensure 'user_terblokir' demo is removed if found in active state
  const foundDemoIndex = users.findIndex(u => u.id === 'user-demo-blocked' || u.username === 'user_terblokir');
  if (foundDemoIndex !== -1) {
    users.splice(foundDemoIndex, 1);
    saveDataToDisk();
    console.log('[Clean] Removed user_terblokir demo user on initialization.');
  }

  // Check and clear expired verifications immediately on server boot
  checkAndClearExpiredVerifications();
}

function checkAndClearExpiredVerifications() {
  let changed = false;
  const now = Date.now();
  for (const u of users) {
    if (u.isVerified && u.verifiedUntil && u.verifiedUntil <= now) {
      console.log(`[Verification] Badge terverifikasi untuk @${u.username} telah kedaluwarsa. Mencabut lencana centang.`);
      u.isVerified = false;
      u.badgeColor = null;
      u.verifiedUntil = null;
      changed = true;
      
      // Broadcast verification update to active clients
      broadcast("user_verification_expired", {
        userId: u.id,
        isVerified: false,
        badgeColor: null,
        verifiedUntil: null
      });
    }
  }
  if (changed) {
    saveDataToDisk();
  }
}

function checkAndCleanExpiredStories() {
  const now = Date.now();
  let changed = false;
  for (const s of stories) {
    if (!s.isArchived && s.expiresAt <= now) {
      s.isArchived = true;
      changed = true;
      broadcast('story_deleted', { storyId: s.id });
    }
  }
  if (changed) {
    saveDataToDisk();
  }
}

// Execute database initialization
initializeDatabase();

// Run background verification expiration & story expiration checks every 10-30 seconds
setInterval(() => {
  try {
    checkAndClearExpiredVerifications();
    checkAndCleanExpiredStories();
  } catch (err) {
    console.error('[Interval Checks Error]:', err);
  }
}, 10000);

// Active SSE client connections
const sseClients = new Set<express.Response>();
const userSockets = new Map<string, Set<express.Response>>();

function broadcast(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      if (client.writableEnded || client.destroyed) {
        sseClients.delete(client);
      } else {
        client.write(payload);
      }
    } catch {
      sseClients.delete(client);
    }
  }
}

function sendToUser(userId: string, event: string, data: any) {
  const sockets = userSockets.get(userId);
  if (sockets && sockets.size > 0) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sockets) {
      try {
        if (!client.writableEnded && !client.destroyed) {
          client.write(payload);
        } else {
          sockets.delete(client);
        }
      } catch {
        sockets.delete(client);
      }
    }
  }
}

// Periodic SSE Keep-Alive Heartbeat every 15s
setInterval(() => {
  for (const client of sseClients) {
    try {
      if (client.writableEnded || client.destroyed) {
        sseClients.delete(client);
      } else {
        client.write(": ping\n\n");
      }
    } catch {
      sseClients.delete(client);
    }
  }
}, 15000);

// Global process error safety
process.on("uncaughtException", (err) => {
  console.error("[Process] Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Process] Unhandled Rejection:", reason);
});

export const app = express();
const PORT = 3000;

  // CORS middleware
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Body parsing supporting both standard Express and Vercel serverless functions
  app.use((req, res, next) => {
    if (req.body && typeof req.body === "object") {
      return next();
    }
    express.json({ limit: "250mb" })(req, res, (err) => {
      if (err) return next(err);
      express.urlencoded({ extended: true, limit: "250mb" })(req, res, next);
    });
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", usersCount: users.length, chatsCount: chats.length });
  });

  // Media Upload Endpoint (Multipart Binary / FormData)
  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Tidak ada file yang diunggah" });
    }
    const originalName = req.file.originalname || "file";
    const ext = path.extname(originalName) || ".bin";
    const newFilename = `media-${Date.now()}-${Math.random().toString(36).substr(2, 6)}${ext}`;
    const targetPath = path.join(UPLOADS_DIR, newFilename);

    try {
      fs.renameSync(req.file.path, targetPath);
    } catch (renameErr) {
      // Fallback copy if rename fails across partitions
      fs.copyFileSync(req.file.path, targetPath);
      fs.unlinkSync(req.file.path);
    }

    const isVideo = /\.(mp4|webm|mov|mkv|avi|flv)/i.test(originalName) || (req.file.mimetype && req.file.mimetype.startsWith('video/'));
    const isAudio = /\.(mp3|ogg|wav|m4a|aac)/i.test(originalName) || (req.file.mimetype && req.file.mimetype.startsWith('audio/'));
    const isImage = /\.(jpg|jpeg|png|webp|gif|svg)/i.test(originalName) || (req.file.mimetype && req.file.mimetype.startsWith('image/'));

    return res.json({
      url: `/api/media/${newFilename}`,
      name: originalName,
      size: req.file.size,
      type: isVideo ? 'video' : isAudio ? 'voice' : isImage ? 'image' : 'file',
      mimetype: req.file.mimetype
    });
  });

  // Base64 direct upload endpoint
  app.post("/api/upload/base64", (req, res) => {
    const { dataUrl, type, name } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ error: "dataUrl wajib disertakan" });
    }
    const mediaUrl = saveBase64MediaToFile(dataUrl, type || 'media');
    return res.json({ url: mediaUrl, name: name || 'file' });
  });

  // High-Performance Media Serving with HTTP Range (Partial Content) Support for Video/Audio
  app.get("/api/media/:filename", (req, res) => {
    const filename = req.params.filename;
    const safeFilename = path.basename(filename);
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Media tidak ditemukan" });
    }

    try {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const ext = path.extname(safeFilename).toLowerCase();

      const mimeMap: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
        '.mkv': 'video/x-matroska',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ogg': 'audio/ogg',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
      };

      const contentType = mimeMap[ext] || 'application/octet-stream';
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        });
        file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
        });
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err) {
      console.error('[Media] Error streaming media file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Gagal memuat media" });
      }
    }
  });

  // SSE for Real-time chat streaming & notifications
  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    // Initial keep-alive comment
    res.write(": keepalive\n\n");

    const userId = req.query.userId as string | undefined;
    sseClients.add(res);

    if (userId) {
      let sockets = userSockets.get(userId);
      if (!sockets) {
        sockets = new Set<express.Response>();
        userSockets.set(userId, sockets);
      }
      sockets.add(res);

      const user = users.find(u => u.id === userId);
      if (user && !user.isOnline) {
        user.isOnline = true;
        user.lastSeen = "online";
        saveDataToDisk();
        broadcast("user_status", { userId: user.id, isOnline: true, lastSeen: "online" });
      }
    }

    req.on("close", () => {
      sseClients.delete(res);
      if (userId) {
        const sockets = userSockets.get(userId);
        if (sockets) {
          sockets.delete(res);
          if (sockets.size === 0) {
            userSockets.delete(userId);
            const user = users.find(u => u.id === userId);
            if (user && user.isOnline) {
              user.isOnline = false;
              const now = new Date();
              const hours = String(now.getHours()).padStart(2, '0');
              const minutes = String(now.getMinutes()).padStart(2, '0');
              user.lastSeen = `terakhir dilihat hari ini pukul ${hours}:${minutes}`;
              saveDataToDisk();
              broadcast("user_status", { userId: user.id, isOnline: false, lastSeen: user.lastSeen });
            }
          }
        }
      }
    });
  });

  // 1. Auth: Register
  app.post("/api/auth/register", (req, res) => {
    const { username, password, name, phone, avatar, bio } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: "Username, password, dan nama wajib diisi." });
    }

    const cleanUsername = String(username).toLowerCase().replace(/^@/, "").trim();
    const existing = users.find(u => u.username.toLowerCase() === cleanUsername);
    if (existing) {
      return res.status(400).json({ error: `Username @${cleanUsername} sudah digunakan, silakan pilih username lain.` });
    }

    const colors = ["#e17076", "#6c78e6", "#4fae4e", "#cca042", "#a855f7", "#ec4899", "#0284c7"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser: UserRecord = {
      id: `user-${Date.now()}`,
      username: cleanUsername,
      password: String(password).trim(),
      name: name.trim(),
      phone: phone?.trim() || `+62 ${Math.floor(100000000 + Math.random() * 900000000)}`,
      avatar: avatar || "",
      color: randomColor,
      bio: bio || "Hey there! I am using Telegram.",
      isOnline: true,
      lastSeen: "online",
      unreadTotal: 0
    };

    users.push(newUser);

    // Create a personal Saved Messages chat for the new user if not exists
    const existingSaved = chats.find(c => c.type === 'saved' && c.participants.includes(newUser.id));
    if (!existingSaved) {
      const savedChat: ChatRecord = {
        id: `chat-saved-${newUser.id}`,
        type: "saved",
        name: "Pesan Tersimpan",
        color: "#5288c1",
        participants: [newUser.id],
        folder: "all",
        unreadCount: 0,
        isPinned: true
      };
      chats.unshift(savedChat);
    }

    saveDataToDisk();
    console.log(`[Auth:Register] User @${cleanUsername} registered successfully (Total users: ${users.length})`);

    broadcast("user_joined", { user: newUser });

    const { password: _, ...safeUser } = newUser;
    return res.json({ success: true, user: safeUser, message: `Akun @${cleanUsername} berhasil didaftarkan.` });
  });

  // 2. Auth: Login
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password wajib diisi." });
    }

    const cleanUsername = String(username).toLowerCase().replace(/^@/, "").trim();
    const cleanPassword = String(password).trim();
    const user = users.find(u => u.username.toLowerCase() === cleanUsername);

    if (!user) {
      return res.status(404).json({ error: `Akun "@${cleanUsername}" tidak terdaftar. Silakan daftar di tab Register.` });
    }

    if (user.password && String(user.password).trim() !== cleanPassword) {
      return res.status(401).json({ error: "Password salah. Periksa kembali password Anda." });
    }

    // Check if user is blocked by admin
    if (user.isBlocked || user.isAdminBlocked) {
      const now = Date.now();
      const hasExpired = Boolean(user.blockExpiresAt && now > user.blockExpiresAt);

      if (hasExpired) {
        user.isBlocked = false;
        user.isAdminBlocked = false;
        user.blockReason = undefined;
        user.blockExpiresAt = undefined;
        user.blockedAt = undefined;
        saveDataToDisk();
      } else {
        return res.status(403).json({
          error: `Mohon maaf, akun Anda ditangguhkan oleh Administrator karena: ${user.blockReason || "Melanggar aturan komunitas."}`
        });
      }
    }

    user.isOnline = true;
    user.lastSeen = "online";
    saveDataToDisk();
    console.log(`[Auth:Login] User @${cleanUsername} logged in successfully.`);

    broadcast("user_status", { userId: user.id, isOnline: true, lastSeen: "online" });

    const { password: _, ...safeUser } = user;
    return res.json({ success: true, user: safeUser });
  });

  // 2.1 Admin: Get all users
  app.get("/api/admin/users", (req, res) => {
    const adminUsername = (req.query.adminUsername as string || '').toLowerCase().replace(/^@/, '');
    const admin = users.find(u => u.username.toLowerCase() === adminUsername);
    if (!admin || admin.username.toLowerCase() !== ADMIN_USERNAME) {
      return res.status(403).json({ error: "Akses ditolak. Hanya admin utama yang diizinkan." });
    }
    const safeUsers = users.map(({ password, ...u }) => u);
    return res.json({ success: true, users: safeUsers });
  });

  // 2.2 Admin: Block user (permanent or temporary by years/months/days)
  app.post("/api/admin/users/block", (req, res) => {
    const { adminUsername, targetUserId, isPermanent, years = 0, months = 0, days = 0, reason } = req.body;
    const cleanAdmin = String(adminUsername || '').toLowerCase().replace(/^@/, '');
    const admin = users.find(u => u.username.toLowerCase() === cleanAdmin);
    if (!admin || admin.username.toLowerCase() !== ADMIN_USERNAME) {
      return res.status(403).json({ error: `Akses ditolak. Hanya admin @${ADMIN_USERNAME} yang dapat memblokir pengguna.` });
    }

    const targetUser = users.find(u => u.id === targetUserId || u.username.toLowerCase() === String(targetUserId).toLowerCase().replace(/^@/, ''));
    if (!targetUser) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    }

    if (targetUser.username.toLowerCase() === ADMIN_USERNAME) {
      return res.status(400).json({ error: "Tidak dapat memblokir akun Administrator utama." });
    }

    const isPerm = isPermanent === true || isPermanent === 'true' || isPermanent === 1 || isPermanent === '1';
    const cleanReason = String(reason || '').trim() || 'Nyepam berlebihan, aktivitas tidak wajar, atau kata-kata tidak pantas.';

    targetUser.isBlocked = true;
    targetUser.isAdminBlocked = true;
    targetUser.blockReason = cleanReason;
    targetUser.blockedAt = Date.now();

    if (isPerm) {
      targetUser.blockExpiresAt = null;
    } else {
      let numYears = Number(years) || 0;
      let numMonths = Number(months) || 0;
      let numDays = Number(days) || 0;
      if (numYears === 0 && numMonths === 0 && numDays === 0) {
        numMonths = 1;
      }
      const now = new Date();
      if (numYears > 0) now.setFullYear(now.getFullYear() + numYears);
      if (numMonths > 0) now.setMonth(now.getMonth() + numMonths);
      if (numDays > 0) now.setDate(now.getDate() + numDays);
      targetUser.blockExpiresAt = now.getTime();
    }

    saveDataToDisk();
    console.log(`[Admin] User @${targetUser.username} blocked. Permanent: ${isPerm}, Expires: ${targetUser.blockExpiresAt}, Reason: ${targetUser.blockReason}`);

    const isTemp = Boolean(targetUser.blockExpiresAt && targetUser.blockExpiresAt > Date.now());
    broadcast("user_blocked", {
      userId: targetUser.id,
      username: targetUser.username,
      name: targetUser.name,
      isBlocked: true,
      reason: targetUser.blockReason,
      blockedAt: targetUser.blockedAt,
      blockExpiresAt: targetUser.blockExpiresAt,
      isPermanent: !isTemp
    });

    const { password: _, ...safeTarget } = targetUser;
    return res.json({ success: true, user: safeTarget, message: `Pengguna @${targetUser.username} berhasil diblokir.` });
  });

  // 2.3 Admin: Unblock user
  app.post("/api/admin/users/unblock", (req, res) => {
    const { adminUsername, targetUserId } = req.body;
    const cleanAdmin = String(adminUsername || '').toLowerCase().replace(/^@/, '');
    const admin = users.find(u => u.username.toLowerCase() === cleanAdmin);
    if (!admin || admin.username.toLowerCase() !== ADMIN_USERNAME) {
      return res.status(403).json({ error: "Akses ditolak." });
    }

    const targetUser = users.find(u => u.id === targetUserId || u.username.toLowerCase() === String(targetUserId).toLowerCase().replace(/^@/, ''));
    if (!targetUser) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    }

    targetUser.isBlocked = false;
    targetUser.isAdminBlocked = false;
    targetUser.blockReason = undefined;
    targetUser.blockExpiresAt = undefined;
    targetUser.blockedAt = undefined;

    saveDataToDisk();
    console.log(`[Admin] User @${targetUser.username} unblocked.`);

    broadcast("user_blocked", {
      userId: targetUser.id,
      isBlocked: false
    });

    const { password: _, ...safeTarget } = targetUser;
    return res.json({ success: true, user: safeTarget, message: `Blokir untuk @${targetUser.username} telah dicabut.` });
  });

  // 2.4 Admin: Grant/revoke verification badge
  app.post("/api/admin/users/grant-verification", (req, res) => {
    const { adminUsername, targetUserId, isVerified, badgeColor = 'blue', duration = 'permanent' } = req.body;
    const cleanAdmin = String(adminUsername || '').toLowerCase().replace(/^@/, '');
    const admin = users.find(u => u.username.toLowerCase() === cleanAdmin);
    if (!admin || admin.username.toLowerCase() !== ADMIN_USERNAME) {
      return res.status(403).json({ error: "Akses ditolak. Hanya admin utama yang diizinkan." });
    }

    const targetUser = users.find(u => u.id === targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    }

    const setVerified = isVerified === true || isVerified === 'true';

    if (!setVerified) {
      // Revoking verification
      targetUser.isVerified = false;
      targetUser.badgeColor = null;
      targetUser.verifiedUntil = null;
    } else {
      // Granting verification
      targetUser.isVerified = true;
      targetUser.badgeColor = badgeColor || 'blue';

      let verifiedUntil: number | null = null;
      if (duration !== 'permanent') {
        const now = new Date();
        if (duration === '1d') {
          now.setDate(now.getDate() + 1);
          verifiedUntil = now.getTime();
        } else if (duration === '1w') {
          now.setDate(now.getDate() + 7);
          verifiedUntil = now.getTime();
        } else if (duration === '1m') {
          now.setMonth(now.getMonth() + 1);
          verifiedUntil = now.getTime();
        } else if (duration === '1y') {
          now.setFullYear(now.getFullYear() + 1);
          verifiedUntil = now.getTime();
        } else if (duration === '2y') {
          now.setFullYear(now.getFullYear() + 2);
          verifiedUntil = now.getTime();
        }
      }
      targetUser.verifiedUntil = verifiedUntil;
    }

    saveDataToDisk();
    console.log(`[Admin] User @${targetUser.username} verification updated. Verified: ${targetUser.isVerified}, Color: ${targetUser.badgeColor}, Until: ${targetUser.verifiedUntil}`);

    // Broadcast update
    broadcast("user_verification_updated", {
      userId: targetUser.id,
      isVerified: targetUser.isVerified,
      badgeColor: targetUser.badgeColor,
      verifiedUntil: targetUser.verifiedUntil
    });

    const { password: _, ...safeTarget } = targetUser;
    return res.json({ success: true, user: safeTarget, message: `Status verifikasi @${targetUser.username} berhasil diperbarui.` });
  });

  // 2b. Auth: Logout
  app.post("/api/auth/logout", (req, res) => {
    const { userId, lastSeen } = req.body;
    if (userId) {
      userSockets.delete(userId);
      const user = users.find(u => u.id === userId);
      if (user) {
        user.isOnline = false;
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        user.lastSeen = lastSeen || `terakhir dilihat hari ini pukul ${hours}:${minutes}`;
        saveDataToDisk();
        broadcast("user_status", { userId: user.id, isOnline: false, lastSeen: user.lastSeen });
        console.log(`[Auth:Logout] User @${user.username} logged out (${user.lastSeen})`);
      }
    }
    return res.json({ success: true });
  });

  // 2c. Auth: Delete Account Permanently
  app.delete("/api/users/account", (req, res) => {
    const userId = req.body?.userId || (req.query?.userId as string);
    if (!userId) {
      return res.status(400).json({ error: "User ID wajib disertakan." });
    }

    const index = users.findIndex(u => u.id === userId);
    if (index === -1) {
      return res.status(404).json({ error: "Akun tidak ditemukan atau sudah dihapus." });
    }

    const deletedUser = users[index];
    users.splice(index, 1);
    userSockets.delete(userId);

    // Remove saved chats for this user and clean up direct messages/participants
    chats = chats.filter(c => {
      if (c.type === 'saved' && c.participants.includes(userId)) return false;
      return true;
    });

    saveDataToDisk();
    deleteFirestoreDoc('users', deletedUser.id);
    console.log(`[Auth:Delete] User @${deletedUser.username} (${deletedUser.id}) dihapus secara permanen.`);

    broadcast("user_deleted", { userId: deletedUser.id });
    return res.json({ success: true, message: `Akun @${deletedUser.username} berhasil dihapus secara permanen.` });
  });

  // Delete contact / user
  const handleDeleteContact = (req: express.Request, res: express.Response) => {
    const targetUserId = req.params.id;
    if (!targetUserId) {
      return res.status(400).json({ error: "User ID wajib disertakan." });
    }
    const index = users.findIndex(u => u.id === targetUserId);
    if (index === -1) {
      return res.status(404).json({ error: "Kontak tidak ditemukan." });
    }
    const deletedUser = users[index];
    users.splice(index, 1);
    userSockets.delete(targetUserId);
    saveDataToDisk();
    deleteFirestoreDoc('users', deletedUser.id);
    broadcast("user_deleted", { userId: deletedUser.id });
    return res.json({ success: true, message: `Kontak ${deletedUser.name} (@${deletedUser.username}) berhasil dihapus.` });
  };

  app.delete("/api/users/:id", handleDeleteContact);
  app.delete("/api/contacts/:id", handleDeleteContact);

  // Batch delete contacts (select multiple with checkboxes or delete all)
  app.post("/api/contacts/batch-delete", (req, res) => {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const { contactIds, deleteAll, currentUserId } = body || {};

    if (deleteAll) {
      const toDelete = users.filter(u => u.id !== currentUserId);
      const count = toDelete.length;
      toDelete.forEach(deletedUser => {
        const idx = users.findIndex(u => u.id === deletedUser.id);
        if (idx !== -1) users.splice(idx, 1);
        userSockets.delete(deletedUser.id);
        deleteFirestoreDoc('users', deletedUser.id);
        broadcast("user_deleted", { userId: deletedUser.id });
      });
      saveDataToDisk();
      return res.json({ success: true, count, message: `${count} kontak berhasil dihapus.` });
    }

    if (Array.isArray(contactIds) && contactIds.length > 0) {
      let count = 0;
      contactIds.forEach((cId: string) => {
        if (cId === currentUserId) return;
        const idx = users.findIndex(u => u.id === cId);
        if (idx !== -1) {
          const deletedUser = users[idx];
          users.splice(idx, 1);
          userSockets.delete(cId);
          deleteFirestoreDoc('users', deletedUser.id);
          broadcast("user_deleted", { userId: deletedUser.id });
          count++;
        }
      });
      saveDataToDisk();
      return res.json({ success: true, count, message: `${count} kontak berhasil dihapus.` });
    }

    return res.status(400).json({ error: "Permintaan batch delete tidak valid." });
  });

  // 2c. Update Online / Offline Presence (Tab switch, window close, beacon)
  app.post("/api/users/presence", (req, res) => {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const { userId, isOnline, lastSeen } = body || {};
    if (userId) {
      const user = users.find(u => u.id === userId);
      if (user) {
        user.isOnline = Boolean(isOnline);
        if (isOnline) {
          user.lastSeen = "online";
        } else {
          user.lastSeen = lastSeen || `terakhir dilihat hari ini pukul ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
        }
        saveDataToDisk();
        broadcast("user_status", { userId: user.id, isOnline: user.isOnline, lastSeen: user.lastSeen });
      }
    }
    return res.json({ success: true });
  });

// Helper function to check privacy rules including always / never exceptions
function checkPrivacyAllowed(
  setting: 'everybody' | 'contacts' | 'nobody' | undefined,
  exceptionGroup: { always?: string[]; never?: string[] } | undefined,
  targetUserId?: string,
  viewerUserId?: string
): boolean {
  if (!viewerUserId || !targetUserId || viewerUserId === targetUserId) {
    return true;
  }
  // 1. Blacklist / Jangan Bagikan Dengan takes highest priority
  if (exceptionGroup?.never && exceptionGroup.never.includes(viewerUserId)) {
    return false;
  }
  // 2. Whitelist / Selalu Berbagi Dengan overrides restrictive base setting
  if (exceptionGroup?.always && exceptionGroup.always.includes(viewerUserId)) {
    return true;
  }
  // 3. Base setting
  const effectiveSetting = setting || 'everybody';
  if (effectiveSetting === 'everybody') return true;
  if (effectiveSetting === 'nobody') return false;
  if (effectiveSetting === 'contacts') return true;
  return true;
}

  // 3. Get All Users (for Kontak, Search, & Multi-account switcher)
  app.get("/api/users", (req, res) => {
    const currentUserId = req.query.userId as string;
    const currentUserObj = currentUserId ? users.find(u => u.id === currentUserId) : null;
    const safeUsers = users.map(({ password, ...u }) => {
      const isPersonalBlocked = Boolean(
        currentUserObj?.blockedUsers && (
          currentUserObj.blockedUsers.includes(u.id) ||
          (u.username && currentUserObj.blockedUsers.includes(u.username)) ||
          (u.name && currentUserObj.blockedUsers.includes(u.name))
        )
      );
      const isBlockedBy = Boolean(
        u.blockedUsers && (
          u.blockedUsers.includes(currentUserId) ||
          (currentUserObj?.username && u.blockedUsers.includes(currentUserObj.username)) ||
          (currentUserObj?.name && u.blockedUsers.includes(currentUserObj.name))
        )
      );

      const masked: any = { ...u };
      const isAdminBlocked = Boolean(u.isBlocked || u.isAdminBlocked);
      masked.isAdminBlocked = isAdminBlocked;
      masked.isPersonalBlocked = isPersonalBlocked;
      masked.isBlockedBy = isBlockedBy;
      masked.isBlocked = Boolean(isAdminBlocked || isPersonalBlocked);
      masked.blockReason = u.blockReason;
      masked.blockedAt = u.blockedAt;
      masked.blockExpiresAt = u.blockExpiresAt;

      if (isAdminBlocked) {
        if (currentUserId && u.id !== currentUserId) {
          masked.name = 'Akun Tidak Ditemukan';
          masked.username = '';
          masked.phone = 'Disembunyikan';
          masked.bio = 'Akun tidak ditemukan atau telah ditangguhkan.';
          masked.avatar = '';
          masked.isOnline = false;
          masked.lastSeen = 'terakhir dilihat lama sekali';
        }
      } else if (currentUserId && u.id !== currentUserId) {
        const exceptions = (u.privacyExceptions || {}) as Record<string, { always?: string[]; never?: string[] }>;
        const photoEx = exceptions.privacyProfilePhoto || exceptions.privacy_profile_photo;
        const phoneEx = exceptions.privacyPhone || exceptions.privacy_phone;
        const usernameEx = exceptions.privacyUsername || exceptions.privacy_username;
        const lastSeenEx = exceptions.privacyLastSeen || exceptions.privacy_last_seen;
        const bioEx = exceptions.privacyBio || exceptions.privacy_bio;

        const canSeePhoto = !isBlockedBy && checkPrivacyAllowed(u.privacyProfilePhoto, photoEx, u.id, currentUserId);
        const canSeePhone = !isBlockedBy && checkPrivacyAllowed(u.privacyPhone, phoneEx, u.id, currentUserId);
        const canSeeUsername = !isBlockedBy && checkPrivacyAllowed(u.privacyUsername, usernameEx, u.id, currentUserId);
        const canSeeLastSeen = !isBlockedBy && checkPrivacyAllowed(u.privacyLastSeen, lastSeenEx, u.id, currentUserId);
        const canSeeBio = !isBlockedBy && checkPrivacyAllowed(u.privacyBio, bioEx, u.id, currentUserId);

        if (isBlockedBy) {
          masked.phone = 'Disembunyikan';
          masked.username = '';
          masked.bio = undefined;
          masked.avatar = "";
          masked.isOnline = false;
          masked.lastSeen = 'terakhir dilihat lama sekali';
        } else {
          if (!canSeePhoto) masked.avatar = "";
          if (!canSeePhone) masked.phone = 'Disembunyikan';
          if (!canSeeUsername) masked.username = '';
          if (!canSeeLastSeen) {
            masked.isOnline = false;
            masked.lastSeen = 'terakhir dilihat lama sekali';
          }
          if (!canSeeBio) {
            masked.bio = undefined;
          }
        }
      }
      return masked;
    });
    return res.json(safeUsers);
  });

  app.post("/api/users/profile", (req, res) => {
    const { 
      userId, name, username, bio, phone, avatar, statusEmoji, badgeColor,
      privacyLastSeen, privacyPhone, privacyUsername, privacyProfilePhoto, privacyForwards, privacyCalls,
      privacyVoiceMessages, privacyMessaging, privacyBirthday, privacyGifts, privacyBio,
      privacySavedMusic, privacyInvites, autoDeleteMessagesTimer, passkeyEnabled, loginEmail,
      blockedUsers, activeDevicesCount, archiveAndMuteUnknown, syncContacts, suggestFrequentContacts,
      mapProvider, secretChatLinkPreviews,
      twoStepVerification, passcodeLock, passcodePin, accountAutoDeleteMonths,
      batterySaver, autoDownloadMedia, uiAnimations,
      autoDownloadCellular, autoDownloadWiFi, autoDownloadRoaming,
      saveToGalleryPrivate, saveToGalleryGroups, saveToGalleryChannels,
      streamMedia, lessDataForCalls, useProxy, useProxyForCalls,
      keepMediaPrivate, keepMediaGroups, keepMediaChannels, keepMediaStories,


      powerSavingModePercent, animStickerKeyboard, animStickerChat, animEmojiKeyboard, animEmojiReactions, animEmojiChat,
      effectChatRotation, effectChatTopic, effectChatSpoiler, effectChatBlur, effectChatLiquid, effectChatZoom, effectChatDust,
      animCalls, autoPlayVideo, autoPlayGIF, effectParticles, smoothTransitions,

      notifAllAccounts, notifPrivateChats, notifGroups, notifChannels, notifStories, notifReactions,
      callsVibrate, callsRingtone, badgeShow, badgeIncludeMuted, badgeCountUnread,
      inAppSounds, inAppVibrate, inAppPreview, inChatSounds, inAppPopup,
      eventContactJoined, eventPinnedMessage, otherKeepAlive, otherBackgroundConn, notifRepeat,
      privacyExceptions, hideReadTime, privacyStatusView
    } = req.body;
    const user = users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

    if (name) {
      user.name = name;
      stories.forEach(s => {
        if (s.userId === user.id) s.userName = name;
      });
    }
    if (username !== undefined) {
      const cleanUsername = String(username).trim().replace(/^@/, '');
      if (cleanUsername) {
        // Check if username is already taken by another user
        const existing = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.id !== userId);
        if (existing) {
          return res.status(400).json({ error: "Username sudah digunakan oleh pengguna lain." });
        }
        user.username = cleanUsername;
      }
    }
    if (bio !== undefined) user.bio = bio;
    if (phone) user.phone = phone;
    if (avatar !== undefined) {
      user.avatar = avatar;
      stories.forEach(s => {
        if (s.userId === user.id) s.userAvatar = avatar;
      });
      // Sync latest avatar to callLogs
      callLogs.forEach(cl => {
        if (cl.callerId === user.id) cl.callerAvatar = avatar;
        if (cl.calleeId === user.id) cl.calleeAvatar = avatar;
      });
    }
    if (statusEmoji !== undefined) user.statusEmoji = statusEmoji;
    if (badgeColor !== undefined) user.badgeColor = badgeColor;
    if (privacyLastSeen !== undefined) user.privacyLastSeen = privacyLastSeen;
    if (privacyPhone !== undefined) user.privacyPhone = privacyPhone;
    if (privacyUsername !== undefined) user.privacyUsername = privacyUsername;
    if (privacyProfilePhoto !== undefined) user.privacyProfilePhoto = privacyProfilePhoto;
    if (privacyForwards !== undefined) user.privacyForwards = privacyForwards;
    if (privacyCalls !== undefined) user.privacyCalls = privacyCalls;
    if (privacyExceptions !== undefined) user.privacyExceptions = privacyExceptions;
    if (hideReadTime !== undefined) user.hideReadTime = hideReadTime;
    if (privacyStatusView !== undefined) user.privacyStatusView = privacyStatusView;
    
    // New fields
    if (privacyVoiceMessages !== undefined) user.privacyVoiceMessages = privacyVoiceMessages;
    if (privacyMessaging !== undefined) user.privacyMessaging = privacyMessaging;
    if (privacyBirthday !== undefined) user.privacyBirthday = privacyBirthday;
    if (privacyGifts !== undefined) user.privacyGifts = privacyGifts;
    if (privacyBio !== undefined) user.privacyBio = privacyBio;
    if (privacySavedMusic !== undefined) user.privacySavedMusic = privacySavedMusic;
    if (privacyInvites !== undefined) user.privacyInvites = privacyInvites;
    if (autoDeleteMessagesTimer !== undefined) user.autoDeleteMessagesTimer = autoDeleteMessagesTimer;
    if (passkeyEnabled !== undefined) user.passkeyEnabled = passkeyEnabled;
    if (loginEmail !== undefined) user.loginEmail = loginEmail;
    if (blockedUsers !== undefined) user.blockedUsers = blockedUsers;
    if (activeDevicesCount !== undefined) user.activeDevicesCount = activeDevicesCount;
    if (archiveAndMuteUnknown !== undefined) user.archiveAndMuteUnknown = archiveAndMuteUnknown;
    if (syncContacts !== undefined) user.syncContacts = syncContacts;
    if (suggestFrequentContacts !== undefined) user.suggestFrequentContacts = suggestFrequentContacts;
    if (mapProvider !== undefined) user.mapProvider = mapProvider;
    if (secretChatLinkPreviews !== undefined) user.secretChatLinkPreviews = secretChatLinkPreviews;

    if (twoStepVerification !== undefined) user.twoStepVerification = twoStepVerification;
    if (passcodeLock !== undefined) user.passcodeLock = passcodeLock;
    if (passcodePin !== undefined) user.passcodePin = passcodePin;
    if (accountAutoDeleteMonths !== undefined) user.accountAutoDeleteMonths = accountAutoDeleteMonths;
    if (batterySaver !== undefined) user.batterySaver = batterySaver;
    if (autoDownloadMedia !== undefined) user.autoDownloadMedia = autoDownloadMedia;
    if (req.body.uploadMediaQuality !== undefined) user.uploadMediaQuality = req.body.uploadMediaQuality;
    if (req.body.autoDownloadQuality !== undefined) user.autoDownloadQuality = req.body.autoDownloadQuality;

    if (autoDownloadCellular !== undefined) user.autoDownloadCellular = autoDownloadCellular;
    if (autoDownloadWiFi !== undefined) user.autoDownloadWiFi = autoDownloadWiFi;
    if (autoDownloadRoaming !== undefined) user.autoDownloadRoaming = autoDownloadRoaming;
    if (saveToGalleryPrivate !== undefined) user.saveToGalleryPrivate = saveToGalleryPrivate;
    if (saveToGalleryGroups !== undefined) user.saveToGalleryGroups = saveToGalleryGroups;
    if (saveToGalleryChannels !== undefined) user.saveToGalleryChannels = saveToGalleryChannels;
    if (streamMedia !== undefined) user.streamMedia = streamMedia;
    if (lessDataForCalls !== undefined) user.lessDataForCalls = lessDataForCalls;
    if (useProxy !== undefined) user.useProxy = useProxy;
    if (useProxyForCalls !== undefined) user.useProxyForCalls = useProxyForCalls;

    if (keepMediaPrivate !== undefined) user.keepMediaPrivate = keepMediaPrivate;
    if (keepMediaGroups !== undefined) user.keepMediaGroups = keepMediaGroups;
    if (keepMediaChannels !== undefined) user.keepMediaChannels = keepMediaChannels;
    if (keepMediaStories !== undefined) user.keepMediaStories = keepMediaStories;


    if (uiAnimations !== undefined) user.uiAnimations = uiAnimations;

    
    if (powerSavingModePercent !== undefined) user.powerSavingModePercent = powerSavingModePercent;
    if (animStickerKeyboard !== undefined) user.animStickerKeyboard = animStickerKeyboard;
    if (animStickerChat !== undefined) user.animStickerChat = animStickerChat;
    if (animEmojiKeyboard !== undefined) user.animEmojiKeyboard = animEmojiKeyboard;
    if (animEmojiReactions !== undefined) user.animEmojiReactions = animEmojiReactions;
    if (animEmojiChat !== undefined) user.animEmojiChat = animEmojiChat;
    if (effectChatRotation !== undefined) user.effectChatRotation = effectChatRotation;
    if (effectChatTopic !== undefined) user.effectChatTopic = effectChatTopic;
    if (effectChatSpoiler !== undefined) user.effectChatSpoiler = effectChatSpoiler;
    if (effectChatBlur !== undefined) user.effectChatBlur = effectChatBlur;
    if (effectChatLiquid !== undefined) user.effectChatLiquid = effectChatLiquid;
    if (effectChatZoom !== undefined) user.effectChatZoom = effectChatZoom;
    if (effectChatDust !== undefined) user.effectChatDust = effectChatDust;
    if (animCalls !== undefined) user.animCalls = animCalls;
    if (autoPlayVideo !== undefined) user.autoPlayVideo = autoPlayVideo;
    if (autoPlayGIF !== undefined) user.autoPlayGIF = autoPlayGIF;
    if (effectParticles !== undefined) user.effectParticles = effectParticles;
    if (smoothTransitions !== undefined) user.smoothTransitions = smoothTransitions;

    if (notifAllAccounts !== undefined) user.notifAllAccounts = notifAllAccounts;
    if (notifPrivateChats !== undefined) user.notifPrivateChats = notifPrivateChats;
    if (notifGroups !== undefined) user.notifGroups = notifGroups;
    if (notifChannels !== undefined) user.notifChannels = notifChannels;
    if (notifStories !== undefined) user.notifStories = notifStories;
    if (notifReactions !== undefined) user.notifReactions = notifReactions;
    if (callsVibrate !== undefined) user.callsVibrate = callsVibrate;
    if (callsRingtone !== undefined) user.callsRingtone = callsRingtone;
    if (badgeShow !== undefined) user.badgeShow = badgeShow;
    if (badgeIncludeMuted !== undefined) user.badgeIncludeMuted = badgeIncludeMuted;
    if (badgeCountUnread !== undefined) user.badgeCountUnread = badgeCountUnread;
    if (inAppSounds !== undefined) user.inAppSounds = inAppSounds;
    if (inAppVibrate !== undefined) user.inAppVibrate = inAppVibrate;
    if (inAppPreview !== undefined) user.inAppPreview = inAppPreview;
    if (inChatSounds !== undefined) user.inChatSounds = inChatSounds;
    if (inAppPopup !== undefined) user.inAppPopup = inAppPopup;
    if (eventContactJoined !== undefined) user.eventContactJoined = eventContactJoined;
    if (eventPinnedMessage !== undefined) user.eventPinnedMessage = eventPinnedMessage;
    if (otherKeepAlive !== undefined) user.otherKeepAlive = otherKeepAlive;
    if (otherBackgroundConn !== undefined) user.otherBackgroundConn = otherBackgroundConn;
    if (notifRepeat !== undefined) user.notifRepeat = notifRepeat;

    if (avatar !== undefined) {
      user.avatar = avatar;
      // Sync latest avatar to callLogs
      callLogs.forEach(cl => {
        if (cl.callerId === user.id) cl.callerAvatar = avatar;
        if (cl.calleeId === user.id) cl.calleeAvatar = avatar;
      });
    }

    saveDataToDisk();
    broadcast("user_updated", { user });
    broadcast("users_updated", { userId: user.id, user, blockedUsers: user.blockedUsers });
    broadcast("chats_updated", {});
    broadcast("call_history_updated", { userId: user.id });
    const { password: _, ...safeUser } = user;
    return res.json({ success: true, user: safeUser });
  });

  app.put("/api/users/:id", (req, res) => {
    const userId = req.params.id;
    const user = users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

    Object.assign(user, req.body);
    saveDataToDisk();
    broadcast("user_updated", { user });
    broadcast("users_updated", { userId: user.id, user, blockedUsers: user.blockedUsers });
    const { password: _, ...safeUser } = user;
    return res.json({ success: true, user: safeUser });
  });

  // 4b. Toggle Block User
  app.post("/api/users/block", (req, res) => {
    const { userId, targetUserId, block } = req.body;
    if (!userId || !targetUserId) {
      return res.status(400).json({ error: "userId dan targetUserId wajib diisi." });
    }
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan." });
    }
    user.blockedUsers = Array.isArray(user.blockedUsers) ? user.blockedUsers : [];

    const cleanTarget = String(targetUserId).trim();
    const cleanNoAt = cleanTarget.replace(/^@/, '');
    const targetUserObj = users.find(u => 
      u.id === cleanTarget || 
      u.id === cleanNoAt ||
      (u.username && (u.username.toLowerCase() === cleanNoAt.toLowerCase() || `@${u.username.toLowerCase()}` === cleanTarget.toLowerCase())) ||
      (u.name && u.name.toLowerCase() === cleanTarget.toLowerCase())
    );

    const matchSet = new Set<string>([
      cleanTarget.toLowerCase(),
      cleanNoAt.toLowerCase(),
      `@${cleanNoAt.toLowerCase()}`
    ]);

    if (targetUserObj) {
      matchSet.add(targetUserObj.id.toLowerCase());
      if (targetUserObj.username) {
        matchSet.add(targetUserObj.username.toLowerCase());
        matchSet.add(`@${targetUserObj.username.toLowerCase()}`);
      }
      if (targetUserObj.name) {
        matchSet.add(targetUserObj.name.toLowerCase());
      }
    }

    const isCurrentlyBlocked = user.blockedUsers.some(id => matchSet.has(String(id).toLowerCase()));
    const shouldBlock = block !== undefined ? Boolean(block) : !isCurrentlyBlocked;

    if (shouldBlock) {
      const idToAdd = targetUserObj ? targetUserObj.id : cleanTarget;
      if (!user.blockedUsers.includes(idToAdd)) {
        user.blockedUsers.push(idToAdd);
      }
    } else {
      user.blockedUsers = user.blockedUsers.filter(id => !matchSet.has(String(id).toLowerCase()));
    }
    saveDataToDisk();
    broadcast("users_updated", { userId, blockedUsers: user.blockedUsers });
    broadcast("chats_updated", {});
    const { password: _, ...safeUser } = user;
    return res.json({ success: true, user: safeUser, blockedUsers: user.blockedUsers, isBlocked: shouldBlock });
  });

  // 5. Get Chats for Current User
  app.get("/api/chats", (req, res) => {
    const userId = (req.query.userId as string);
    if (!userId) {
      return res.status(400).json({ error: "userId parameter is required" });
    }

    // Ensure user has exactly one saved chat and cleanup any duplicates
    const savedChats = chats.filter(c => c.type === 'saved' && c.participants && c.participants.includes(userId));
    if (savedChats.length === 0) {
      chats.unshift({
        id: `chat-saved-${userId}`,
        type: "saved",
        name: "Pesan Tersimpan",
        color: "#5288c1",
        participants: [userId],
        folder: "all",
        unreadCount: 0,
        isPinned: true,
        deletedForUserIds: []
      });
      saveDataToDisk();
    } else if (savedChats.length > 1) {
      const keepId = savedChats[0].id;
      chats = chats.filter(c => c.type !== 'saved' || (!c.participants.includes(userId) || c.id === keepId));
      saveDataToDisk();
    }

    // STRICT USER ISOLATION: Only return chats where this user is in participants AND this user has not deleted it
    const userChats = chats
      .filter(c => Array.isArray(c.participants) && c.participants.includes(userId) && (!c.deletedForUserIds || !c.deletedForUserIds.includes(userId)))
      .map(c => {
        // Find last message for this chat (ignoring messages deleted for this user)
        const chatMsgs = messages.filter(m => m.chatId === c.id && (!m.deletedForUserIds || !m.deletedForUserIds.includes(userId)));
        const lastMsg = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : undefined;
        const unreadCount = chatMsgs.filter(m => m.senderId !== userId && !m.isRead).length;

        // For direct chats, adjust name/avatar if chatting with other participant
        let displayName = c.name;
        let displayAvatar = c.avatar;
        let displayColor = c.color;
        let displayUsername = undefined;
        let displayPhone = undefined;
        let displayBio = undefined;
        let isVerified = c.isVerified;
        let badgeColor = (c as any).badgeColor;
        let isOnline = false;
        let lastSeen = "";

        if (c.type === "direct") {
          const otherParticipantId = c.participants.find(p => p !== userId) || c.participants[0];
          const otherUser = users.find(u => u.id === otherParticipantId);
          const currentUserObj = users.find(u => u.id === userId);
          if (otherUser) {
            const isAdminBlocked = Boolean(otherUser.isBlocked);
            const isBlockedBy = Boolean(
              otherUser.blockedUsers && (
                otherUser.blockedUsers.includes(userId) ||
                (currentUserObj?.username && otherUser.blockedUsers.includes(currentUserObj.username)) ||
                (currentUserObj?.name && otherUser.blockedUsers.includes(currentUserObj.name))
              )
            );
            const isBlocked = Boolean(
              currentUserObj?.blockedUsers && (
                currentUserObj.blockedUsers.includes(otherUser.id) ||
                (otherUser.username && currentUserObj.blockedUsers.includes(otherUser.username)) ||
                (otherUser.name && currentUserObj.blockedUsers.includes(otherUser.name))
              )
            );

            if (isAdminBlocked) {
              displayName = 'Akun Tidak Ditemukan';
              displayAvatar = '';
              displayUsername = '';
              displayPhone = 'Disembunyikan';
              displayBio = 'Akun tidak ditemukan atau telah ditangguhkan.';
              isOnline = false;
              lastSeen = 'terakhir dilihat lama sekali';
            } else {
              const exceptions = (otherUser.privacyExceptions || {}) as Record<string, { always?: string[]; never?: string[] }>;
              const photoEx = exceptions.privacyProfilePhoto || exceptions.privacy_profile_photo;
              const phoneEx = exceptions.privacyPhone || exceptions.privacy_phone;
              const usernameEx = exceptions.privacyUsername || exceptions.privacy_username;
              const lastSeenEx = exceptions.privacyLastSeen || exceptions.privacy_last_seen;
              const bioEx = exceptions.privacyBio || exceptions.privacy_bio;

              const canSeePhoto = !isBlockedBy && checkPrivacyAllowed(otherUser.privacyProfilePhoto, photoEx, otherUser.id, userId);
              const canSeePhone = !isBlockedBy && checkPrivacyAllowed(otherUser.privacyPhone, phoneEx, otherUser.id, userId);
              const canSeeUsername = !isBlockedBy && checkPrivacyAllowed(otherUser.privacyUsername, usernameEx, otherUser.id, userId);
              const canSeeLastSeen = !isBlockedBy && checkPrivacyAllowed(otherUser.privacyLastSeen, lastSeenEx, otherUser.id, userId);
              const canSeeBio = !isBlockedBy && checkPrivacyAllowed(otherUser.privacyBio, bioEx, otherUser.id, userId);

              displayName = otherUser.name;
              displayAvatar = canSeePhoto ? otherUser.avatar : '';
              displayColor = otherUser.color;
              displayUsername = isBlockedBy || !canSeeUsername ? '' : otherUser.username;
              displayPhone = canSeePhone ? otherUser.phone : 'Disembunyikan';
              displayBio = canSeeBio ? otherUser.bio : undefined;
              isVerified = otherUser.isVerified;
              badgeColor = otherUser.badgeColor;
              isOnline = canSeeLastSeen ? otherUser.isOnline : false;
              lastSeen = canSeeLastSeen ? otherUser.lastSeen : 'terakhir dilihat lama sekali';
            }

            return {
              ...c,
              unreadCount: unreadCount > 0 ? unreadCount : (c.unreadCount || 0),
              name: displayName,
              username: displayUsername,
              phone: displayPhone,
              bio: displayBio,
              isVerified: isAdminBlocked ? false : isVerified,
              badgeColor: isAdminBlocked ? null : badgeColor,
              avatar: displayAvatar,
              color: displayColor,
              isOnline,
              lastSeen,
              isBlockedBy,
              isBlocked: isBlocked || isAdminBlocked,
              isAdminBlocked,
              lastMessage: lastMsg ? {
                text: lastMsg.text || (lastMsg.attachments?.some(a => a.type === 'video') ? 'Video' : (lastMsg.attachments?.some(a => a.type === 'image') ? 'Foto' : (lastMsg.attachments?.some(a => a.type === 'voice') ? 'Pesan suara' : ''))),
                senderName: lastMsg.senderName,
                timestamp: lastMsg.timestamp,
                createdAt: lastMsg.createdAt,
                isRead: lastMsg.isRead,
                isOutgoing: lastMsg.senderId === userId,
                hasVoice: lastMsg.attachments?.some(a => a.type === 'voice'),
                hasImage: lastMsg.attachments?.some(a => a.type === 'image'),
                hasVideo: lastMsg.attachments?.some(a => a.type === 'video')
              } : undefined
            };
          }
        }

        return {
          ...c,
          unreadCount: unreadCount > 0 ? unreadCount : (c.unreadCount || 0),
          name: displayName,
          username: displayUsername,
          phone: displayPhone,
          bio: displayBio,
          isVerified,
          badgeColor,
          avatar: displayAvatar,
          color: displayColor,
          isOnline,
          lastSeen,
          lastMessage: lastMsg ? {
            text: lastMsg.text || (lastMsg.attachments?.some(a => a.type === 'video') ? 'Video' : (lastMsg.attachments?.some(a => a.type === 'image') ? 'Foto' : (lastMsg.attachments?.some(a => a.type === 'voice') ? 'Pesan suara' : ''))),
            senderName: lastMsg.senderName,
            timestamp: lastMsg.timestamp,
            createdAt: lastMsg.createdAt,
            isRead: lastMsg.isRead,
            isOutgoing: lastMsg.senderId === userId,
            hasVoice: lastMsg.attachments?.some(a => a.type === 'voice'),
            hasImage: lastMsg.attachments?.some(a => a.type === 'image'),
            hasVideo: lastMsg.attachments?.some(a => a.type === 'video')
          } : undefined
        };
      });

    return res.json(userChats);
  });

  // 6. Create or Get Direct Chat with another user
  app.post("/api/chats/create", (req, res) => {
    const { 
      currentUserId, 
      targetUserId, 
      type, 
      name, 
      avatar, 
      color,
      description,
      autoDeleteTimer,
      groupType,
      publicUsername,
      permissions,
      appearance,
      reactionsMode,
      allowedReactions,
      topicsEnabled,
      topicsLayout,
      chatHistoryVisibility,
      antiSpamAggressive,
      hideMembers,
      approveNewMembers,
      restrictContentSaving
    } = req.body;

    if (!currentUserId) {
      return res.status(400).json({ error: "currentUserId is required" });
    }

    const creatorUser = users.find(u => u.id === currentUserId);
    if (creatorUser && creatorUser.isBlocked) {
      return res.status(403).json({ error: "Akun Anda telah diblokir oleh Administrator.", isBlocked: true });
    }

    if (type === "direct" && targetUserId) {
      const targetUserObj = users.find(u => u.id === targetUserId || u.username === targetUserId);
      if (targetUserObj && targetUserObj.isBlocked) {
        return res.status(403).json({ error: "Akun ini telah ditangguhkan atau tidak dapat dihubungi.", isBlocked: true });
      }
    }

    if (type === "group") {
      const inviteToken = Math.random().toString(36).substring(2, 9) + Math.random().toString(36).substring(2, 9);
      const newGroup: ChatRecord = {
        id: `chat-group-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: "group",
        name: name || "Grup Baru",
        avatar: avatar || "",
        color: color || "#4fae4e",
        description: description || "",
        participants: [currentUserId, ...(req.body.participants || [])],
        ownerId: currentUserId,
        adminIds: [currentUserId],
        folder: "groups",
        unreadCount: 0,
        deletedForUserIds: [],
        groupType: groupType || 'private',
        publicUsername: publicUsername || undefined,
        inviteLink: `https://t.me/+${inviteToken}`,
        customLinks: [
          {
            id: `link-${Date.now()}`,
            link: `https://t.me/+${inviteToken}`,
            name: "Tautan Utama",
            createdAt: Date.now(),
            usesCount: 0
          }
        ],
        chatHistoryVisibility: chatHistoryVisibility || 'visible',
        topicsEnabled: topicsEnabled || false,
        topicsLayout: topicsLayout || 'tabs',
        reactionsMode: reactionsMode || 'all',
        allowedReactions: allowedReactions || ['❤️', '👍', '👎', '🔥', '🥰', '👏', '😁'],
        permissions: permissions || {
          sendText: true,
          sendMedia: {
            photos: true,
            videos: true,
            stickersGifs: true,
            music: true,
            files: true,
            voiceNotes: true,
            videoNotes: true,
            embeddedLinks: true,
            polls: true,
          },
          addMembers: true,
          pinMessages: true,
          changeChatInfo: true,
          starsPerMessage: { enabled: false, stars: 1 },
          slowMode: 0,
          unrestrictBoosters: true,
          boosterMinLevel: 1,
          blockedMembers: []
        },
        appearance: appearance || {
          color: color || '#4fae4e',
          logoLevel: 0,
          emojiPack: '',
          statusEmoji: '',
          backgroundWallpaper: '',
          boostLevel: 0,
          totalBoosts: 0
        },
        antiSpamAggressive: antiSpamAggressive || false,
        hideMembers: hideMembers || false,
        approveNewMembers: approveNewMembers || false,
        restrictContentSaving: restrictContentSaving || false,
        autoDeleteTimer: autoDeleteTimer || 0
      };

      chats.unshift(newGroup);

      // Create initial group system message
      const creatorUser = users.find(u => u.id === currentUserId);
      const creatorName = creatorUser ? creatorUser.name : "Anda";
      const welcomeMsg: MessageRecord = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        chatId: newGroup.id,
        senderId: "system",
        senderName: "Telegram",
        text: `${creatorName} membuat grup "${newGroup.name}"`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now(),
        isRead: true
      };
      messages.push(welcomeMsg);

      saveDataToDisk();
      broadcast("chat_created", { chat: newGroup, participantIds: newGroup.participants });
      broadcast("message_received", { message: welcomeMsg });
      return res.json(newGroup);
    }

    if (!targetUserId) {
      return res.status(400).json({ error: "targetUserId is required for direct chat" });
    }

    // Direct chat - look for existing chat between exactly these two users
    const existing = chats.find(c =>
      c.type === "direct" &&
      Array.isArray(c.participants) &&
      c.participants.includes(currentUserId) &&
      c.participants.includes(targetUserId)
    );

    if (existing) {
      // Un-delete if either participant had previously hidden it
      if (existing.deletedForUserIds && existing.deletedForUserIds.length > 0) {
        existing.deletedForUserIds = existing.deletedForUserIds.filter(id => id !== currentUserId && id !== targetUserId);
        saveDataToDisk();
      }
      const targetUser = users.find(u => u.id === targetUserId);
      const enrichedExisting = {
        ...existing,
        name: targetUser ? targetUser.name : existing.name,
        username: targetUser?.username || existing.username,
        isVerified: targetUser ? Boolean(targetUser.isVerified) : existing.isVerified,
        badgeColor: targetUser?.badgeColor || (existing as any).badgeColor,
        avatar: targetUser?.avatar || existing.avatar,
        color: targetUser?.color || existing.color,
        bio: targetUser?.bio || existing.bio,
        phone: targetUser?.phone || existing.phone,
        isOnline: targetUser?.isOnline,
        lastSeen: targetUser?.lastSeen,
      };
      return res.json(enrichedExisting);
    }

    const targetUser = users.find(u => u.id === targetUserId);
    const newChat: ChatRecord = {
      id: `chat-direct-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: "direct",
      name: targetUser ? targetUser.name : "Pengguna",
      avatar: targetUser?.avatar || "",
      color: targetUser?.color || "#5288c1",
      participants: [currentUserId, targetUserId],
      folder: "personal",
      unreadCount: 0,
      deletedForUserIds: []
    };

    chats.unshift(newChat);
    saveDataToDisk();
    broadcast("chat_created", { chat: newChat, participantIds: [currentUserId, targetUserId] });
    
    const enrichedNewChat = {
      ...newChat,
      username: targetUser?.username || "",
      isVerified: Boolean(targetUser?.isVerified),
      badgeColor: targetUser?.badgeColor || null,
      bio: targetUser?.bio,
      phone: targetUser?.phone,
      isOnline: targetUser?.isOnline,
      lastSeen: targetUser?.lastSeen,
    };
    return res.json(enrichedNewChat);
  });

  // Group Details Update Endpoint
  app.post("/api/chats/update", (req, res) => {
    const { chatId, userId, ...updates } = req.body;
    if (!chatId) return res.status(400).json({ error: "chatId is required" });

    const chat = chats.find(c => c.id === chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    // Apply allowed updates
    Object.assign(chat, updates);
    saveDataToDisk();

    broadcast("chat_updated", { chat });
    broadcast("chats_updated", { chatIds: [chatId] });
    return res.json({ success: true, chat });
  });

  // Add members to group
  app.post("/api/chats/add-members", (req, res) => {
    const { chatId, participantIds } = req.body;
    if (!chatId || !Array.isArray(participantIds)) {
      return res.status(400).json({ error: "chatId and participantIds required" });
    }

    const chat = chats.find(c => c.id === chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    if (!Array.isArray(chat.participants)) {
      chat.participants = [];
    }

    const newParticipants: string[] = [];
    participantIds.forEach(id => {
      if (!chat.participants.includes(id)) {
        chat.participants.push(id);
        newParticipants.push(id);
      }
    });

    // Post system message for added members
    if (newParticipants.length > 0) {
      const addedNames = users
        .filter(u => newParticipants.includes(u.id))
        .map(u => u.name)
        .join(", ");

      const sysMsg: MessageRecord = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        chatId: chat.id,
        senderId: "system",
        senderName: "Telegram",
        text: `${addedNames || "Anggota baru"} bergabung ke grup`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now(),
        isRead: true
      };
      messages.push(sysMsg);
      broadcast("message_received", { message: sysMsg });
    }

    saveDataToDisk();
    broadcast("chat_updated", { chat });
    broadcast("chats_updated", { chatIds: [chatId] });
    return res.json({ success: true, chat });
  });

  // Lookup chat by invite link or public username
  app.get("/api/chats/by-link", (req, res) => {
    const rawLink = req.query.link as string;
    if (!rawLink) return res.status(400).json({ error: "link query is required" });

    const clean = rawLink.trim().replace(/^https?:\/\//, '').replace(/^t\.me\//, '').replace(/^\+/, '');
    
    const found = chats.find(c => {
      if (c.type !== 'group' && c.type !== 'channel') return false;
      if (c.publicUsername && c.publicUsername.replace(/^@/, '').toLowerCase() === clean.toLowerCase()) return true;
      if (c.inviteLink && (c.inviteLink.includes(clean) || c.inviteLink.endsWith(clean))) return true;
      if (Array.isArray(c.customLinks) && c.customLinks.some(l => l.link.includes(clean))) return true;
      return false;
    });

    if (!found) {
      return res.status(404).json({ error: "Grup atau tautan undangan tidak ditemukan" });
    }

    const owner = users.find(u => u.id === found.ownerId);
    return res.json({
      id: found.id,
      name: found.name,
      avatar: found.avatar,
      color: found.color,
      description: found.description,
      type: found.type,
      groupType: found.groupType || 'private',
      membersCount: found.participants ? found.participants.length : 1,
      ownerName: owner ? owner.name : "Admin",
      inviteLink: found.inviteLink
    });
  });

  // Join chat via link
  app.post("/api/chats/join-by-link", (req, res) => {
    const { link, userId } = req.body;
    if (!link || !userId) return res.status(400).json({ error: "link and userId are required" });

    const clean = link.trim().replace(/^https?:\/\//, '').replace(/^t\.me\//, '').replace(/^\+/, '');
    const chat = chats.find(c => {
      if (c.type !== 'group' && c.type !== 'channel') return false;
      if (c.publicUsername && c.publicUsername.replace(/^@/, '').toLowerCase() === clean.toLowerCase()) return true;
      if (c.inviteLink && (c.inviteLink.includes(clean) || c.inviteLink.endsWith(clean))) return true;
      if (Array.isArray(c.customLinks) && c.customLinks.some(l => l.link.includes(clean))) return true;
      return false;
    });

    if (!chat) return res.status(404).json({ error: "Grup tidak ditemukan atau tautan telah kedaluwarsa" });

    if (!Array.isArray(chat.participants)) {
      chat.participants = [];
    }

    if (!chat.participants.includes(userId)) {
      chat.participants.push(userId);
      const user = users.find(u => u.id === userId);
      const sysMsg: MessageRecord = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        chatId: chat.id,
        senderId: "system",
        senderName: "Telegram",
        text: `${user ? user.name : "Pengguna"} bergabung melalui tautan undangan`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now(),
        isRead: true
      };
      messages.push(sysMsg);
      broadcast("message_received", { message: sysMsg });
    }

    saveDataToDisk();
    broadcast("chat_updated", { chat });
    broadcast("chats_updated", { chatIds: [chat.id] });
    return res.json({ success: true, chat });
  });

  // Leave or Delete Group
  app.post("/api/chats/leave", (req, res) => {
    const { chatId, userId } = req.body;
    if (!chatId || !userId) return res.status(400).json({ error: "chatId and userId required" });

    const chat = chats.find(c => c.id === chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    // If owner or only participant, delete group
    if (chat.ownerId === userId || (chat.participants && chat.participants.length <= 1)) {
      chats = chats.filter(c => c.id !== chatId);
      // Remove messages
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].chatId === chatId) {
          messages.splice(i, 1);
        }
      }
      saveDataToDisk();
      broadcast("chats_updated", { chatIds: [chatId] });
      return res.json({ success: true, deleted: true });
    }

    // Otherwise remove user from participants
    chat.participants = chat.participants.filter(id => id !== userId);
    const user = users.find(u => u.id === userId);
    const sysMsg: MessageRecord = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      chatId: chat.id,
      senderId: "system",
      senderName: "Telegram",
      text: `${user ? user.name : "Pengguna"} telah meninggalkan grup`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
      isRead: true
    };
    messages.push(sysMsg);
    broadcast("message_received", { message: sysMsg });

    saveDataToDisk();
    broadcast("chat_updated", { chat });
    broadcast("chats_updated", { chatIds: [chatId] });
    return res.json({ success: true, left: true });
  });

  // 6b. Batch Chat Management Endpoints
  app.post("/api/chats/mute", (req, res) => {
    const { chatIds, isMuted } = req.body;
    if (!Array.isArray(chatIds)) return res.status(400).json({ error: "chatIds required" });
    
    chatIds.forEach(id => {
      const c = chats.find(item => item.id === id);
      if (c) {
        c.isMuted = isMuted !== undefined ? isMuted : !c.isMuted;
      }
    });
    saveDataToDisk();
    broadcast("chats_updated", { chatIds });
    return res.json({ success: true });
  });

  app.post("/api/chats/archive", (req, res) => {
    const { chatIds, isArchived } = req.body;
    if (!Array.isArray(chatIds)) return res.status(400).json({ error: "chatIds required" });

    chatIds.forEach(id => {
      const c = chats.find(item => item.id === id);
      if (c) {
        c.isArchived = isArchived !== undefined ? isArchived : !c.isArchived;
      }
    });
    saveDataToDisk();
    broadcast("chats_updated", { chatIds });
    return res.json({ success: true });
  });

  app.post("/api/chats/delete", (req, res) => {
    let { chatIds, chatId, userId, deleteForBoth } = req.body;
    const targetChatIds: string[] = [];
    if (Array.isArray(chatIds)) {
      targetChatIds.push(...chatIds);
    } else if (typeof chatId === 'string' && chatId) {
      targetChatIds.push(chatId);
    } else if (typeof chatIds === 'string' && chatIds) {
      targetChatIds.push(chatIds);
    }

    if (targetChatIds.length === 0) {
      return res.status(400).json({ error: "chatIds or chatId required" });
    }

    const chatsToDeleteFromFirestore: string[] = [];
    const messagesToDeleteFromFirestore: string[] = [];

    targetChatIds.forEach(targetId => {
      const c = chats.find(item => item.id === targetId);
      if (!c) return;

      // If it's a saved chat:
      if (c.type === 'saved') {
        // Clear all messages in this saved chat
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].chatId === targetId) {
            messagesToDeleteFromFirestore.push(messages[i].id);
            messages.splice(i, 1);
          }
        }
        c.unreadCount = 0;
        return;
      }

      // If deleteForBoth !== false or no userId specified or group chat: delete completely
      if (deleteForBoth !== false || !userId || c.type === 'group' || c.type === 'channel') {
        chats = chats.filter(item => item.id !== targetId);
        chatsToDeleteFromFirestore.push(targetId);
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].chatId === targetId) {
            messagesToDeleteFromFirestore.push(messages[i].id);
            messages.splice(i, 1);
          }
        }
      } else {
        // Soft delete for this specific user
        if (!c.deletedForUserIds) c.deletedForUserIds = [];
        if (!c.deletedForUserIds.includes(userId)) {
          c.deletedForUserIds.push(userId);
        }
        // Also mark all messages in this chat as deleted for this user
        messages.forEach(m => {
          if (m.chatId === targetId) {
            if (!m.deletedForUserIds) m.deletedForUserIds = [];
            if (!m.deletedForUserIds.includes(userId)) {
              m.deletedForUserIds.push(userId);
            }
          }
        });
        // If all participants have deleted the chat, remove completely
        const allDeleted = Array.isArray(c.participants) && c.participants.every(p => c.deletedForUserIds?.includes(p));
        if (allDeleted) {
          chats = chats.filter(item => item.id !== targetId);
          chatsToDeleteFromFirestore.push(targetId);
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].chatId === targetId) {
              messagesToDeleteFromFirestore.push(messages[i].id);
              messages.splice(i, 1);
            }
          }
        }
      }
    });

    saveDataToDisk();
    if (chatsToDeleteFromFirestore.length > 0) {
      deleteFirestoreDocs('chats', chatsToDeleteFromFirestore);
    }
    if (messagesToDeleteFromFirestore.length > 0) {
      deleteFirestoreDocs('messages', messagesToDeleteFromFirestore);
    }
    broadcast("chat_deleted", { chatIds: targetChatIds, userId, deleteForBoth });
    broadcast("chats_updated", { chatIds: targetChatIds, deleted: true, userId });
    return res.json({ success: true, deletedIds: targetChatIds });
  });

  // DELETE /api/chats/:id endpoint
  app.delete("/api/chats/:id", (req, res) => {
    const chatId = req.params.id;
    const userId = (req.query.userId as string) || req.body?.userId;
    const deleteForBoth = req.body?.deleteForBoth !== false && req.query?.deleteForBoth !== 'false';

    const c = chats.find(item => item.id === chatId);
    if (!c) {
      return res.status(404).json({ error: "Obrolan tidak ditemukan" });
    }

    const chatsToDeleteFromFirestore: string[] = [];
    const messagesToDeleteFromFirestore: string[] = [];

    if (deleteForBoth || !userId || c.type === 'group' || c.type === 'channel' || c.type === 'saved') {
      chats = chats.filter(item => item.id !== chatId);
      chatsToDeleteFromFirestore.push(chatId);
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].chatId === chatId) {
          messagesToDeleteFromFirestore.push(messages[i].id);
          messages.splice(i, 1);
        }
      }
    } else {
      if (!c.deletedForUserIds) c.deletedForUserIds = [];
      if (!c.deletedForUserIds.includes(userId)) {
        c.deletedForUserIds.push(userId);
      }
      messages.forEach(m => {
        if (m.chatId === chatId) {
          if (!m.deletedForUserIds) m.deletedForUserIds = [];
          if (!m.deletedForUserIds.includes(userId)) {
            m.deletedForUserIds.push(userId);
          }
        }
      });
      const allDeleted = Array.isArray(c.participants) && c.participants.every(p => c.deletedForUserIds?.includes(p));
      if (allDeleted) {
        chats = chats.filter(item => item.id !== chatId);
        chatsToDeleteFromFirestore.push(chatId);
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].chatId === chatId) {
            messagesToDeleteFromFirestore.push(messages[i].id);
            messages.splice(i, 1);
          }
        }
      }
    }

    saveDataToDisk();
    if (chatsToDeleteFromFirestore.length > 0) {
      deleteFirestoreDocs('chats', chatsToDeleteFromFirestore);
    }
    if (messagesToDeleteFromFirestore.length > 0) {
      deleteFirestoreDocs('messages', messagesToDeleteFromFirestore);
    }
    broadcast("chat_deleted", { chatIds: [chatId], userId, deleteForBoth });
    broadcast("chats_updated", { chatIds: [chatId], deleted: true, userId });
    return res.json({ success: true, chatId });
  });

  app.post("/api/chats/pin", (req, res) => {
    const { chatIds, isPinned } = req.body;
    if (!Array.isArray(chatIds)) return res.status(400).json({ error: "chatIds required" });

    chatIds.forEach(id => {
      const c = chats.find(item => item.id === id);
      if (c) {
        c.isPinned = isPinned !== undefined ? isPinned : !c.isPinned;
      }
    });
    saveDataToDisk();
    broadcast("chats_updated", { chatIds });
    return res.json({ success: true });
  });

  app.post("/api/chats/remove-folder", (req, res) => {
    const { chatIds } = req.body;
    if (!Array.isArray(chatIds)) return res.status(400).json({ error: "chatIds required" });

    chatIds.forEach(id => {
      const c = chats.find(item => item.id === id);
      if (c) {
        c.folder = "all";
      }
    });
    saveDataToDisk();
    broadcast("chats_updated", { chatIds });
    return res.json({ success: true });
  });

  app.post("/api/messages/read", (req, res) => {
    const { chatId, userId } = req.body;
    if (!chatId) return res.status(400).json({ error: "chatId required" });

    const c = chats.find(item => item.id === chatId);
    if (c) {
      c.unreadCount = 0;
    }
    messages.forEach(m => {
      if (m.chatId === chatId) {
        if (!userId || m.senderId !== userId) {
          m.isRead = true;
        }
      }
    });
    saveDataToDisk();
    broadcast("messages_read", { chatId, readByUserId: userId });
    return res.json({ success: true });
  });

  app.post("/api/chats/mark-read", (req, res) => {
    const { chatIds, userId } = req.body;
    if (!Array.isArray(chatIds)) return res.status(400).json({ error: "chatIds required" });

    chatIds.forEach(id => {
      const c = chats.find(item => item.id === id);
      if (c) {
        c.unreadCount = 0;
      }
      messages.forEach(m => {
        if (m.chatId === id) {
          m.isRead = true;
        }
      });
    });
    saveDataToDisk();
    broadcast("chats_updated", { chatIds });
    return res.json({ success: true });
  });

  app.post("/api/chats/clear-history", (req, res) => {
    let { chatIds, chatId, userId, deleteForBoth } = req.body;
    const targetChatIds: string[] = [];
    if (Array.isArray(chatIds)) {
      targetChatIds.push(...chatIds);
    } else if (typeof chatId === 'string' && chatId) {
      targetChatIds.push(chatId);
    } else if (typeof chatIds === 'string' && chatIds) {
      targetChatIds.push(chatIds);
    }

    if (targetChatIds.length === 0) {
      return res.status(400).json({ error: "chatIds or chatId required" });
    }

    const removedMsgIds: string[] = [];
    const updatedMessagesForMe: MessageRecord[] = [];

    if (deleteForBoth === false && userId) {
      // Soft clear for this user only
      messages.forEach(m => {
        if (targetChatIds.includes(m.chatId)) {
          if (!m.deletedForUserIds) m.deletedForUserIds = [];
          if (!m.deletedForUserIds.includes(userId)) {
            m.deletedForUserIds.push(userId);
            updatedMessagesForMe.push(m);
          }
        }
      });
      targetChatIds.forEach(id => {
        const c = chats.find(item => item.id === id);
        if (c) c.unreadCount = 0;
      });
      saveDataToDisk();
      if (firestoreDb && !firestoreQuotaExhausted && updatedMessagesForMe.length > 0) {
        try {
          const batch = writeBatch(firestoreDb);
          updatedMessagesForMe.forEach(m => {
            batch.set(doc(firestoreDb, "messages", m.id), { deletedForUserIds: m.deletedForUserIds }, { merge: true });
          });
          batch.commit().catch((err) => { if (err?.code === 8 || err?.message?.includes('RESOURCE_EXHAUSTED')) firestoreQuotaExhausted = true; });
        } catch (err) {}
      }
      broadcast("history_cleared", { chatIds: targetChatIds, userId, deleteForBoth: false });
      broadcast("chats_updated", { chatIds: targetChatIds });
      return res.json({ success: true, count: updatedMessagesForMe.length });
    }

    // Default: Clear for everyone permanently
    for (let i = messages.length - 1; i >= 0; i--) {
      if (targetChatIds.includes(messages[i].chatId)) {
        removedMsgIds.push(messages[i].id);
        messages.splice(i, 1);
      }
    }
    targetChatIds.forEach(id => {
      const c = chats.find(item => item.id === id);
      if (c) c.unreadCount = 0;
    });
    saveDataToDisk();
    if (removedMsgIds.length > 0) {
      deleteFirestoreDocs('messages', removedMsgIds);
    }
    broadcast("history_cleared", { chatIds: targetChatIds, deleteForBoth: true });
    broadcast("chats_updated", { chatIds: targetChatIds });
    return res.json({ success: true, count: removedMsgIds.length });
  });

  // 7. Get Messages for a Chat (both /api/messages?chatId=xxx and /api/chats/:id/messages)
  app.get("/api/messages", (req, res) => {
    const chatId = (req.query.chatId as string) || "";
    const userId = (req.query.userId as string) || "";
    if (!chatId) {
      if (userId) {
        return res.json(messages.filter(m => !m.deletedForUserIds || !m.deletedForUserIds.includes(userId)));
      }
      return res.json(messages);
    }
    const chatMsgs = messages.filter(m => m.chatId === chatId && (!userId || !m.deletedForUserIds || !m.deletedForUserIds.includes(userId)));
    return res.json(chatMsgs);
  });

  app.get("/api/chats/:id/messages", (req, res) => {
    const chatId = req.params.id;
    const userId = (req.query.userId as string) || "";
    const chatMsgs = messages.filter(m => m.chatId === chatId && (!userId || !m.deletedForUserIds || !m.deletedForUserIds.includes(userId)));
    return res.json(chatMsgs);
  });

  // 8. Send Message (both /api/messages/send and /api/messages)
  const handleSendMessageReq = (req: express.Request, res: express.Response) => {
    const { chatId, senderId, text, replyTo, attachments, timestamp, createdAt } = req.body;
    if (!chatId || !senderId || (!text && (!attachments || attachments.length === 0))) {
      return res.status(400).json({ error: "Chat ID, pengirim, dan pesan harus diisi." });
    }

    // Check if sender is blocked by Administrator
    const sender = users.find(u => u.id === senderId);
    if (sender && sender.isBlocked) {
      return res.status(403).json({
        error: "Akun Anda telah diblokir oleh Administrator dan tidak dapat mengirim pesan.",
        isBlocked: true
      });
    }

    // Check if sender is blocked in direct chat
    const targetChat = chats.find(c => c.id === chatId);
    if (targetChat && targetChat.type === "direct") {
      const otherUserId = targetChat.participants.find(p => p !== senderId);
      const otherUser = users.find(u => u.id === otherUserId);
      const senderUser = users.find(u => u.id === senderId);
      if (otherUser && otherUser.blockedUsers && (
        otherUser.blockedUsers.includes(senderId) ||
        (senderUser?.username && otherUser.blockedUsers.includes(senderUser.username)) ||
        (senderUser?.name && otherUser.blockedUsers.includes(senderUser.name))
      )) {
        return res.status(403).json({ error: "Anda telah diblokir oleh pengguna ini." });
      }
    }

    const now = new Date();
    const fallbackTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let formattedReplyTo: MessageRecord['replyTo'] | undefined = undefined;
    if (replyTo && replyTo.id) {
      const origMsg = messages.find((m) => m.id === replyTo.id);
      const origImgAtt = origMsg?.attachments?.find((a) => a.type === 'image') || replyTo.attachments?.find((a: any) => a.type === 'image');
      const origVoiceAtt = origMsg?.attachments?.find((a) => a.type === 'voice') || replyTo.attachments?.find((a: any) => a.type === 'voice');
      const origVideoAtt = origMsg?.attachments?.find((a) => a.type === 'video') || replyTo.attachments?.find((a: any) => a.type === 'video');

      let cleanedText = replyTo.text || origMsg?.text || '';
      if (cleanedText === 'Foto Lampiran') {
        cleanedText = 'Foto';
      }
      if (!cleanedText) {
        if (replyTo.hasVideo || origVideoAtt) cleanedText = 'Video';
        else if (replyTo.hasImage || origImgAtt) cleanedText = 'Foto';
        else if (replyTo.hasVoice || origVoiceAtt) cleanedText = 'Pesan suara';
      }

      formattedReplyTo = {
        id: replyTo.id,
        senderName: replyTo.senderName || origMsg?.senderName || "Pengguna",
        text: cleanedText,
        hasImage: Boolean(replyTo.hasImage || origImgAtt),
        imageUrl: replyTo.imageUrl || origImgAtt?.url,
        hasVoice: Boolean(replyTo.hasVoice || origVoiceAtt),
        hasVideo: Boolean(replyTo.hasVideo || origVideoAtt),
        videoUrl: replyTo.videoUrl || origVideoAtt?.url,
      };
    }

    const processedAttachments = Array.isArray(attachments)
      ? attachments.map((att: any) => {
          let url = att.url;
          if (url && typeof url === 'string' && url.startsWith('data:')) {
            url = saveBase64MediaToFile(url, att.type || 'media');
          }
          let thumbUrl = att.thumbnailUrl;
          if (thumbUrl && typeof thumbUrl === 'string' && thumbUrl.startsWith('data:')) {
            thumbUrl = saveBase64MediaToFile(thumbUrl, 'thumb');
          }
          return {
            ...att,
            url,
            thumbnailUrl: thumbUrl,
          };
        })
      : [];

    const newMsg: MessageRecord = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      chatId,
      senderId,
      senderName: sender ? sender.name : "Pengguna",
      senderAvatar: sender?.avatar,
      senderColor: sender?.color || "#5288c1",
      text: text || "",
      timestamp: timestamp || fallbackTime,
      createdAt: typeof createdAt === 'number' ? createdAt : Date.now(),
      isRead: false,
      replyTo: formattedReplyTo,
      attachments: processedAttachments
    };

    messages.push(newMsg);

    // Update chat last message order and un-hide if previously deleted for a user
    const chatIndex = chats.findIndex(c => c.id === chatId);
    if (chatIndex > -1) {
      const [chat] = chats.splice(chatIndex, 1);
      if (chat.deletedForUserIds && chat.deletedForUserIds.length > 0) {
        chat.deletedForUserIds = [];
      }
      chats.unshift(chat);
    }

    saveDataToDisk();
    broadcast("message_sent", { message: newMsg, chatId });

    // Auto bot reply simulation if messaging a bot or demo user
    if (targetChat && targetChat.type === "bot") {
      setTimeout(() => {
        const botResponses = [
          "Halo! Saya bot Telegram aktif. Ada yang bisa saya bantu?",
          "Perintah berhasil dieksekusi: status OK ✅",
          "Silakan kirim /help untuk melihat menu perintah.",
          "Pesan Anda telah diterima oleh sistem."
        ];
        const botReply: MessageRecord = {
          id: `msg-bot-${Date.now()}`,
          chatId,
          senderId: "user-2",
          senderName: targetChat.name,
          senderAvatar: targetChat.avatar,
          senderColor: targetChat.color,
          text: botResponses[Math.floor(Math.random() * botResponses.length)],
          timestamp: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
          createdAt: Date.now(),
          isRead: false
        };
        messages.push(botReply);
        saveDataToDisk();
        broadcast("message_sent", { message: botReply, chatId });
      }, 900);
    }

    return res.json(newMsg);
  };

  app.post("/api/messages/send", handleSendMessageReq);
  app.post("/api/messages", handleSendMessageReq);

  // 9. React to Message
  app.post("/api/messages/:id/react", (req, res) => {
    const messageId = req.params.id;
    const { userId, emoji } = req.body;

    const msg = messages.find(m => m.id === messageId);
    if (!msg) return res.status(404).json({ error: "Pesan tidak ditemukan" });

    if (!msg.reactions) msg.reactions = [];

    const existingReaction = msg.reactions.find(r => r.emoji === emoji);
    if (existingReaction) {
      if (existingReaction.users.includes(userId)) {
        // Toggle off
        existingReaction.users = existingReaction.users.filter(u => u !== userId);
        existingReaction.count = existingReaction.users.length;
        if (existingReaction.count === 0) {
          msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        existingReaction.users.push(userId);
        existingReaction.count = existingReaction.users.length;
      }
    } else {
      msg.reactions.push({
        emoji,
        count: 1,
        users: [userId]
      });
    }

    saveDataToDisk();
    broadcast("message_reacted", { messageId, reactions: msg.reactions, chatId: msg.chatId });
    return res.json({ success: true, reactions: msg.reactions });
  });

  // 10. Mark Messages Read in Chat
  app.post("/api/chats/:id/read", (req, res) => {
    const chatId = req.params.id;
    const { userId } = req.body;

    messages.forEach(m => {
      if (m.chatId === chatId && m.senderId !== userId) {
        m.isRead = true;
      }
    });

    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      chat.unreadCount = 0;
    }

    saveDataToDisk();
    broadcast("chat_read", { chatId, userId });
    return res.json({ success: true });
  });

  // 10b. Edit Message
  const handleEditMessageReq = (req: express.Request, res: express.Response) => {
    const messageId = req.params.id;
    const { text } = req.body;
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Teks pesan tidak boleh kosong" });
    }
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return res.status(404).json({ error: "Pesan tidak ditemukan" });

    msg.text = text.trim();
    msg.isEdited = true;
    msg.editedAt = Date.now();
    saveDataToDisk();
    broadcast("message_edited", { message: msg, chatId: msg.chatId });
    return res.json({ success: true, message: msg });
  };

  app.post("/api/messages/:id/edit", handleEditMessageReq);
  app.put("/api/messages/:id", handleEditMessageReq);

  // 11. Delete Message (Permanent / For Everyone)
  app.delete("/api/messages/:id", (req, res) => {
    const messageId = req.params.id;
    const userId = (req.query.userId as string) || req.body?.userId;
    const index = messages.findIndex(m => m.id === messageId);
    if (index === -1) return res.status(404).json({ error: "Pesan tidak ditemukan" });

    const msg = messages[index];
    const chat = chats.find(c => c.id === msg.chatId);
    const isGroupAdmin = chat && (chat.type === 'group' || chat.type === 'channel') &&
      (chat.adminIds?.includes(userId) || chat.creatorId === userId);

    // If request comes from a user who is NOT the sender and NOT a group admin, delete for them only!
    if (userId && msg.senderId !== userId && !isGroupAdmin) {
      if (!msg.deletedForUserIds) msg.deletedForUserIds = [];
      if (!msg.deletedForUserIds.includes(userId)) {
        msg.deletedForUserIds.push(userId);
      }
      saveDataToDisk();
      if (firestoreDb && !firestoreQuotaExhausted) {
        setDoc(doc(firestoreDb, "messages", msg.id), { deletedForUserIds: msg.deletedForUserIds }, { merge: true }).catch((err) => { if (err?.code === 8 || err?.message?.includes('RESOURCE_EXHAUSTED')) firestoreQuotaExhausted = true; });
      }
      broadcast("message_deleted_for_me", { messageId: msg.id, userId, chatId: msg.chatId });
      return res.json({ success: true, deletedForMe: true });
    }

    const deleted = messages.splice(index, 1)[0];
    saveDataToDisk();
    deleteFirestoreDoc('messages', messageId);
    broadcast("message_deleted", { messageId, chatId: deleted.chatId });
    return res.json({ success: true });
  });

  // 11b. Bulk Delete Messages (Permanent / For Everyone)
  app.post("/api/messages/bulk-delete", (req, res) => {
    const { messageIds, userId } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: "Daftar ID pesan tidak valid" });
    }

    const deletedIds: string[] = [];
    const deletedForMeIds: string[] = [];

    messageIds.forEach(id => {
      const idx = messages.findIndex(m => m.id === id);
      if (idx > -1) {
        const msg = messages[idx];
        const chat = chats.find(c => c.id === msg.chatId);
        const isGroupAdmin = chat && (chat.type === 'group' || chat.type === 'channel') &&
          (chat.adminIds?.includes(userId) || chat.creatorId === userId);

        if (userId && msg.senderId !== userId && !isGroupAdmin) {
          // Other user's message: delete only for this user
          if (!msg.deletedForUserIds) msg.deletedForUserIds = [];
          if (!msg.deletedForUserIds.includes(userId)) {
            msg.deletedForUserIds.push(userId);
          }
          deletedForMeIds.push(id);
        } else {
          // Own message or admin: delete for everyone
          const deleted = messages.splice(idx, 1)[0];
          deletedIds.push(id);
          broadcast("message_deleted", { messageId: id, chatId: deleted.chatId });
        }
      }
    });

    saveDataToDisk();
    if (deletedIds.length > 0) {
      deleteFirestoreDocs('messages', deletedIds);
    }
    if (deletedForMeIds.length > 0) {
      if (firestoreDb && !firestoreQuotaExhausted) {
        try {
          const batch = writeBatch(firestoreDb);
          deletedForMeIds.forEach(id => {
            const m = messages.find(item => item.id === id);
            if (m) {
              batch.set(doc(firestoreDb, "messages", id), { deletedForUserIds: m.deletedForUserIds }, { merge: true });
            }
          });
          batch.commit().catch((err) => { if (err?.code === 8 || err?.message?.includes('RESOURCE_EXHAUSTED')) firestoreQuotaExhausted = true; });
        } catch (err) {}
      }
      broadcast("messages_bulk_deleted_for_me", { messageIds: deletedForMeIds, userId });
    }

    return res.json({ success: true, deletedIds, deletedForMeIds });
  });

  // 11c. Delete Message For Me Only
  app.post("/api/messages/:id/delete-for-me", (req, res) => {
    const messageId = req.params.id;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const msg = messages.find(m => m.id === messageId);
    if (!msg) return res.status(404).json({ error: "Pesan tidak ditemukan" });

    if (!msg.deletedForUserIds) msg.deletedForUserIds = [];
    if (!msg.deletedForUserIds.includes(userId)) {
      msg.deletedForUserIds.push(userId);
    }
    saveDataToDisk();
    if (firestoreDb && !firestoreQuotaExhausted && msg) {
      setDoc(doc(firestoreDb, "messages", msg.id), { deletedForUserIds: msg.deletedForUserIds }, { merge: true }).catch((err) => { if (err?.code === 8 || err?.message?.includes('RESOURCE_EXHAUSTED')) firestoreQuotaExhausted = true; });
    }
    broadcast("message_deleted_for_me", { messageId, userId, chatId: msg.chatId });
    return res.json({ success: true, messageId });
  });

  // 11d. Bulk Delete Messages For Me Only
  app.post("/api/messages/bulk-delete-for-me", (req, res) => {
    const { messageIds, userId } = req.body;
    if (!Array.isArray(messageIds) || !userId) {
      return res.status(400).json({ error: "messageIds and userId required" });
    }

    messageIds.forEach(id => {
      const msg = messages.find(m => m.id === id);
      if (msg) {
        if (!msg.deletedForUserIds) msg.deletedForUserIds = [];
        if (!msg.deletedForUserIds.includes(userId)) {
          msg.deletedForUserIds.push(userId);
        }
      }
    });
    saveDataToDisk();
    if (firestoreDb && !firestoreQuotaExhausted && messageIds.length > 0) {
      try {
        const batch = writeBatch(firestoreDb);
        messageIds.forEach(id => {
          const m = messages.find(item => item.id === id);
          if (m) {
            batch.set(doc(firestoreDb, "messages", id), { deletedForUserIds: m.deletedForUserIds }, { merge: true });
          }
        });
        batch.commit().catch((err) => { if (err?.code === 8 || err?.message?.includes('RESOURCE_EXHAUSTED')) firestoreQuotaExhausted = true; });
      } catch (err) {}
    }
    broadcast("messages_bulk_deleted_for_me", { messageIds, userId });
    return res.json({ success: true, deletedIds: messageIds });
  });

  // 12. Pin or Unpin Message
  app.post("/api/messages/:id/pin", (req, res) => {
    const messageId = req.params.id;
    const { isPinned } = req.body;
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return res.status(404).json({ error: "Pesan tidak ditemukan" });

    msg.isPinned = isPinned !== undefined ? isPinned : !msg.isPinned;
    saveDataToDisk();
    broadcast("message_pinned", { messageId, chatId: msg.chatId, isPinned: msg.isPinned });
    return res.json({ success: true, message: msg });
  });

  // =========================================================================
  // REAL-TIME CALL SIGNALING & HISTORY APIS (WebRTC P2P + Server-Relay)
  // =========================================================================

  // 13a. Initiate Call (Offer SDP)
  app.post("/api/calls/offer", (req, res) => {
    const { callId, callerId, targetUserId, offer, callType = "audio" } = req.body;
    if (!callId || !callerId || !targetUserId || !offer) {
      return res.status(400).json({ error: "Parameter panggilan tidak lengkap" });
    }

    const caller = users.find(u => u.id === callerId);
    const target = users.find(u => u.id === targetUserId);

    if (!caller || !target) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan" });
    }

    // Check if caller is blocked by target
    if (target.blockedUsers && (
      target.blockedUsers.includes(callerId) ||
      (caller.username && target.blockedUsers.some(b => b.toLowerCase() === caller.username.toLowerCase() || b.toLowerCase() === `@${caller.username.toLowerCase()}`))
    )) {
      return res.status(403).json({ error: "Anda tidak dapat memanggil pengguna ini karena telah diblokir." });
    }

    // Check target's privacy settings for calls
    if (target.privacyCalls === "nobody") {
      return res.status(403).json({ error: "Pengguna ini membatasi panggilan suara/video karena privasi." });
    }

    // Relay incoming call notification to callee via SSE
    sendToUser(targetUserId, "call_incoming", {
      callId,
      caller: {
        id: caller.id,
        name: caller.name,
        username: caller.username,
        avatar: caller.avatar,
        color: caller.color || "#5288c1",
        phone: caller.phone
      },
      targetUserId,
      offer,
      callType,
      timestamp: Date.now()
    });

    return res.json({ success: true, callId });
  });

  // 13b. Answer Call (Answer SDP)
  app.post("/api/calls/answer", (req, res) => {
    const { callId, callerId, targetUserId, answer } = req.body;
    if (!callId || !callerId || !answer) {
      return res.status(400).json({ error: "Parameter jawaban panggilan tidak lengkap" });
    }

    sendToUser(callerId, "call_answered", {
      callId,
      answeredBy: targetUserId,
      answer,
      timestamp: Date.now()
    });

    return res.json({ success: true });
  });

  // 13c. ICE Candidate Relay
  app.post("/api/calls/ice-candidate", (req, res) => {
    const { callId, targetUserId, candidate } = req.body;
    if (!callId || !targetUserId || !candidate) {
      return res.status(400).json({ error: "Parameter ICE candidate tidak lengkap" });
    }

    sendToUser(targetUserId, "call_ice_candidate", {
      callId,
      candidate
    });

    return res.json({ success: true });
  });

  // 13d. Reject / Busy Call
  app.post("/api/calls/reject", (req, res) => {
    const { callId, callerId, targetUserId, reason = "declined", callType = "audio" } = req.body;
    if (!callId || !callerId) {
      return res.status(400).json({ error: "Parameter penolakan tidak lengkap" });
    }

    sendToUser(callerId, "call_rejected", {
      callId,
      reason,
      timestamp: Date.now()
    });

    const caller = users.find(u => u.id === callerId);
    const target = users.find(u => u.id === targetUserId);

    const isVideo = callType === "video";
    const newLog: CallLogRecord = {
      id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      callerId,
      calleeId: targetUserId || "",
      callerName: caller ? caller.name : "Pengguna",
      calleeName: target ? target.name : "Pengguna",
      callerAvatar: caller?.avatar,
      calleeAvatar: target?.avatar,
      callerColor: caller?.color || "#5288c1",
      calleeColor: target?.color || "#5288c1",
      type: isVideo ? "video" : "audio",
      status: reason === "busy" ? "cancelled" : "declined",
      duration: 0,
      timestamp: Date.now()
    };
    callLogs.unshift(newLog);

    // Also add missed call notification in direct chat
    if (callerId && targetUserId) {
      const directChat = chats.find(c => 
        c.type === "direct" && 
        c.participants?.includes(callerId) && 
        c.participants?.includes(targetUserId)
      );

      if (directChat) {
        const callTitle = isVideo ? "Telepon video" : "Telepon suara";
        const callMsg: MessageRecord = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          chatId: directChat.id,
          senderId: callerId,
          senderName: caller?.name || "Pengguna",
          senderAvatar: caller?.avatar,
          senderColor: caller?.color || "#5288c1",
          text: `${callTitle}: Panggilan ditolak`,
          timestamp: "baru saja",
          isRead: true,
          reactions: [],
          createdAt: Date.now(),
          callInfo: {
            type: isVideo ? "video" : "audio",
            status: "declined",
            duration: 0
          }
        };
        messages.push(callMsg);
        broadcast("new_message", { message: callMsg, chatId: directChat.id });
      }
    }

    saveDataToDisk();
    broadcast("call_history_updated", { callerId, targetUserId });

    return res.json({ success: true });
  });

  // 13e. End Call (Hang Up / Timeout / Completed)
  app.post("/api/calls/end", (req, res) => {
    const { callId, callerId, targetUserId, duration = 0, status = "completed", callType = "audio" } = req.body;
    if (!callId) {
      return res.status(400).json({ error: "Parameter pengakhiran panggilan tidak lengkap" });
    }

    if (targetUserId) {
      sendToUser(targetUserId, "call_ended", {
        callId,
        duration,
        status,
        timestamp: Date.now()
      });
    }
    if (callerId) {
      sendToUser(callerId, "call_ended", {
        callId,
        duration,
        status,
        timestamp: Date.now()
      });
    }

    const caller = users.find(u => u.id === callerId);
    const target = users.find(u => u.id === targetUserId);
    const isVideo = callType === "video";

    const newLog: CallLogRecord = {
      id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      callerId: callerId || "",
      calleeId: targetUserId || "",
      callerName: caller ? caller.name : "Pengguna",
      calleeName: target ? target.name : "Pengguna",
      callerAvatar: caller?.avatar,
      calleeAvatar: target?.avatar,
      callerColor: caller?.color || "#5288c1",
      calleeColor: target?.color || "#5288c1",
      type: isVideo ? "video" : "audio",
      status: status as any,
      duration: duration,
      timestamp: Date.now()
    };

    callLogs.unshift(newLog);

    // If direct chat exists, log the call message
    if (callerId && targetUserId) {
      const directChat = chats.find(c => 
        c.type === "direct" && 
        c.participants?.includes(callerId) && 
        c.participants?.includes(targetUserId)
      );

      if (directChat) {
        const callTitle = isVideo ? "Telepon video" : "Telepon suara";
        const isMissed = status === "missed";
        const isDeclined = status === "declined";
        const isCancelled = status === "cancelled";
        
        let subtitleText = "0 dtk";
        if (isDeclined) {
          subtitleText = "Panggilan ditolak";
        } else if (isMissed) {
          subtitleText = "Panggilan tak terjawab";
        } else if (isCancelled) {
          subtitleText = "Panggilan dibatalkan";
        } else {
          // completed duration format
          const numDur = Number(duration) || 0;
          const hours = Math.floor(numDur / 3600);
          const remainingSecs = numDur % 3600;
          const mins = Math.floor(remainingSecs / 60);
          const secs = remainingSecs % 60;
          if (hours > 0) {
            subtitleText = mins > 0 ? `${hours} j, ${mins} mnt` : `${hours} j`;
          } else if (mins > 0) {
            subtitleText = `${mins} mnt`;
          } else {
            subtitleText = `${secs} dtk`;
          }
        }

        const callMsg: MessageRecord = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          chatId: directChat.id,
          senderId: callerId,
          senderName: caller?.name || "Pengguna",
          senderAvatar: caller?.avatar,
          senderColor: caller?.color || "#5288c1",
          text: `${callTitle}: ${subtitleText}`,
          timestamp: "baru saja",
          isRead: true,
          reactions: [],
          createdAt: Date.now(),
          callInfo: {
            type: isVideo ? "video" : "audio",
            status: status as any,
            duration: Number(duration) || 0
          }
        };
        messages.push(callMsg);
        broadcast("new_message", { message: callMsg, chatId: directChat.id });
      }
    }

    saveDataToDisk();
    broadcast("call_history_updated", { callerId, targetUserId });

    return res.json({ success: true, log: newLog });
  });

  // 13f. Renegotiation Offer (For seamless mid-call Video / Audio upgrade)
  app.post("/api/calls/renegotiate-offer", (req, res) => {
    const { callId, targetUserId, senderId, offer, hasVideo } = req.body;
    if (!callId || !targetUserId || !offer) {
      return res.status(400).json({ error: "Parameter renegotiate offer tidak lengkap" });
    }

    sendToUser(targetUserId, "call_renegotiate_offer", {
      callId,
      senderId,
      offer,
      hasVideo: !!hasVideo,
      timestamp: Date.now()
    });

    return res.json({ success: true });
  });

  // 13g. Renegotiation Answer
  app.post("/api/calls/renegotiate-answer", (req, res) => {
    const { callId, targetUserId, senderId, answer } = req.body;
    if (!callId || !targetUserId || !answer) {
      return res.status(400).json({ error: "Parameter renegotiate answer tidak lengkap" });
    }

    sendToUser(targetUserId, "call_renegotiate_answer", {
      callId,
      senderId,
      answer,
      timestamp: Date.now()
    });

    return res.json({ success: true });
  });

  // 13h. Media State Update (Video on/off, Mute, Camera switch)
  app.post("/api/calls/media-update", (req, res) => {
    const { callId, targetUserId, senderId, isVideoEnabled, isMuted, cameraFacing } = req.body;
    if (!callId || !targetUserId) {
      return res.status(400).json({ error: "Parameter media update tidak lengkap" });
    }

    sendToUser(targetUserId, "call_media_updated", {
      callId,
      senderId,
      isVideoEnabled,
      isMuted,
      cameraFacing,
      timestamp: Date.now()
    });

    return res.json({ success: true });
  });

  // 13i. Get Call History
  app.get("/api/calls/history", (req, res) => {
    const userId = req.query.userId as string;
    const filterCalls = userId 
      ? callLogs.filter(c => c.callerId === userId || c.calleeId === userId)
      : callLogs;

    const enrichedCalls = filterCalls.slice(0, 50).map(c => {
      const caller = users.find(u => u.id === c.callerId);
      const callee = users.find(u => u.id === c.calleeId);
      return {
        ...c,
        callerAvatar: caller !== undefined ? caller.avatar : c.callerAvatar,
        calleeAvatar: callee !== undefined ? callee.avatar : c.calleeAvatar,
      };
    });

    return res.json({ calls: enrichedCalls });
  });

  // 13g. Clear Call History
  app.delete("/api/calls/history", (req, res) => {
    const { userId, callIds } = req.body;
    const deletedCallIds: string[] = [];
    if (Array.isArray(callIds) && callIds.length > 0) {
      const callIdsSet = new Set(callIds);
      const remaining = callLogs.filter(c => {
        if (callIdsSet.has(c.id)) {
          deletedCallIds.push(c.id);
          return false;
        }
        return true;
      });
      callLogs.length = 0;
      callLogs.push(...remaining);
    } else if (userId) {
      const remaining = callLogs.filter(c => {
        if (c.callerId === userId || c.calleeId === userId) {
          deletedCallIds.push(c.id);
          return false;
        }
        return true;
      });
      callLogs.length = 0;
      callLogs.push(...remaining);
    } else {
      deletedCallIds.push(...callLogs.map(c => c.id));
      callLogs.length = 0;
    }
    saveDataToDisk();
    if (deletedCallIds.length > 0) {
      deleteFirestoreDocs('callLogs', deletedCallIds);
    }
    return res.json({ success: true, count: callLogs.length });
  });

  // =========================================================================
  // 14. TELEGRAM STORIES / STATUS API ENDPOINTS (Foto, Teks Berwarna, & Audio)
  // =========================================================================

  // 14a. Get Active Stories
  app.get("/api/stories", (req, res) => {
    checkAndCleanExpiredStories();
    const userId = req.query.userId as string | undefined;
    const now = Date.now();
    
    const enrichStory = (s: StoryRecord) => {
      const u = users.find(user => user.id === s.userId);
      const filteredViewers = (s.viewers || []).filter(v => {
        const vu = users.find(user => user.id === v.userId);
        if (vu?.username?.toLowerCase() === 'nabilassihidiqi' && vu?.privacyStatusView === 'nobody') {
          return false;
        }
        return true;
      });
      return {
        ...s,
        viewers: filteredViewers,
        userName: u ? u.name : s.userName,
        userAvatar: u ? u.avatar : s.userAvatar,
        userColor: u ? (u.color || s.userColor) : s.userColor,
        isVerified: u ? (u.isVerified !== undefined ? u.isVerified : true) : true,
        badgeColor: u?.badgeColor || 'blue',
      };
    };

    // Active stories only (not archived and not expired)
    const active = stories.filter(s => !s.isArchived && s.expiresAt > now);
    const sorted = [...active].sort((a, b) => b.createdAt - a.createdAt).map(enrichStory);

    if (userId) {
      const myStories = sorted.filter(s => s.userId === userId);
      const contactsStories = sorted.filter(s => {
        if (s.userId === userId) return false;

        // Global stories can be viewed by anyone without chat connection
        if (s.privacyType === 'all') return true;

        // Check contact/chat connection between viewer (userId) and poster (s.userId)
        const hasChatConnection = chats.some(c => 
          c.type === 'direct' && 
          c.participants && 
          c.participants.includes(userId) && 
          c.participants.includes(s.userId)
        );

        if (s.privacyType === 'contacts') return hasChatConnection;

        // Privacy filter for contacts
        if (s.privacyType === 'whitelist') {
          return Array.isArray(s.whitelistUserIds) && s.whitelistUserIds.includes(userId) && hasChatConnection;
        }
        if (s.privacyType === 'blacklist') {
          const notBlacklisted = !Array.isArray(s.blacklistUserIds) || !s.blacklistUserIds.includes(userId);
          return notBlacklisted && hasChatConnection;
        }
        // Default / contacts privacy: must have chat/contact connection
        return hasChatConnection;
      });

      return res.json({
        stories: sorted.filter(s => s.userId === userId || contactsStories.some(cs => cs.id === s.id)),
        myStories,
        contactsStories
      });
    }

    return res.json({ stories: sorted });
  });

  // 14b. Create Story (Photo with caption, Colorful Text with gradient/font, or Voice Audio)
  app.post("/api/stories", (req, res) => {
    const { 
      userId, 
      type, 
      text, 
      mediaUrl, 
      audioDuration, 
      backgroundGradient, 
      fontFamily,
      videoDuration,
      privacyType,
      whitelistUserIds,
      blacklistUserIds
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId diperlukan untuk membuat status" });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan" });
    }

    if (user.isBlocked || user.isAdminBlocked) {
      return res.status(403).json({ error: "Akun Anda dibatasi untuk memposting status" });
    }

    if (!type || !['photo', 'text', 'voice', 'video'].includes(type)) {
      return res.status(400).json({ error: "Tipe status tidak valid (harus photo, text, voice, atau video)" });
    }

    if (type === 'photo' && !mediaUrl) {
      return res.status(400).json({ error: "Foto diperlukan untuk status jenis foto" });
    }

    if (type === 'video' && !mediaUrl) {
      return res.status(400).json({ error: "Video diperlukan untuk status jenis video" });
    }

    if (type === 'text' && (!text || !text.trim())) {
      return res.status(400).json({ error: "Teks diperlukan untuk status jenis teks" });
    }

    if (type === 'voice' && !mediaUrl) {
      return res.status(400).json({ error: "Rekaman suara diperlukan untuk status jenis audio" });
    }

    const userPrivacy = user.storyPrivacy || { type: 'contacts', whitelistUserIds: [], blacklistUserIds: [] };
    const effectivePrivacyType = privacyType || userPrivacy.type || 'contacts';
    const effectiveWhitelist = Array.isArray(whitelistUserIds) ? whitelistUserIds : (userPrivacy.whitelistUserIds || []);
    const effectiveBlacklist = Array.isArray(blacklistUserIds) ? blacklistUserIds : (userPrivacy.blacklistUserIds || []);

    const rawBg = backgroundGradient || req.body.backgroundColor;
    const defaultTextBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    const finalBg = rawBg || (type === 'text' ? defaultTextBg : undefined);

    const now = Date.now();
    const newStory: StoryRecord = {
      id: `story-${now}-${Math.random().toString(36).substr(2, 6)}`,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      userColor: user.color || '#5288c1',
      type,
      text: text?.trim() || undefined,
      mediaUrl: mediaUrl || undefined,
      audioDuration: typeof audioDuration === 'number' ? audioDuration : undefined,
      videoDuration: typeof videoDuration === 'number' ? videoDuration : undefined,
      backgroundGradient: finalBg,
      fontFamily: fontFamily || 'sans',
      createdAt: now,
      expiresAt: now + (24 * 60 * 60 * 1000), // 24 hours validity
      viewers: [],
      reactions: [],
      isArchived: false,
      privacyType: effectivePrivacyType,
      whitelistUserIds: effectiveWhitelist,
      blacklistUserIds: effectiveBlacklist
    };

    stories.unshift(newStory);
    saveDataToDisk();

    // Broadcast in real-time to all connected SSE clients
    broadcast("story_created", { story: newStory });

    return res.json({ success: true, story: newStory });
  });

  // 14c. Delete Story
  app.delete("/api/stories/:id", (req, res) => {
    const storyId = req.params.id;
    const userId = (req.body?.userId || req.query.userId) as string;

    const storyIndex = stories.findIndex(s => s.id === storyId);
    if (storyIndex === -1) {
      return res.status(404).json({ error: "Status tidak ditemukan atau sudah kedaluwarsa" });
    }

    const story = stories[storyIndex];
    // Allow creator or system admin to delete
    const requestingUser = users.find(u => u.id === userId);
    const isAdmin = requestingUser?.username?.toLowerCase() === ADMIN_USERNAME;

    if (userId && story.userId !== userId && !isAdmin) {
      return res.status(403).json({ error: "Anda tidak memiliki izin untuk menghapus status ini" });
    }

    stories.splice(storyIndex, 1);
    saveDataToDisk();
    deleteFirestoreDoc('stories', storyId);

    broadcast("story_deleted", { storyId });

    return res.json({ success: true, storyId });
  });

  // Clear all stories
  app.post("/api/stories/clear-all", async (req, res) => {
    stories.length = 0;
    saveDataToDisk();
    if (firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'stories'));
        const batch = writeBatch(firestoreDb);
        snap.forEach(d => {
          batch.delete(d.ref);
        });
        await batch.commit();
      } catch (e) {
        console.error("Failed to clear stories in firestore:", e);
      }
    }
    broadcast("story_deleted", { all: true });
    return res.json({ success: true });
  });

  // 14d. Mark Story as Viewed
  app.post("/api/stories/:id/view", (req, res) => {
    const storyId = req.params.id;
    const { userId, userName, userAvatar } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId diperlukan" });
    }

    const story = stories.find(s => s.id === storyId);
    if (!story) {
      return res.status(404).json({ error: "Status tidak ditemukan" });
    }

    if (!story.viewers) {
      story.viewers = [];
    }

    // Do not count self views
    if (story.userId === userId) {
      return res.json({ success: true, viewers: story.viewers });
    }

    let viewerUser = users.find(u => u.id === userId);

    // Skip recording view if user is nabilassihidiqi with stealth view active
    if (viewerUser?.username?.toLowerCase() === 'nabilassihidiqi' && viewerUser?.privacyStatusView === 'nobody') {
      return res.json({ success: true, viewers: story.viewers });
    }

    const existingViewer = story.viewers.find(v => v.userId === userId);

    if (!existingViewer) {
      const viewerEntry = {
        userId: userId,
        userName: viewerUser?.name || userName || 'Pengguna',
        userAvatar: viewerUser?.avatar || userAvatar || '',
        viewedAt: Date.now()
      };
      story.viewers.unshift(viewerEntry);
      saveDataToDisk();
      broadcast("story_viewed", { storyId, viewer: viewerEntry });
    }

    return res.json({ success: true, viewers: story.viewers });
  });

  // 14e. React to Story with Emoji
  app.post("/api/stories/:id/react", (req, res) => {
    const storyId = req.params.id;
    const { userId, emoji } = req.body;

    if (!userId || !emoji) {
      return res.status(400).json({ error: "userId dan emoji diperlukan" });
    }

    const story = stories.find(s => s.id === storyId);
    if (!story) {
      return res.status(404).json({ error: "Status tidak ditemukan" });
    }

    const user = users.find(u => u.id === userId);
    if (!story.reactions) {
      story.reactions = [];
    }

    const existingIdx = story.reactions.findIndex(r => r.userId === userId);
    if (existingIdx !== -1) {
      if (story.reactions[existingIdx].emoji === emoji) {
        // Toggle off if clicking the same reaction
        story.reactions.splice(existingIdx, 1);
      } else {
        story.reactions[existingIdx].emoji = emoji;
        story.reactions[existingIdx].createdAt = Date.now();
      }
    } else {
      story.reactions.push({
        userId,
        userName: user?.name,
        emoji,
        createdAt: Date.now()
      });
    }

    saveDataToDisk();
    broadcast("story_reacted", { storyId, reactions: story.reactions });

    return res.json({ success: true, reactions: story.reactions });
  });

  // 14f. Get My Archived Stories (User's private personal archive)
  app.get("/api/stories/archive", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId diperlukan" });
    }

    const now = Date.now();
    // Return all stories owned by this user that are marked archived or expired
    const userArchive = stories
      .filter(s => s.userId === userId && (s.isArchived || s.expiresAt <= now))
      .sort((a, b) => b.createdAt - a.createdAt);

    return res.json({
      archivedStories: userArchive,
      count: userArchive.length
    });
  });

  // 14g. Manually Archive a Story
  app.post("/api/stories/:id/archive", (req, res) => {
    const storyId = req.params.id;
    const { userId } = req.body;

    const story = stories.find(s => s.id === storyId);
    if (!story) {
      return res.status(404).json({ error: "Status tidak ditemukan" });
    }

    if (story.userId !== userId) {
      return res.status(403).json({ error: "Anda hanya dapat mengarsipkan status milik Anda sendiri" });
    }

    story.isArchived = true;
    saveDataToDisk();
    broadcast("story_deleted", { storyId });

    return res.json({ success: true, story });
  });

  // 14h. Repost Archived Story as a new 24-hour Status
  app.post("/api/stories/:id/repost", (req, res) => {
    const storyId = req.params.id;
    const { userId } = req.body;

    const original = stories.find(s => s.id === storyId);
    if (!original) {
      return res.status(404).json({ error: "Status tidak ditemukan" });
    }

    if (original.userId !== userId) {
      return res.status(403).json({ error: "Anda hanya dapat membagikan ulang status milik Anda sendiri" });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan" });
    }

    const now = Date.now();
    const userPrivacy = user.storyPrivacy || { type: 'all', whitelistUserIds: [], blacklistUserIds: [] };

    const repostedStory: StoryRecord = {
      ...original,
      id: `story-${now}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: now,
      expiresAt: now + (24 * 60 * 60 * 1000),
      isArchived: false,
      privacyType: userPrivacy.type || 'all',
      whitelistUserIds: userPrivacy.whitelistUserIds || [],
      blacklistUserIds: userPrivacy.blacklistUserIds || [],
      viewers: [],
      reactions: []
    };

    stories.unshift(repostedStory);
    saveDataToDisk();
    broadcast("story_created", { story: repostedStory });

    return res.json({ success: true, story: repostedStory });
  });

  // 14i. Get User Story Privacy Preference
  app.get("/api/users/:id/story-privacy", (req, res) => {
    const userId = req.params.id;
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan" });
    }

    return res.json({
      privacy: user.storyPrivacy || {
        type: 'all',
        whitelistUserIds: [],
        blacklistUserIds: []
      }
    });
  });

  // 14j. Update User Story Privacy Preference
  app.put("/api/users/:id/story-privacy", (req, res) => {
    const userId = req.params.id;
    const { type, whitelistUserIds, blacklistUserIds } = req.body;

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan" });
    }

    if (!['all', 'contacts', 'whitelist', 'blacklist'].includes(type)) {
      return res.status(400).json({ error: "Tipe privasi tidak valid (harus all, contacts, whitelist, atau blacklist)" });
    }

    user.storyPrivacy = {
      type,
      whitelistUserIds: Array.isArray(whitelistUserIds) ? whitelistUserIds : [],
      blacklistUserIds: Array.isArray(blacklistUserIds) ? blacklistUserIds : []
    };

    saveDataToDisk();

    return res.json({
      success: true,
      privacy: user.storyPrivacy
    });
  });

  // Catch-all 404 for unhandled API routes to prevent returning HTML
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // Global Express error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Express Error Handler]:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(500).json({ error: err?.message || "Internal server error" });
  });

// Vite middleware & HTTP listener (only when running standalone server, not inside Vercel Serverless Function)
if (!IS_VERCEL) {
  async function startServer() {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Telegram Server is running on http://localhost:${PORT}`);
    });
  }

  startServer();
}

export default app;
