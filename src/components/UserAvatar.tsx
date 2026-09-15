import React from 'react';

interface AvatarProps {
  name?: string;
  username?: string;
  avatar?: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  isOnline?: boolean;
  statusEmoji?: string;
}

// Function to extract initials (e.g. "Nabil" -> "N", "nabil" -> "N", "@nabil" -> "N")
export const getAvatarLetter = (name?: string, username?: string): string => {
  const str = (name && name.trim()) || (username && username.trim()) || '';
  if (!str) return '?';
  const clean = str.replace(/^[^a-zA-Z0-9]+/, '').trim();
  if (!clean) return str.charAt(0).toUpperCase();
  return clean.charAt(0).toUpperCase();
};

export const UserAvatar: React.FC<AvatarProps> = ({
  name = '',
  username = '',
  avatar,
  color = '#3390ec',
  size = 'md',
  className = '',
  isOnline,
  statusEmoji,
}) => {
  const sizeClasses: Record<string, { container: string; text: string; dot: string }> = {
    xs: { container: 'w-7 h-7', text: 'text-[11px]', dot: 'w-2.5 h-2.5' },
    sm: { container: 'w-8 h-8', text: 'text-xs', dot: 'w-2.5 h-2.5' },
    md: { container: 'w-10 h-10', text: 'text-sm font-semibold', dot: 'w-3 h-3' },
    lg: { container: 'w-12 h-12', text: 'text-base font-semibold', dot: 'w-3.5 h-3.5' },
    xl: { container: 'w-14 h-14', text: 'text-lg font-bold', dot: 'w-4 h-4' },
    '2xl': { container: 'w-16 h-16', text: 'text-xl font-bold', dot: 'w-4 h-4' },
    '3xl': { container: 'w-24 h-24', text: 'text-3xl font-bold', dot: 'w-5 h-5' },
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;
  const letter = getAvatarLetter(name, username);

  return (
    <div className={`relative shrink-0 rounded-full select-none ${currentSize.container} ${className}`}>
      {avatar && avatar.trim() !== '' ? (
        <img
          src={avatar}
          alt={name || username || 'User'}
          className="w-full h-full rounded-full object-cover shadow-sm"
        />
      ) : (
        <div
          className={`w-full h-full rounded-full flex items-center justify-center font-bold text-white shadow-sm transition-all ${currentSize.text}`}
          style={{ backgroundColor: color || '#3390ec' }}
        >
          {letter}
        </div>
      )}

      {isOnline && (
        <span
          className={`absolute bottom-0.5 right-0.5 rounded-full bg-[#4fae4e] ring-2 ring-[#17181c] shadow-md ${currentSize.dot}`}
        />
      )}

      {statusEmoji && (
        <span className="absolute -bottom-1 -right-1 text-xs bg-[#242f3d] rounded-full px-1 shadow border border-[#313d4f]">
          {statusEmoji}
        </span>
      )}
    </div>
  );
};

