import React from 'react';

interface VerifiedBadgeProps {
  isVerified?: boolean;
  badgeColor?: 'blue' | 'black' | 'green' | string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  isVerified,
  badgeColor = 'blue',
  size = 'sm',
  className = '',
}) => {
  if (!isVerified) return null;

  const color = badgeColor || 'blue';
  let bgClass = 'bg-[#0095f6] text-white'; // default Instagram/WhatsApp blue
  if (color === 'black') {
    bgClass = 'bg-[#0f1419] text-white border border-slate-700';
  } else if (color === 'green') {
    bgClass = 'bg-[#25d366] text-white';
  }

  const dimensions = 
    size === 'lg' ? 'w-[18px] h-[18px] text-[10px]' : 
    size === 'md' ? 'w-[15px] h-[15px] text-[8px]' : 
    'w-[13px] h-[13px] text-[7px]';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold select-none shrink-0 ${dimensions} ${bgClass} ${className}`}
      title="Akun Terverifikasi"
      style={{
        lineHeight: 1,
        verticalAlign: 'middle',
      }}
    >
      ✓
    </span>
  );
};
