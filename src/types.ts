export interface PrivacyExceptionGroup {
  always?: string[];
  never?: string[];
}

export interface CallLog {
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
  duration: number; // in seconds
  timestamp: number; // epoch ms
}

export interface User {
  id: string;
  username: string;
  name: string;
  phone: string;
  avatar?: string;
  color?: string; // Telegram avatar fallback color
  bio?: string;
  statusEmoji?: string;
  isOnline?: boolean;
  lastSeen?: string;
  isVerified?: boolean;
  badgeColor?: 'blue' | 'black' | 'green' | null;
  customBadge?: string;
  verifiedUntil?: number | null;
  isBot?: boolean;
  unreadTotal?: number;
  isBlocked?: boolean;
  isAdminBlocked?: boolean;
  blockReason?: string;
  blockExpiresAt?: number | null;
  isBlockedBy?: boolean;
  privacyLastSeen?: 'everybody' | 'contacts' | 'nobody';
  privacyPhone?: 'everybody' | 'contacts' | 'nobody';
  privacyUsername?: 'everybody' | 'contacts' | 'nobody';
  privacyProfilePhoto?: 'everybody' | 'contacts' | 'nobody';
  privacyForwards?: 'everybody' | 'contacts' | 'nobody';
  privacyCalls?: 'everybody' | 'contacts' | 'nobody';
  privacyVoiceMessages?: 'everybody' | 'contacts' | 'nobody';
  privacyMessaging?: 'everybody' | 'contacts' | 'nobody';
  privacyBirthday?: 'everybody' | 'contacts' | 'nobody';
  privacyGifts?: 'everybody' | 'contacts' | 'nobody';
  privacyBio?: 'everybody' | 'contacts' | 'nobody';
  privacySavedMusic?: 'everybody' | 'contacts' | 'nobody';
  privacyInvites?: 'everybody' | 'contacts' | 'nobody';
  privacyExceptions?: Record<string, PrivacyExceptionGroup>;
  privacyStatusView?: 'everybody' | 'contacts' | 'nobody';
  storyPrivacy?: StoryPrivacySetting;
  hideReadTime?: boolean;
  
  twoStepVerification?: boolean;
  autoDeleteMessagesTimer?: number; // 0 = mati, in seconds/days
  passcodeLock?: boolean;
  passcodePin?: string;
  passkeyEnabled?: boolean;
  loginEmail?: string;
  blockedUsers?: string[];
  activeDevicesCount?: number;
  
  archiveAndMuteUnknown?: boolean;
  accountAutoDeleteMonths?: number;
  
  syncContacts?: boolean;
  suggestFrequentContacts?: boolean;
  
  mapProvider?: 'none' | 'google' | 'telegram';
  secretChatLinkPreviews?: boolean;
  
  batterySaver?: boolean;
  // Power Saving Settings
  powerSavingModePercent?: number; // 0 = Mati, 100 = Selalu Nyala
  animStickerKeyboard?: boolean;
  animStickerChat?: boolean;
  animEmojiKeyboard?: boolean;
  animEmojiReactions?: boolean;
  animEmojiChat?: boolean;
  effectChatRotation?: boolean;
  effectChatTopic?: boolean;
  effectChatSpoiler?: boolean;
  effectChatBlur?: boolean;
  effectChatLiquid?: boolean;
  effectChatZoom?: boolean;
  effectChatDust?: boolean;
  animCalls?: boolean;
  autoPlayVideo?: boolean;
  autoPlayGIF?: boolean;
  effectParticles?: boolean;
  smoothTransitions?: boolean;

  uploadMediaQuality?: 'standard' | 'hd';
  autoDownloadQuality?: 'auto' | 'standard' | 'hd';
  autoDownloadMedia?: boolean;
  autoDownloadCellular?: boolean;
  autoDownloadWiFi?: boolean;
  autoDownloadRoaming?: boolean;
  saveToGalleryPrivate?: boolean;
  saveToGalleryGroups?: boolean;
  saveToGalleryChannels?: boolean;
  streamMedia?: boolean;
  lessDataForCalls?: 'Matikan' | 'Hanya saat roaming' | 'Hanya dengan data seluler' | 'Selalu';
  useProxy?: boolean;
  useProxyForCalls?: boolean;
  keepMediaPrivate?: '1 hari' | '1 minggu' | '1 bulan' | 'Tidak pernah';
  keepMediaGroups?: '1 hari' | '1 minggu' | '1 bulan' | 'Tidak pernah';
  keepMediaChannels?: '1 hari' | '1 minggu' | '1 bulan' | 'Tidak pernah';
  keepMediaStories?: '1 hari' | '1 minggu' | '1 bulan' | 'Tidak pernah';


  uiAnimations?: boolean;
  // Notification Settings
  notifAllAccounts?: boolean;
  notifPrivateChats?: boolean;
  notifGroups?: boolean;
  notifChannels?: boolean;
  notifStories?: boolean;
  notifReactions?: boolean;
  callsVibrate?: string;
  callsRingtone?: string;
  badgeShow?: boolean;
  badgeIncludeMuted?: boolean;
  badgeCountUnread?: boolean;
  inAppSounds?: boolean;
  inAppVibrate?: boolean;
  inAppPreview?: boolean;
  inChatSounds?: boolean;
  inAppPopup?: boolean;
  eventContactJoined?: boolean;
  eventPinnedMessage?: boolean;
  otherKeepAlive?: boolean;
  otherBackgroundConn?: boolean;
  notifRepeat?: string;

}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[]; // userIds
}

