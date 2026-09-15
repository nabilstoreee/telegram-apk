// Utilities for accurate local device real-time formatting (WIB/local phone timezone)

export const getDeviceTime = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatMessageTime = (createdAt?: number, fallbackTimestamp?: string): string => {
  if (createdAt && typeof createdAt === 'number' && !isNaN(createdAt)) {
    const date = new Date(createdAt);
    if (!isNaN(date.getTime())) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  }
  
  if (fallbackTimestamp && fallbackTimestamp.trim() !== '') {
    return fallbackTimestamp;
  }
  
  return getDeviceTime();
};

export const formatChatListTime = (createdAt?: number, fallbackTimestamp?: string): string => {
  if (createdAt && typeof createdAt === 'number' && !isNaN(createdAt)) {
    const date = new Date(createdAt);
    if (!isNaN(date.getTime())) {
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      if (isToday) {
        return `${hours}:${minutes}`;
      }
      if (isYesterday) {
        return 'Kemarin';
      }
      
      const day = date.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${day} ${months[date.getMonth()]}`;
    }
  }

  if (fallbackTimestamp && fallbackTimestamp.trim() !== '') {
    return fallbackTimestamp;
  }

  return getDeviceTime();
};
