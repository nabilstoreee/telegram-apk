import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface AppSettings {
  textSize: number;
  messageCorners: number;
  sendWithEnter: boolean;
  darkMode: boolean;
  chatListLayout: 'dua' | 'tiga';
  theme: string;
  chatBackground: string;
  uploadMediaQuality: 'standard' | 'hd';
  autoDownloadQuality: 'auto' | 'standard' | 'hd';
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
}

const defaultSettings: AppSettings = {
  textSize: 16,
  messageCorners: 17,
  sendWithEnter: true,
  darkMode: true,
  chatListLayout: 'dua',
  theme: 'default',
  chatBackground: 'https://web.telegram.org/a/chat-bg-pattern-light.png',
  uploadMediaQuality: 'hd',
  autoDownloadQuality: 'hd',
};

const THEMES: Record<string, Record<string, string>> = {
  default: {},
  vintage: {
    'bg-[#0e1621]': '#f5efe6',
    'bg-[#17212b]': '#eadecf',
    'bg-[#242f3d]': '#d8c8b4',
    'bg-[#2b3543]': '#cbbfae',
    'bg-[#5288c1]': '#a67c52',
    'text-[#5288c1]': '#a67c52',
    'border-[#5288c1]': '#a67c52',
    'ring-[#5288c1]': '#a67c52',
    'bg-[#4374a8]': '#8b643d',
    'bg-[#2b5278]': '#a67c52',
    'bg-[#182533]': '#eadecf',
    'text-[#7f91a4]': '#807261',
    'text-white': '#1c1c1c',
    'text-slate-100': '#222222',
    'text-slate-200': '#333333',
    'text-slate-300': '#444444',
  },
  aqua: {
    'bg-[#0e1621]': '#0f2027', 
    'bg-[#17212b]': '#203a43', 
    'bg-[#242f3d]': '#2c5364', 
    'bg-[#2b3543]': '#376b82', 
    'bg-[#5288c1]': '#2980b9', 
    'text-[#5288c1]': '#2980b9',
    'border-[#5288c1]': '#2980b9',
    'ring-[#5288c1]': '#2980b9',
    'bg-[#4374a8]': '#2471a3', 
    'bg-[#2b5278]': '#2980b9', 
    'bg-[#182533]': '#203a43', 
    'text-[#7f91a4]': '#859dab',
  },
  premium: {
    'bg-[#0e1621]': '#1a1a2e', 
    'bg-[#17212b]': '#16213e', 
    'bg-[#242f3d]': '#0f3460', 
    'bg-[#2b3543]': '#154178', 
    'bg-[#5288c1]': '#e94560', 
    'text-[#5288c1]': '#e94560',
    'border-[#5288c1]': '#e94560',
    'ring-[#5288c1]': '#e94560',
    'bg-[#4374a8]': '#c8344e', 
    'bg-[#2b5278]': '#e94560', 
    'bg-[#182533]': '#16213e', 
    'text-[#7f91a4]': '#82829b',
  },
  turbo: {
    'bg-[#0e1621]': '#000000', 
    'bg-[#17212b]': '#111111', 
    'bg-[#242f3d]': '#222222', 
    'bg-[#2b3543]': '#333333', 
    'bg-[#5288c1]': '#ff0000', 
    'text-[#5288c1]': '#ff0000',
    'border-[#5288c1]': '#ff0000',
    'ring-[#5288c1]': '#ff0000',
    'bg-[#4374a8]': '#cc0000', 
    'bg-[#2b5278]': '#ff0000', 
    'bg-[#182533]': '#111111', 
    'text-[#7f91a4]': '#777777',
  },
  nox: {
    'bg-[#0e1621]': '#121212', 
    'bg-[#17212b]': '#1e1e1e', 
    'bg-[#242f3d]': '#2c2c2c', 
    'bg-[#2b3543]': '#3d3d3d', 
    'bg-[#5288c1]': '#bb86fc', 
    'text-[#5288c1]': '#bb86fc',
    'border-[#5288c1]': '#bb86fc',
    'ring-[#5288c1]': '#bb86fc',
    'bg-[#4374a8]': '#9965db', 
    'bg-[#2b5278]': '#bb86fc', 
    'bg-[#182533]': '#1e1e1e', 
    'text-[#7f91a4]': '#888888',
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('tg_app_settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('tg_app_settings', JSON.stringify(settings));
    
    // Apply dynamic theme CSS
    let styleEl = document.getElementById('tg-dynamic-theme');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'tg-dynamic-theme';
      document.head.appendChild(styleEl);
    }

    const themeColors = THEMES[settings.theme] || {};
    let cssString = '';
    
    if (Object.keys(themeColors).length > 0) {
      cssString += 'body { background-color: ' + (themeColors['bg-[#0e1621]'] || '#0e1621') + ' !important; }\n';
      
      for (const [cls, color] of Object.entries(themeColors)) {
        if (cls.startsWith('bg-')) {
          const escapedCls = cls.replace('[', '\\[').replace(']', '\\]').replace('#', '\\#');
          cssString += `.${escapedCls} { background-color: ${color} !important; }\n`;
        } else if (cls.startsWith('text-')) {
          const escapedCls = cls.replace('[', '\\[').replace(']', '\\]').replace('#', '\\#');
          cssString += `.${escapedCls} { color: ${color} !important; }\n`;
        } else if (cls.startsWith('border-')) {
          const escapedCls = cls.replace('[', '\\[').replace(']', '\\]').replace('#', '\\#');
          cssString += `.${escapedCls} { border-color: ${color} !important; }\n`;
        } else if (cls.startsWith('ring-')) {
          const escapedCls = cls.replace('[', '\\[').replace(']', '\\]').replace('#', '\\#');
          cssString += `.${escapedCls} { --tw-ring-color: ${color} !important; }\n`;
        }
      }
    }
    
    styleEl.innerHTML = cssString;

  }, [settings]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