export interface Attachment {
  type: 'image' | 'video' | 'voice' | 'file' | 'audio';
  url: string;
  name?: string;
  size?: string;
  duration?: number; // for voice/video in seconds
  isHD?: boolean;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderColor?: string;
  text: string;
  timestamp: string; // e.g. "23:49" or ISO
  createdAt: number; // unix timestamp
  isRead: boolean;
  isSending?: boolean;
  isCancelled?: boolean;
  uploadProgress?: number;
  isPinned?: boolean;
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
  attachments?: Attachment[];
  reactions?: Reaction[];
  isForwarded?: boolean;
  forwardSender?: string;
  isEdited?: boolean;
  editedAt?: number;
  deletedForUserIds?: string[];
  callInfo?: {
    type: 'audio' | 'video';
    status: 'completed' | 'missed' | 'declined' | 'cancelled';
    duration: number; // in seconds
  };
}

export interface Chat {
  id: string;
  type: 'direct' | 'group' | 'channel' | 'saved' | 'bot';
  name: string;
  username?: string;
  avatar?: string;
  color?: string;
  bio?: string;
  description?: string;
  phone?: string;
  isOnline?: boolean;
  lastSeen?: string;
  isPinned?: boolean;
  isMuted?: boolean;
  isVerified?: boolean;
  badgeColor?: 'blue' | 'black' | 'green' | null;
  verifiedUntil?: number | null;
  isArchived?: boolean;
  isSavedMessages?: boolean;
  unreadCount: number;
  isBlocked?: boolean;
  isBlockedBy?: boolean;
  participants: string[]; // userIds
  ownerId?: string;
  adminIds?: string[];
  membersCount?: number;
  folder: 'all' | 'viral' | 'vip' | 'personal' | 'groups' | 'bots';
  messages?: Message[];
  
  // Group specific configuration
  groupType?: 'private' | 'public';
  publicUsername?: string;
  inviteLink?: string;
  customLinks?: Array<{
    id: string;
    link: string;
    name?: string;
    requiresApproval?: boolean;
    timeLimit?: string;
    usageLimit?: string;
    createdAt: number;
    usesCount?: number;
  }>;
  chatHistoryVisibility?: 'visible' | 'hidden';
  topicsEnabled?: boolean;
  topicsLayout?: 'tabs' | 'list';
  reactionsMode?: 'all' | 'some' | 'none';
  allowedReactions?: string[];
  permissions?: {
    sendText?: boolean;
    sendMedia?: {
      photos?: boolean;
      videos?: boolean;
      stickersGifs?: boolean;
      music?: boolean;
      files?: boolean;
      voiceNotes?: boolean;
      videoNotes?: boolean;
      embeddedLinks?: boolean;
      polls?: boolean;
    };
    addMembers?: boolean;
    pinMessages?: boolean;
    changeChatInfo?: boolean;
    starsPerMessage?: {
      enabled?: boolean;
      stars?: number;
    };
    slowMode?: number; // 0 = off, seconds
    unrestrictBoosters?: boolean;
    boosterMinLevel?: number;
    blockedMembers?: string[];
  };
  appearance?: {
    color?: string;
    logoLevel?: number;
    emojiPack?: string;
    statusEmoji?: string;
    backgroundWallpaper?: string;
    boostLevel?: number;
    totalBoosts?: number;
  };
  antiSpamAggressive?: boolean;
  hideMembers?: boolean;
  approveNewMembers?: boolean;
  restrictContentSaving?: boolean;
  autoDeleteTimer?: number; // in seconds/days

  lastMessage?: {
    text: string;
    senderName?: string;
    timestamp: string;
    createdAt: number;
    isRead: boolean;
    isOutgoing?: boolean;
    hasVoice?: boolean;
    hasImage?: boolean;
    hasVideo?: boolean;
  };
  customBadge?: string;
  badgeType?: 'blue' | 'grey' | 'white';
}

export interface StoryViewer {
  userId: string;
  userName: string;
  userAvatar?: string;
  viewedAt: number;
}

export interface StoryReaction {
  userId: string;
  userName?: string;
  emoji: string;
  createdAt: number;
}

export type StoryPrivacyType = 'all' | 'contacts' | 'whitelist' | 'blacklist';

export interface StoryPrivacySetting {
  type: StoryPrivacyType;
  whitelistUserIds: string[];
  blacklistUserIds: string[];
}

export interface Story {
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
  fontFamily?: 'sans' | 'serif' | 'mono' | 'cursive';
  createdAt: number;
  expiresAt: number;
  viewers: StoryViewer[];
  reactions?: StoryReaction[];
  isArchived?: boolean;
  privacyType?: StoryPrivacyType;
  whitelistUserIds?: string[];
  blacklistUserIds?: string[];
  isVerified?: boolean;
  badgeColor?: 'blue' | 'black' | 'green' | null;
}
