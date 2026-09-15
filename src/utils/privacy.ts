import { User, PrivacyExceptionGroup } from '../types';

export function isPrivacyAllowed(
  setting: 'everybody' | 'contacts' | 'nobody' | undefined,
  exceptionGroup: PrivacyExceptionGroup | undefined,
  targetUserId?: string,
  viewerUserId?: string
): boolean {
  if (!viewerUserId || !targetUserId || viewerUserId === targetUserId) {
    return true; // Always allow viewing own profile or if unauthenticated
  }

  // 1. Blacklist ("Jangan Bagikan Dengan") takes highest priority
  if (exceptionGroup?.never && exceptionGroup.never.includes(viewerUserId)) {
    return false;
  }

  // 2. Whitelist ("Selalu Berbagi Dengan") overrides base restrictive setting
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

export function getMaskedContact<T extends {
  id?: string;
  name: string;
  username?: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  color?: string;
  isOnline?: boolean;
  lastSeen?: string;
  isBlocked?: boolean;
  isAdminBlocked?: boolean;
  isBlockedBy?: boolean;
  blockedUsers?: string[];
  privacyLastSeen?: 'everybody' | 'contacts' | 'nobody';
  privacyPhone?: 'everybody' | 'contacts' | 'nobody';
  privacyUsername?: 'everybody' | 'contacts' | 'nobody';
  privacyProfilePhoto?: 'everybody' | 'contacts' | 'nobody';
  privacyBio?: 'everybody' | 'contacts' | 'nobody';
  privacyCalls?: 'everybody' | 'contacts' | 'nobody';
  privacyVoiceMessages?: 'everybody' | 'contacts' | 'nobody';
  privacyMessaging?: 'everybody' | 'contacts' | 'nobody';
  privacyForwards?: 'everybody' | 'contacts' | 'nobody';
  privacyBirthday?: 'everybody' | 'contacts' | 'nobody';
  privacyGifts?: 'everybody' | 'contacts' | 'nobody';
  privacySavedMusic?: 'everybody' | 'contacts' | 'nobody';
  privacyInvites?: 'everybody' | 'contacts' | 'nobody';
  privacyExceptions?: Record<string, PrivacyExceptionGroup>;
  hideReadTime?: boolean;
  isVerified?: boolean;
  badgeColor?: 'blue' | 'black' | 'green' | null;
}>(target: T, currentUserId?: string): T {
  if (!currentUserId || target.id === currentUserId) {
    return target;
  }

  if (target.isAdminBlocked || (target as any).isBlocked || target.name === 'Akun Tidak Ditemukan') {
    return {
      ...target,
      name: 'Akun Tidak Ditemukan',
      username: '',
      phone: 'Disembunyikan',
      bio: 'Akun tidak ditemukan atau telah ditangguhkan.',
      avatar: '',
      isOnline: false,
      lastSeen: 'terakhir dilihat lama sekali',
      isAdminBlocked: true,
      isBlocked: true,
    };
  }

  const result = { ...target };
  const exceptions = target.privacyExceptions || {};

  // Check if current user is blocked by target user
  const isBlockedBy = Boolean(
    target.isBlockedBy ||
    (target.blockedUsers && target.blockedUsers.includes(currentUserId))
  );

  if (isBlockedBy) {
    result.isBlockedBy = true;
    result.username = '';
    result.phone = 'Disembunyikan';
    result.bio = undefined;
    result.avatar = '';
    result.isOnline = false;
    result.lastSeen = 'terakhir dilihat lama sekali';
    result.privacyCalls = 'nobody';
    result.privacyVoiceMessages = 'nobody';
    return result;
  }

  const getExceptionsFor = (key1: string, key2: string) => {
    return exceptions[key1] || exceptions[key2];
  };

  // 1. Profile Photo
  if (!isPrivacyAllowed(result.privacyProfilePhoto, getExceptionsFor('privacyProfilePhoto', 'privacy_profile_photo'), target.id, currentUserId)) {
    result.avatar = '';
  }

  // 2. Phone Number
  if (!isPrivacyAllowed(result.privacyPhone, getExceptionsFor('privacyPhone', 'privacy_phone'), target.id, currentUserId)) {
    result.phone = 'Disembunyikan';
  }

  // 2.5 Username
  if (!isPrivacyAllowed(result.privacyUsername, getExceptionsFor('privacyUsername', 'privacy_username'), target.id, currentUserId)) {
    result.username = '';
  }

  // 3. Last Seen & Online
  if (!isPrivacyAllowed(result.privacyLastSeen, getExceptionsFor('privacyLastSeen', 'privacy_last_seen'), target.id, currentUserId)) {
    result.isOnline = false;
    result.lastSeen = 'terakhir dilihat lama sekali';
  }

  // 4. Bio Privacy
  if (!isPrivacyAllowed(result.privacyBio, getExceptionsFor('privacyBio', 'privacy_bio'), target.id, currentUserId)) {
    result.bio = undefined;
  }

  // 5. Calls Privacy
  if (!isPrivacyAllowed(result.privacyCalls, getExceptionsFor('privacyCalls', 'privacy_calls'), target.id, currentUserId)) {
    result.privacyCalls = 'nobody';
  }

  // 6. Voice Messages Privacy
  if (!isPrivacyAllowed(result.privacyVoiceMessages, getExceptionsFor('privacyVoiceMessages', 'privacy_voice_messages'), target.id, currentUserId)) {
    result.privacyVoiceMessages = 'nobody';
  }

  return result;
}


