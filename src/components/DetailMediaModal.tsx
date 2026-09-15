import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface DetailMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHD: boolean;
  onSelectQuality: (isHD: boolean) => void;
  standardSize?: string;
  standardRes?: string;
  hdSize?: string;
  hdRes?: string;
}

export const DetailMediaModal: React.FC<DetailMediaModalProps> = ({
  isOpen,
  onClose,
  isHD,
  onSelectQuality,
  standardSize = '2,9 MB',
  standardRes = '478 × 850',
  hdSize = '5,4 MB',
  hdRes = '720 × 1280',
}) => {
  const [downloadProgress, setDownloadProgress] = useState(100);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isOpen && isHD) {
      // Simulate HD downloading progress animation as shown in video
      setDownloadProgress(10);
      setIsDownloading(true);
      const interval = setInterval(() => {
        setDownloadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsDownloading(false);
            return 100;
          }
          return prev + 15;
        });
      }, 150);
      return () => clearInterval(interval);
    } else {
      setDownloadProgress(100);
      setIsDownloading(false);
    }
  }, [isOpen, isHD]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#17212b] rounded-t-3xl border-t border-[#2b394a] p-5 shadow-2xl animate-in slide-in-from-bottom duration-250 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-2 border-b border-[#242f3d]">
          <h3 className="text-base font-bold text-white tracking-wide">Detail media</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#202b36] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Option List */}
        <div className="space-y-3 py-2">
          {/* Option 1: Kualitas Standar */}
          <div
            onClick={() => {
              onSelectQuality(false);
            }}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              !isHD 
                ? 'bg-[#202b36] border-[#5288c1] shadow-md' 
                : 'bg-[#1e2a38]/60 border-[#2b394a]/80 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                !isHD ? 'border-[#5288c1] bg-[#5288c1]' : 'border-slate-500'
              }`}>
                {!isHD && <Check className="w-3.0 h-3.0 text-white stroke-[3]" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Kualitas standar</div>
                <div className="text-xs text-[#7f91a4] mt-0.5">{standardSize} · {standardRes}</div>
              </div>
            </div>
          </div>

          {/* Option 2: Kualitas HD */}
          <div
            onClick={() => {
              onSelectQuality(true);
            }}
            className={`flex flex-col p-3.5 rounded-2xl border transition-all cursor-pointer ${
              isHD 
                ? 'bg-[#202b36] border-[#22c55e] shadow-md' 
                : 'bg-[#1e2a38]/60 border-[#2b394a]/80 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isHD ? 'border-[#22c55e] bg-[#22c55e]' : 'border-slate-500'
                }`}>
                  {isHD && <Check className="w-3.0 h-3.0 text-black stroke-[3]" />}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Kualitas HD</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30">
                      HD
                    </span>
                  </div>
                  <div className="text-xs text-[#7f91a4] mt-0.5">{hdSize} · {hdRes}</div>
                </div>
              </div>
            </div>

            {/* Progress Bar when HD is active & downloading */}
            {isHD && (
              <div className="mt-3 pt-2 border-t border-[#2b394a]/50">
                <div className="w-full h-1.5 bg-[#17212b] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#22c55e] transition-all duration-300 rounded-full"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-[#7f91a4] mt-1.5">
                  <span className="font-sans">
                    {isDownloading 
                      ? `${downloadProgress}% (tersisa ${Math.max(1, Math.round((100 - downloadProgress) / 6))}d)` 
                      : 'Terpilih'
                    }
                  </span>
                  {!isDownloading && <span className="text-[#22c55e] font-sans font-medium">100%</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-4 pt-3 border-t border-[#242f3d] text-center">
          <p className="text-xs text-[#7f91a4]">
            Pilih kualitas media default di <span className="text-[#5288c1] font-semibold cursor-pointer hover:underline">Pengaturan</span>.
          </p>
        </div>
      </div>
    </div>
  );
};
